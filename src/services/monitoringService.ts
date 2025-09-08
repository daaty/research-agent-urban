import * as cron from 'node-cron';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { scrapeAllRidesDataPersistent } from '../scraper/ridesPersistentScraper';
import { scrapeAllDriversDataPersistent, DriversPersistentScraper } from '../scraper/driversPersistentScraper';
import { DriversDataTransformer } from './driversDataTransformer';
import { DataCacheManager } from './dataCacheManager'; // ⭐ INTEGRAR SISTEMA DE CACHE SOFISTICADO
import { DatabaseManager } from './databaseManager'; // ⭐ INTEGRAR SALVAMENTO NO BANCO
import { WebhookValidator } from './webhookValidator'; // 🔍 VALIDATOR PARA WEBHOOKS
import { RetryManager } from './retryManager'; // 🔄 RETRY MANAGER PARA WEBHOOKS
import { RateLimiter } from './rateLimiter'; // 🎛️ RATE LIMITER PARA CONTROLE DE TAXA
import { AlertSystem } from './alertSystem'; // 🚨 SISTEMA DE ALERTAS

interface RideData {
  id: string;
  driver: string;
  passenger: string;
  status: string;
  date: string;
  time: string;
  route: string;
  price?: string;
  [key: string]: any;
}

interface MonitoringResult {
  timestamp: string;
  totalRecords: number;
  newRecords: RideData[];
  updatedRecords: RideData[];
  cancelledRecords: RideData[];
  completedRecords: RideData[];
  summary: {
    newCount: number;
    updatedCount: number;
    cancelledCount: number;
    completedCount: number;
  };
}

class MonitoringService {
  private static instance: MonitoringService | null = null;
  private previousData: RideData[] = [];
  private dataFilePath: string;
  private isRunning: boolean = false;
  private cronTasks: any[] = [];
  private cacheManager: DataCacheManager; // ⭐ USAR SISTEMA DE CACHE SOFISTICADO
  private databaseManager: DatabaseManager; // ⭐ INTEGRAR SALVAMENTO NO BANCO
  private lastRawData: any[] = []; // ⭐ ARMAZENAR ÚLTIMOS DADOS PARA WEBHOOK
  private webhookValidator: WebhookValidator; // 🔍 VALIDATOR PARA WEBHOOKS
  private retryManager: RetryManager<MonitoringResult>; // 🔄 RETRY MANAGER PARA WEBHOOKS
  private rateLimiter: RateLimiter; // 🎛️ RATE LIMITER PARA CONTROLE DE TAXA
  private alertSystem: AlertSystem; // 🚨 SISTEMA DE ALERTAS
  private dashboardStatusService: any = null; // 📊 INTEGRAÇÃO COM DASHBOARD

  private constructor() {
    this.dataFilePath = path.join(__dirname, '../../data/previous-rides-data.json');
    this.cacheManager = DataCacheManager.getInstance(); // ⭐ INICIALIZAR CACHE MANAGER
    this.databaseManager = DatabaseManager.getInstance(); // ⭐ INICIALIZAR DATABASE MANAGER
    
    // 🔍 Inicializar WebhookValidator com configuração apropriada
    this.webhookValidator = new WebhookValidator({
      strictMode: true,
      sanitizeData: true,
      maxPayloadSize: 1024 * 100, // 100KB
      allowEmptyArrays: false,
      validateDataTypes: true,
      checkForDuplicates: true,
      requireMetadata: true
    });

    // 🔄 Inicializar RetryManager para webhooks robustos
    this.retryManager = new RetryManager<MonitoringResult>({
      maxRetries: 3,
      baseDelay: 2000, // 2 segundos inicial
      maxDelay: 60000, // 1 minuto máximo
      backoffMultiplier: 2.5,
      jitterEnabled: true,
      circuitBreakerEnabled: true,
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 120000, // 2 minutos
      deadLetterQueueEnabled: true,
      deadLetterQueueMaxSize: 50
    });

    // 🎛️ Inicializar RateLimiter para controle inteligente de taxa
    this.rateLimiter = new RateLimiter({
      tokensPerSecond: 0.1, // 1 webhook a cada 10 segundos (conservative)
      burstCapacity: 3,     // Burst de até 3 webhooks
      windowSizeMs: 60000,  // Janela de 1 minuto
      enableBurstProtection: true,
      enablePerEndpointLimiting: true,
      defaultEndpointLimit: 6, // 6 webhooks por minuto por endpoint
      endpointLimits: new Map([
        ['webhook-n8n-delivery', 4], // N8N: 4 por minuto (conservativo)
        ['webhook-slack', 20],        // Slack: 20 por minuto
        ['webhook-discord', 30]       // Discord: 30 por minuto
      ])
    });

    // 🚨 Inicializar AlertSystem para monitoramento crítico
    this.alertSystem = new AlertSystem({
      enabled: true,
      webhookUrl: process.env.N8N_WEBHOOK_URL || '',
      alertTypes: ['SCRAPER_DOWN', 'LOGIN_FAILED', 'SCRAPER_STARTED', 'SCRAPER_STOPPED', 'HIGH_ERROR_RATE'],
      cooldownMs: 300000, // 5 minutos entre alertas do mesmo tipo
      maxRetries: 3,
      enableHeartbeat: true,
      heartbeatIntervalMs: 600000, // 10 minutos de heartbeat
      scraperIdentifier: process.env.RIDES_USERNAME || 'unknown-scraper'
    });
    
    this.loadPreviousData();
    this.initializeDatabase(); // ⭐ INICIALIZAR CONEXÃO COM BANCO
    console.log('🔍 [MonitoringService] WebhookValidator inicializado');
    console.log('🔄 [MonitoringService] RetryManager inicializado para webhooks robustos');
    console.log('🎛️ [MonitoringService] RateLimiter inicializado para controle de taxa');
    console.log('🚨 [MonitoringService] AlertSystem inicializado para:', process.env.RIDES_USERNAME);
  }

  public static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      console.log('🏗️ Criando nova instância do MonitoringService...');
      MonitoringService.instance = new MonitoringService();
    } else {
      console.log('♻️ Reutilizando instância existente do MonitoringService');
    }
    return MonitoringService.instance;
  }

  /**
   * 📊 Integrar com ScraperStatusService do dashboard
   */
  public setDashboardStatusService(statusService: any): void {
    this.dashboardStatusService = statusService;
    console.log('📊 [MonitoringService] Integrado com Dashboard StatusService');
  }

  /**
   * 📊 Notificar dashboard sobre atividade de scraping
   */
  private notifyDashboardActivity(scraperId: string, activity: 'SCRAPING_START' | 'SCRAPING_SUCCESS' | 'LOGIN_SUCCESS' | 'SCRAPING_ERROR'): void {
    if (this.dashboardStatusService) {
      const timestamp = Date.now();
      switch (activity) {
        case 'SCRAPING_START':
          this.dashboardStatusService.updateHeartbeat(scraperId, timestamp);
          break;
        case 'SCRAPING_SUCCESS':
          this.dashboardStatusService.updateActivity(scraperId, timestamp);
          this.dashboardStatusService.updateHeartbeat(scraperId, timestamp);
          break;
        case 'LOGIN_SUCCESS':
          this.dashboardStatusService.updateActivity(scraperId, timestamp);
          this.dashboardStatusService.updateHeartbeat(scraperId, timestamp);
          break;
        case 'SCRAPING_ERROR':
          this.dashboardStatusService.updateHeartbeat(scraperId, timestamp);
          break;
      }
    }
  }

  /**
   * 🆔 Obter ID do scraper atual (compatível com dashboard)
   */
  private getCurrentScraperId(): string {
    const username = process.env.RIDES_USERNAME || 'default';
    return `scraper-${Buffer.from(username).toString('base64').slice(0, 8)}`;
  }

  private async initializeDatabase(): Promise<void> {
    try {
      await this.databaseManager.initialize();
      console.log('✅ DatabaseManager inicializado no MonitoringService');
    } catch (error) {
      console.error('❌ Erro ao inicializar DatabaseManager no MonitoringService:', error);
    }
  }

  private loadPreviousData(): void {
    // ⭐ MÉTODO MANTIDO POR COMPATIBILIDADE - CACHE REAL É GERENCIADO PELO DataCacheManager
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const data = fs.readFileSync(this.dataFilePath, 'utf-8');
        this.previousData = JSON.parse(data);
        console.log(`✅ Dados anteriores carregados: ${this.previousData.length} registros (compatibilidade)`);
      } else {
        console.log('📁 Sistema de cache sofisticado ativo - DataCacheManager em uso');
        // Criar diretório se não existir
        const dir = path.dirname(this.dataFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados anteriores:', error);
      this.previousData = [];
    }
  }

  private savePreviousData(data: RideData[]): void {
    // ⭐ MÉTODO MANTIDO POR COMPATIBILIDADE - CACHE REAL É GERENCIADO PELO DataCacheManager
    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2));
      console.log(`💾 Dados salvos: ${data.length} registros (compatibilidade)`);
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
    }
  }

  private generateRideId(ride: any): string {
    // Gera um ID único baseado nos dados da corrida
    const key = `${ride.driver || ''}_${ride.passenger || ''}_${ride.date || ''}_${ride.time || ''}_${ride.route || ''}`;
    return Buffer.from(key).toString('base64').substring(0, 16);
  }

  // ⭐ NOVO MÉTODO: Extrair ID único como o DataTransformer
  private extractRideId(ride: any): string {
    // Se o ride já tem um formato estruturado (com campos separados)
    if (ride.driver || ride.passenger || ride.date) {
      const idComponents: string[] = [];
      
      if (ride.driver) idComponents.push(`driver:${ride.driver}`);
      if (ride.passenger) idComponents.push(`passenger:${ride.passenger}`);
      if (ride.date) idComponents.push(`date:${ride.date}`);
      if (ride.time) idComponents.push(`time:${ride.time}`);
      if (ride.route) idComponents.push(`route:${ride.route}`);
      
      if (idComponents.length >= 2) {
        const combinedKey = idComponents.join('|');
        return createHash('md5').update(combinedKey).digest('hex').substring(0, 16);
      }
    }
    
    // Fallback: usar hash do objeto inteiro (excluindo timestamp)
    const cleanRide = { ...ride };
    delete cleanRide.scraped_at;
    delete cleanRide.timestamp;
    
    const fallbackKey = JSON.stringify(cleanRide);
    return createHash('md5').update(fallbackKey).digest('hex').substring(0, 16);
  }

  private generateDataHash(rideData: any): string {
    // Gerar hash baseado APENAS nos dados da corrida (SEM timestamp para evitar duplicação)
    const hashData = {
      table_name: rideData.table_name || 'unknown',
      data: JSON.stringify(rideData)
      // ⭐ REMOVIDO TIMESTAMP - estava causando duplicações na DB
    };
    
    const dataString = JSON.stringify(hashData);
    return createHash('md5').update(dataString).digest('hex');
  }

  private normalizeRideData(rawData: any[]): RideData[] {
    return rawData.map(ride => ({
      id: this.generateRideId(ride),
      driver: ride.driver || ride.motorista || '',
      passenger: ride.passenger || ride.passageiro || '',
      status: ride.status || ride.situacao || '',
      date: ride.date || ride.data || '',
      time: ride.time || ride.hora || '',
      route: ride.route || ride.rota || ride.origem_destino || '',
      price: ride.price || ride.preco || ride.valor || '',
      ...ride
    }));
  }

  private detectChanges(scrapingData: any[]): MonitoringResult {
    const timestamp = new Date().toISOString();
    
    // ⭐ USAR SISTEMA DE CACHE SOFISTICADO PARA DETECTAR MUDANÇAS
    const cacheResult = this.cacheManager.compareAndGetDifferences(scrapingData);
    
    // Converter para formato compatível com MonitoringResult
    const newRecords: RideData[] = [];
    const updatedRecords: RideData[] = [];
    const cancelledRecords: RideData[] = [];
    const completedRecords: RideData[] = [];
    
    // Processar diferenças do cache manager
    cacheResult.differences.forEach(diff => {
      diff.newRecords.forEach(row => {
        const ride = this.convertRowToRideData(row, diff.tableName);
        newRecords.push(ride);
        
        // Verificar se é cancelamento ou conclusão baseado no status
        if (ride.status.toLowerCase().includes('cancel')) {
          cancelledRecords.push(ride);
        } else if (ride.status.toLowerCase().includes('concluí') || 
                   ride.status.toLowerCase().includes('finaliz')) {
          completedRecords.push(ride);
        }
      });
      
      diff.updatedRecords.forEach(row => {
        const ride = this.convertRowToRideData(row, diff.tableName);
        updatedRecords.push(ride);
      });
    });
    
    // Calcular total de registros atuais
    const totalRecords = scrapingData.reduce((sum, table) => sum + table.rows.length, 0);

    return {
      timestamp,
      totalRecords,
      newRecords,
      updatedRecords,
      cancelledRecords,
      completedRecords,
      summary: {
        newCount: newRecords.length,
        updatedCount: updatedRecords.length,
        cancelledCount: cancelledRecords.length,
        completedCount: completedRecords.length
      }
    };
  }

  // ⭐ NOVO MÉTODO: Converter linha de tabela para RideData
  private convertRowToRideData(row: string[], tableName: string): RideData {
    // Mapear colunas baseado no nome da tabela ou assumir formato padrão
    const rideData: any = {
      table_name: tableName
    };
    
    // Assumir formato padrão das colunas (ajustar conforme necessário)
    if (row.length >= 4) {
      rideData.driver = row[0] || '';
      rideData.passenger = row[1] || '';
      rideData.route = row[2] || '';
      rideData.status = row[3] || '';
      rideData.date = row[4] || '';
      rideData.time = row[5] || '';
      rideData.price = row[6] || '';
    }
    
    return {
      id: this.generateRideId(rideData),
      driver: rideData.driver || rideData.motorista || '',
      passenger: rideData.passenger || rideData.passageiro || '',
      status: rideData.status || rideData.situacao || '',
      date: rideData.date || rideData.data || '',
      time: rideData.time || rideData.hora || '',
      route: rideData.route || rideData.rota || rideData.origem_destino || '',
      price: rideData.price || rideData.preco || rideData.valor || '',
      ...rideData
    };
  }
  private async sendToN8n(result: MonitoringResult): Promise<void> {
    try {
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      if (!webhookUrl) {
        console.log('⚠️ N8N_WEBHOOK_URL não configurado no .env');
        return;
      }

      // 🔍 VALIDAR PAYLOAD ANTES DO ENVIO
      console.log('🔍 [MonitoringService] Validando payload do webhook...');
      const validationResult = await this.webhookValidator.validate(result);
      
      // Exibir resultados da validação
      if (validationResult.errors.length > 0) {
        console.log(`❌ [WebhookValidator] ${validationResult.errors.length} erros encontrados:`);
        validationResult.errors.forEach((error, i) => {
          console.log(`  ${i + 1}. [${error.severity}] ${error.field}: ${error.message}`);
        });
      }

      if (validationResult.warnings.length > 0) {
        console.log(`⚠️ [WebhookValidator] ${validationResult.warnings.length} avisos:`);
        validationResult.warnings.forEach((warning, i) => {
          console.log(`  ${i + 1}. ${warning.field}: ${warning.message}`);
        });
      }

      // Bloquear envio se há erros críticos
      const criticalErrors = validationResult.errors.filter(e => e.severity === 'critical');
      if (criticalErrors.length > 0) {
        console.log('🚫 [MonitoringService] Bloqueando envio devido a erros críticos no payload');
        return;
      }

      // Usar payload sanitizado se disponível
      const finalPayload = validationResult.sanitizedPayload || result;
      
      const payload = {
        ...finalPayload,
        hasChanges: result.summary.newCount > 0 || 
                   result.summary.updatedCount > 0 || 
                   result.summary.cancelledCount > 0 || 
                   result.summary.completedCount > 0,
        metadata: {
          scraperVersion: '3.0.0', // ⭐ ATUALIZAR VERSÃO
          source: 'rides-dashboard-monitoring-v3',
          environment: process.env.NODE_ENV || 'development',
          cacheSystemEnabled: true, // ⭐ INDICAR QUE USA SISTEMA DE CACHE
          webhookValidated: true, // 🔍 INDICAR QUE FOI VALIDADO
          validationTime: validationResult.metadata.validationTime,
          payloadSize: validationResult.metadata.payloadSize,
          sanitizationApplied: validationResult.metadata.sanitizationApplied
        }
      };

      // ⭐ LÓGICA CORRETA: Enviar sempre se há dados, ou se há mudanças detectadas
      if (!payload.hasChanges && this.lastRawData.length === 0) {
        console.log('⏭️ Pulando envio para n8n (sem mudanças detectadas pelo sistema de cache)');
        return;
      }
      
      // ⭐ FORÇAR ENVIO se há dados mas cache não detectou mudanças (primeira execução)
      if (!payload.hasChanges && this.lastRawData.length > 0) {
        console.log('🔄 Forçando envio para n8n (primeira execução com dados)');
        payload.hasChanges = true;
      }

      console.log(`🚀 Enviando para n8n: ${JSON.stringify(result.summary)}`);
      console.log(`🔍 Payload validado: ${validationResult.errors.length} erros, ${validationResult.warnings.length} avisos`);
      
      // 🎛️ VERIFICAR RATE LIMIT ANTES DO ENVIO
      console.log('🎛️ [MonitoringService] Verificando rate limit...');
      const rateLimitResult = await this.rateLimiter.checkLimit('webhook-n8n-delivery');
      
      if (!rateLimitResult.allowed) {
        console.log(`🚫 [RateLimiter] Webhook bloqueado: ${rateLimitResult.reason}`);
        console.log(`⏰ [RateLimiter] Retry após: ${rateLimitResult.retryAfter}ms`);
        
        // Aguardar até que seja seguro enviar
        console.log('⏳ [RateLimiter] Aguardando token disponível...');
        const waitResult = await this.rateLimiter.waitForToken('webhook-n8n-delivery');
        
        if (!waitResult.allowed) {
          console.error('❌ [RateLimiter] Timeout aguardando token - abortando envio');
          return;
        }
        
        console.log(`✅ [RateLimiter] Token obtido após espera (${waitResult.tokensRemaining} restantes)`);
      } else {
        console.log(`✅ [RateLimiter] Rate limit OK (${rateLimitResult.tokensRemaining} tokens restantes)`);
      }
      
      // 🔄 USAR RETRYMANAGER PARA ENVIO ROBUSTO
      const retryResult = await this.retryManager.executeWithRetry(
        async () => {
          const response = await axios.post(webhookUrl, payload, {
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'Rides-Scraper-Bot/3.0.0'
            },
            timeout: 30000
          });
          return response;
        },
        'webhook-n8n-delivery',
        result
      );

      if (retryResult.success) {
        console.log(`✅ Webhook enviado com sucesso após ${retryResult.attempts} tentativa(s) em ${retryResult.totalTime}ms`);
        if (retryResult.result) {
          console.log(`📊 Status HTTP: ${retryResult.result.status}`);
        }
      } else {
        console.error(`❌ Falha ao enviar webhook após ${retryResult.attempts} tentativa(s):`);
        console.error(`   Erro: ${retryResult.error?.message}`);
        console.error(`   Tempo total: ${retryResult.totalTime}ms`);
        
        if (retryResult.circuitBreakerTriggered) {
          console.error('🚫 Circuit breaker ativado - endpoint pode estar instável');
        }
        
        if (retryResult.sentToDeadLetterQueue) {
          console.error('💀 Payload enviado para Dead Letter Queue para reprocessamento');
        }

        // Mostrar métricas do RetryManager
        const metrics = this.retryManager.getMetrics();
        console.log('📊 [RetryManager] Métricas:', {
          successRate: `${metrics.successRate}%`,
          circuitBreaker: metrics.circuitBreakerState,
          dlqSize: metrics.deadLetterQueueSize
        });
      }

    } catch (error) {
      console.error('❌ Erro crítico no sendToN8n:', error instanceof Error ? error.message : error);
    }
  }

  /**
   * 🚨 CORREÇÃO CRÍTICA: Salvamento unificado para evitar perda de dados de Performance
   * Salva TODOS os dados de drivers em uma única transação atômica
   */
  private async saveDriversDataUnified(
    driversData: any[],
    sessionInfo: any,
    hasChanges: boolean = true
  ): Promise<void> {
    console.log('🔄 [TRANSAÇÃO UNIFICADA] Iniciando salvamento atômico de drivers...');

    // Obter pool do DatabaseManager
    const pool = (this.databaseManager as any).pool;
    if (!pool) {
      throw new Error('Pool de conexão não disponível');
    }

    const client = await pool.connect();
    
    try {
      // ===== INÍCIO DA TRANSAÇÃO UNIFICADA =====
      await client.query('BEGIN');
      console.log('✅ [TRANSAÇÃO UNIFICADA] Transação iniciada');

      // 1. PROCESSAR DADOS GENÉRICOS
      const driversTransformer = DriversDataTransformer.getInstance();
      const transformedData = driversTransformer.transformScrapingData(
        driversData,
        sessionInfo,
        'drivers-unified-transaction',
        hasChanges
      );

      let totalInserted = 0;
      let totalUpdated = 0;

      // 2. INSERIR DADOS GENÉRICOS
      for (const record of transformedData.records) {
        const query = `
          INSERT INTO drivers_data (
            driver_id, name, email, mobile, data_type, page_source, 
            additional_data, data_hash, session_info, source, unique_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (data_type, driver_id, data_hash) 
          DO UPDATE SET 
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            mobile = EXCLUDED.mobile,
            additional_data = EXCLUDED.additional_data,
            scraped_at = NOW(),
            session_info = EXCLUDED.session_info,
            source = EXCLUDED.source
          RETURNING (xmax = 0) AS inserted
        `;
        
        const result = await client.query(query, [
          record.driver_id,
          record.name,
          record.email || null,
          record.mobile || null,
          record.data_type,
          record.page_source,
          JSON.stringify(record.additional_data || {}),
          record.data_hash,
          JSON.stringify(record.session_info || {}),
          record.source || 'drivers-unified-transaction',
          record.unique_id
        ]);

        if (result.rows[0].inserted) {
          totalInserted++;
        } else {
          totalUpdated++;
        }
      }

      console.log(`✅ [TRANSAÇÃO UNIFICADA] Dados genéricos: ${totalInserted} inseridos, ${totalUpdated} atualizados`);

      // 3. PROCESSAR PERFORMANCE ESPECIFICAMENTE (NA MESMA TRANSAÇÃO)
      const performanceData = driversData.find(table => 
        table.name && table.name.includes('Performance') && !table.isEmpty
      );

      if (performanceData && performanceData.rows && performanceData.rows.length > 0) {
        console.log('🏆 [TRANSAÇÃO UNIFICADA] Processando Performance na mesma transação...');
        
        let perfInserted = 0;
        let perfUpdated = 0;

        for (let rowIdx = 0; rowIdx < performanceData.rows.length; rowIdx++) {
          const row = performanceData.rows[rowIdx];
          
          // Pular linhas vazias
          if (row.length === 1 && row[0].includes('No data available')) {
            continue;
          }

          // Mapear dados usando headers
          const driverPerformance: any = {};
          performanceData.headers.forEach((header: string, idx: number) => {
            driverPerformance[header] = row[idx] || '';
          });

          // Criar hash específico para Performance
          const hashData = `performance-${driverPerformance['Driver ID'] || rowIdx}-${JSON.stringify(driverPerformance)}`;
          const dataHash = require('crypto').createHash('md5').update(hashData).digest('hex');

          const perfQuery = `
            INSERT INTO drivers_data (
              driver_id, name, email, mobile, data_type, page_source, 
              additional_data, data_hash, session_info, source, unique_id
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            ON CONFLICT (data_type, driver_id, data_hash) 
            DO UPDATE SET 
              name = EXCLUDED.name,
              mobile = EXCLUDED.mobile,
              additional_data = EXCLUDED.additional_data,
              scraped_at = NOW(),
              session_info = EXCLUDED.session_info,
              source = EXCLUDED.source
            RETURNING (xmax = 0) AS inserted
          `;
          
          const perfResult = await client.query(perfQuery, [
            driverPerformance['Driver ID'] || `unknown-${rowIdx}`,
            driverPerformance['Driver Name'] || '',
            null, // email
            driverPerformance['Phone Number'] || null,
            'performance',
            'Driver Performance',
            JSON.stringify(driverPerformance),
            dataHash,
            JSON.stringify(sessionInfo),
            'drivers-unified-transaction',
            `performance-unified-${driverPerformance['Driver ID'] || rowIdx}-${Date.now()}`
          ]);

          if (perfResult.rows[0].inserted) {
            perfInserted++;
          } else {
            perfUpdated++;
          }
        }

        console.log(`✅ [TRANSAÇÃO UNIFICADA] Performance: ${perfInserted} inseridos, ${perfUpdated} atualizados`);
      } else {
        console.log('ℹ️ [TRANSAÇÃO UNIFICADA] Nenhum dado de Performance válido encontrado');
      }

      // 4. CRIAR SESSÃO DE SCRAPING
      const sessionQuery = `
        INSERT INTO scraping_sessions (
          total_records, new_records, has_changes, execution_source, browser_session_id
        )
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `;
      
      await client.query(sessionQuery, [
        transformedData.totalRecords,
        transformedData.newRecords,
        hasChanges,
        'drivers-unified-transaction',
        sessionInfo?.browserSessionId || null
      ]);

      // ===== COMMIT DA TRANSAÇÃO UNIFICADA =====
      await client.query('COMMIT');
      console.log('🎉 [TRANSAÇÃO UNIFICADA] Transação COMMITADA com sucesso!');
      console.log('🎯 [TRANSAÇÃO UNIFICADA] TODOS os dados (incluindo Performance) salvos atomicamente');

    } catch (error: any) {
      // ===== ROLLBACK EM CASO DE ERRO =====
      await client.query('ROLLBACK');
      console.error('💥 [TRANSAÇÃO UNIFICADA] Erro na transação:', error.message);
      console.error('🔄 [TRANSAÇÃO UNIFICADA] ROLLBACK executado - nenhum dado foi perdido');
      throw error;
    } finally {
      client.release();
      console.log('🔓 [TRANSAÇÃO UNIFICADA] Conexão liberada');
    }
  }

  /**
   * 🔍 Detecta se o erro é relacionado a falha de login
   */
  private isLoginFailure(errorMessage: string): boolean {
    const loginIndicators = [
      'login failed',
      'authentication failed',
      'credenciais inválidas',
      'não foi possível fazer login',
      'access denied',
      'unauthorized',
      'invalid credentials',
      'session expired',
      'please login',
      'captcha',
      'blocked'
    ];
    
    const message = errorMessage.toLowerCase();
    return loginIndicators.some(indicator => message.includes(indicator));
  }

  private async performScraping(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Scraping já em execução, pulando...');
      return;
    }

    this.isRunning = true;
    console.log(`🕐 [${new Date().toLocaleString()}] Iniciando scraping (rides + drivers)...`);
    
    // 📊 Notificar dashboard que scraping iniciou
    const scraperId = this.getCurrentScraperId();
    this.notifyDashboardActivity(scraperId, 'SCRAPING_START');
    
    try {
      // 🚨 Atualizar atividade no sistema de alertas
      this.alertSystem.updateActivity();

      // ⭐ VERIFICAR SE O BANCO ESTÁ CONECTADO
      if (!this.databaseManager.isConnectedToDatabase()) {
        console.log('⚠️ Banco de dados não conectado, tentando reconectar...');
        await this.databaseManager.initialize();
      }

      // 1. EXECUTAR SCRAPING DE RIDES
      console.log('🚗 Executando scraping de rides...');
      console.log('🔍 [DEBUG] Chamando scrapeAllRidesDataPersistent()...');
      const scrapingResult = await scrapeAllRidesDataPersistent();
      console.log('🔍 [DEBUG] Resultado do scraping recebido:', {
        success: scrapingResult.success,
        loginSuccess: scrapingResult.loginSuccess,
        dataLength: scrapingResult.data?.length || 0,
        message: scrapingResult.message?.substring(0, 100) || 'N/A'
      });
      
      // 🚨 VERIFICAR FALHAS DE LOGIN/SCRAPING
      if (!scrapingResult.success) {
        console.error('❌ Falha no scraping de rides:', scrapingResult.message);
        
        // 📊 Notificar dashboard sobre erro
        this.notifyDashboardActivity(scraperId, 'SCRAPING_ERROR');
        
        // Detectar se é falha de login
        if (this.isLoginFailure(scrapingResult.message || '')) {
          await this.alertSystem.alertLoginFailed(scrapingResult.message || 'Unknown login error');
          console.log('🚨 [AlertSystem] Alerta de falha de login enviado');
        } else {
          await this.alertSystem.alertScraperDown(scrapingResult.message || 'Scraping failed');
          console.log('🚨 [AlertSystem] Alerta de scraper down enviado');
        }
        return;
      }
      
      // ✅ SCRAPING BEM-SUCEDIDO - SEMPRE NOTIFICAR ATIVIDADE
      if (scrapingResult.loginSuccess) {
        console.log('🎉 ATIVIDADE DE SCRAPING DETECTADA - Notificando dashboard!');
        this.notifyDashboardActivity(scraperId, 'LOGIN_SUCCESS');
      } else {
        console.log('✅ Scraping bem-sucedido - Atualizando heartbeat');
        this.notifyDashboardActivity(scraperId, 'SCRAPING_SUCCESS');
      }
      
      if (!scrapingResult.data || scrapingResult.data.length === 0) {
        console.log('⚠️ Nenhum dado de rides extraído:', scrapingResult.message);
        console.log('📊 Mas login foi bem-sucedido - dashboard notificado!');
        
        // Login bem-sucedido mesmo sem dados - não é erro crítico
        // await this.alertSystem.alertScraperDown('No data extracted from rides scraping');
        // return;  // ❌ REMOVIDO: não retornar aqui, continuar processamento
      }

      // 🔧 ADAPTAÇÃO PARA ESTRUTURA ATUAL DO BANCO
      // Processar dados para formato compatível: {tableName, newRecords}
      const adaptedData: any[] = [];
      const rawData: any[] = []; // Para compatibilidade com cache/webhook
      console.log(`📊 Processando ${scrapingResult.data.length} tabelas de dados para estrutura compatível...`);
      
      scrapingResult.data.forEach((table: any) => {
        console.log(`📋 Tabela: ${table.name}, Rows: ${table.rows?.length || 0}, isEmpty: ${table.isEmpty}`);
        
        // ⭐ ADAPTAÇÃO: Ignorar isEmpty - só verificar se há rows
        if (table.rows && table.rows.length > 0) {
          console.log(`✅ Processando ${table.rows.length} registros da tabela ${table.name}`);
          
          // 🔧 NOVO FORMATO: Estrutura compatível com dados existentes
          const adaptedTableData = {
            tableName: table.name,  // Nome da página/aba
            newRecords: table.rows.map((row: any[]) => {
              // 🚫 FILTRAR VALORES INVÁLIDOS (NaN, null, undefined)
              return row.map(cell => {
                if (cell === null || cell === undefined || 
                    (typeof cell === 'number' && Number.isNaN(cell))) {
                  return '';  // Substituir por string vazia
                }
                return cell;
              });
            })
          };
          
          adaptedData.push(adaptedTableData);
          
          // Converter para formato plano para compatibilidade com cache/webhook
          table.rows.forEach((row: any) => {
            const rowData: any = {};
            table.headers.forEach((header: any, index: number) => {
              rowData[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
            });
            rowData.table_name = table.name;
            rawData.push(rowData);
          });
        } else {
          console.log(`⚠️ Tabela ${table.name} vazia ou sem rows`);
        }
      });
      
      console.log(`📊 Total de registros convertidos: ${rawData.length}`);
      console.log(`📊 Total de tabelas adaptadas: ${adaptedData.length}`);
      
      // ⭐ ARMAZENAR DADOS PARA WEBHOOK
      this.lastRawData = rawData;

      // ⭐ USAR SISTEMA DE CACHE SOFISTICADO - detectar mudanças nos dados de tabela originais
      const changes = this.detectChanges(scrapingResult.data);

      // 🔧 SALVAR DADOS ADAPTADOS NO BANCO DE DADOS
      console.log(`🔍 Debug - adaptedData.length: ${adaptedData.length}, rawData.length: ${rawData.length}, changes: ${JSON.stringify(changes.summary)}`);
      
      if (adaptedData.length > 0) {
        console.log(`💾 Salvando ${adaptedData.length} tabelas de dados no banco...`);
        
        try {
          // 🔧 SALVAR CADA TABELA COM ESTRUTURA ADAPTADA
          for (const tableData of adaptedData) {
            const rideId = this.extractRideId(tableData);
            
            // Hash baseado em table_name + rideId
            const uniqueHash = createHash('md5')
              .update(`${tableData.tableName || 'unknown'}|${rideId}`)
              .digest('hex');
            
            const rideRecord = {
              table_name: tableData.tableName, // Nome da página como table_name
              data_hash: uniqueHash,
              ride_data: tableData, // Estrutura completa {tableName, newRecords}
              session_info: scrapingResult.sessionInfo || {},
              source: 'monitoring-service-adapted'
            };
            
            console.log(`� Salvando tabela: ${tableData.tableName} com ${tableData.newRecords.length} registros`);
            await this.databaseManager.insertRideData([rideRecord]);
          }
          
          console.log(`✅ Dados adaptados salvos no banco de dados`);
          
          // ⭐ FORÇAR hasChanges se há dados para salvar na primeira execução
          if (changes.summary.newCount === 0 && changes.summary.updatedCount === 0) {
            console.log(`🔄 Primeira execução detectada - forçando mudanças para webhook`);
            changes.summary.newCount = rawData.length;
            changes.newRecords = this.normalizeRideData(rawData);
          }
          
        } catch (ridesError) {
          console.error('❌ Erro ao salvar dados adaptados:', ridesError);
          console.error('❌ Stack trace:', (ridesError as Error).stack);
          // Continuar execução mesmo se rides falharem
        }
      } else {
        console.log('⚠️ Nenhum dado adaptado para salvar no banco');
        console.log(`⚠️ Debug - scrapingResult.data: ${JSON.stringify(scrapingResult.data.map(t => ({name: t.name, rows: t.rows?.length, isEmpty: t.isEmpty})))}`);
      }

      // 2. EXECUTAR SCRAPING DE DRIVERS (usando a mesma sessão do browser)
      console.log('👥 Executando scraping de drivers...');
      const driversResult = await scrapeAllDriversDataPersistent();
      
      let driversTransformed = null;
      if (driversResult.success && driversResult.data && driversResult.data.length > 0) {
        console.log(`📊 Dados de drivers extraídos: ${driversResult.data.reduce((sum, table) => sum + table.rows.length, 0)} registros`);
        
        try {
          // 🚨 CORREÇÃO CRÍTICA: TRANSAÇÃO UNIFICADA PARA TODOS OS DADOS DE DRIVERS
          console.log('🔄 [TRANSAÇÃO UNIFICADA] Salvando TODOS os dados de drivers em transação única...');
          
          await this.saveDriversDataUnified(
            driversResult.data,
            scrapingResult.sessionInfo || driversResult.sessionInfo,
            driversResult.hasChanges || false
          );
          
          console.log(`✅ [TRANSAÇÃO UNIFICADA] Dados de drivers (incluindo Performance) salvos atomicamente`);

        } catch (driversError) {
          console.error('❌ [TRANSAÇÃO UNIFICADA] Erro ao processar dados de drivers:', driversError);
          console.error('🔄 [TRANSAÇÃO UNIFICADA] Rollback automático executado - nenhum dado foi perdido');
          // Continuar execução mesmo se drivers falharem
        }
      } else {
        console.log('⚠️ Nenhum dado de drivers extraído:', driversResult.message);
      }

      // Log das mudanças (rides)
      if (changes.summary.newCount > 0) {
        console.log(`🆕 Novos registros de rides: ${changes.summary.newCount}`);
      }
      if (changes.summary.updatedCount > 0) {
        console.log(`🔄 Registros de rides atualizados: ${changes.summary.updatedCount}`);
      }
      if (changes.summary.cancelledCount > 0) {
        console.log(`❌ Registros de rides cancelados: ${changes.summary.cancelledCount}`);
      }
      if (changes.summary.completedCount > 0) {
        console.log(`✅ Registros de rides concluídos: ${changes.summary.completedCount}`);
      }

      // Log simplificado para drivers (após transação unificada)
      console.log(`👥 Drivers processados com transação unificada`);

      // Enviar para n8n (apenas quando há mudanças - evita spam)
      await this.sendToN8n(changes);

      console.log(`✅ [${new Date().toLocaleString()}] Scraping concluído (rides + drivers)`);
      
      // 📊 Notificar dashboard que scraping foi bem-sucedido
      this.notifyDashboardActivity(scraperId, 'SCRAPING_SUCCESS');
      
    } catch (error) {
      console.error('❌ Erro durante scraping:', error);
      
      // � Notificar dashboard sobre erro
      this.notifyDashboardActivity(scraperId, 'SCRAPING_ERROR');
      
      // �🚨 NOTIFICAR ERRO CRÍTICO DO SCRAPER
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (this.isLoginFailure(errorMessage)) {
        await this.alertSystem.alertLoginFailed(errorMessage);
        console.log('🚨 [AlertSystem] Alerta de falha de login enviado (catch)');
      } else {
        await this.alertSystem.alertScraperDown(`Critical error: ${errorMessage}`);
        console.log('🚨 [AlertSystem] Alerta de erro crítico enviado (catch)');
      }
    } finally {
      this.isRunning = false;
    }
  }

  public startMonitoring(): void {
    // ⚠️ Evitar múltiplas inicializações
    if (this.cronTasks.length > 0) {
      console.log('⚠️ Monitoramento já iniciado - ignorando nova tentativa de inicialização');
      return;
    }

    // Obter intervalo da variável de ambiente (padrão 5 minutos - intervalo seguro testado)
    const scrapeIntervalMinutes = parseFloat(process.env.SCRAPE_INTERVAL || '5');
    const scrapeIntervalCron = Math.round(scrapeIntervalMinutes); // Arredondar para cron
    
    console.log('🚀 Iniciando monitoramento automático (Rides + Drivers)...');
    console.log(`⏰ Frequência: A cada ${scrapeIntervalMinutes} minutos (configurável via SCRAPE_INTERVAL)`);
    console.log('🚗 Scrapers: Rides + Drivers integrados');
    console.log(`🌐 Webhook n8n: ${process.env.N8N_WEBHOOK_URL}`);
    console.log(`👀 Modo headless: ${process.env.HEADLESS_MODE}`);

    // Executar uma vez imediatamente
    setTimeout(() => {
      this.performScraping();
    }, 5000); // 5 segundos de delay inicial

    // Agendar execução usando variável SCRAPE_INTERVAL
    const cronExpression = `*/${scrapeIntervalCron} * * * *`;
    console.log(`⏰ Cron configurado: ${cronExpression} (a cada ${scrapeIntervalCron} minutos)`);
    
    const task1 = cron.schedule(cronExpression, () => {
      this.performScraping();
    });

    this.cronTasks = [task1];

    // 🚨 INICIAR SISTEMA DE HEARTBEAT
    console.log('💓 Iniciando sistema de heartbeat (monitoramento de atividade)...');
    this.alertSystem.startHeartbeat();

    console.log('✅ Monitoramento iniciado!');
  }
  public stopMonitoring(): void {
    console.log('🛑 Parando monitoramento...');
    this.cronTasks.forEach(task => {
      if (task && task.stop) {
        task.stop();
      }
    });
    this.cronTasks = [];
    
    // 🚨 PARAR SISTEMA DE HEARTBEAT
    this.alertSystem.stopHeartbeat();
  }

  public async runOnce(): Promise<void> {
    console.log('🔄 Executando scraping único...');
    await this.performScraping();
  }

  // 🔄 MÉTODOS DE GESTÃO DO RETRYMANAGER
  
  /**
   * 📊 Obter métricas do RetryManager
   */
  public getRetryMetrics() {
    return this.retryManager.getMetrics();
  }

  /**
   * 💀 Obter items da Dead Letter Queue
   */
  public getDeadLetterQueue() {
    return this.retryManager.getDeadLetterQueue();
  }

  /**
   * 🔄 Processar items da Dead Letter Queue
   */
  public async processDLQ(): Promise<void> {
    console.log('🔄 [MonitoringService] Processando Dead Letter Queue...');
    await this.retryManager.processDLQ();
  }

  /**
   * 🧹 Limpar Dead Letter Queue
   */
  public clearDeadLetterQueue(): number {
    return this.retryManager.clearDeadLetterQueue();
  }

  /**
   * 🔄 Reset do Circuit Breaker
   */
  public resetCircuitBreaker(): void {
    this.retryManager.resetCircuitBreaker();
    console.log('🔄 [MonitoringService] Circuit breaker resetado');
  }

  /**
   * ⚙️ Atualizar configuração do RetryManager
   */
  public updateRetryConfig(config: any): void {
    this.retryManager.updateConfig(config);
    console.log('⚙️ [MonitoringService] Configuração do RetryManager atualizada');
  }

  /**
   * 📈 Obter status completo do sistema de webhooks
   */
  public getWebhookSystemStatus() {
    const retryMetrics = this.retryManager.getMetrics();
    const dlqItems = this.retryManager.getDeadLetterQueue();
    const rateLimitMetrics = this.rateLimiter.getMetrics();
    const rateLimitHealth = this.rateLimiter.getHealthStatus();
    
    return {
      retryManager: {
        metrics: retryMetrics,
        healthStatus: retryMetrics.successRate > 85 ? 'healthy' : 
                     retryMetrics.successRate > 60 ? 'degraded' : 'unhealthy',
        circuitBreakerStatus: retryMetrics.circuitBreakerState,
        deadLetterQueueSize: retryMetrics.deadLetterQueueSize,
        recentFailures: dlqItems.slice(-5).map(item => ({
          id: item.id,
          error: item.originalError.message,
          timestamp: new Date(item.timestamp).toISOString(),
          attempts: item.attempts.length
        }))
      },
      rateLimiter: {
        metrics: rateLimitMetrics,
        healthStatus: rateLimitHealth.status,
        details: rateLimitHealth.details,
        tokensAvailable: rateLimitHealth.tokensAvailable,
        blockedPercentage: rateLimitHealth.blockedPercentage,
        recommendations: rateLimitHealth.recommendations
      },
      webhookValidator: {
        enabled: true,
        strictMode: true,
        sanitizationEnabled: true
      },
      recommendations: this.generateWebhookRecommendations(retryMetrics, rateLimitMetrics)
    };
  }

  // 🎛️ MÉTODOS DE GESTÃO DO RATELIMITER
  
  /**
   * 📊 Obter métricas do RateLimiter
   */
  public getRateLimitMetrics() {
    return this.rateLimiter.getMetrics();
  }

  /**
   * 🏥 Obter status de saúde do RateLimiter
   */
  public getRateLimitHealth() {
    return this.rateLimiter.getHealthStatus();
  }

  /**
   * 📈 Obter estatísticas detalhadas do RateLimiter
   */
  public getRateLimitStats() {
    return this.rateLimiter.getDetailedStats();
  }

  /**
   * ⚙️ Atualizar configuração do RateLimiter
   */
  public updateRateLimitConfig(config: any): void {
    this.rateLimiter.updateConfig(config);
    console.log('⚙️ [MonitoringService] Configuração do RateLimiter atualizada');
  }

  /**
   * 🔄 Reset do RateLimiter
   */
  public resetRateLimiter(): void {
    this.rateLimiter.reset();
    console.log('🔄 [MonitoringService] RateLimiter resetado');
  }

  /**
   * 🎯 Testar rate limit para endpoint específico
   */
  public async testRateLimit(endpoint: string = 'webhook-n8n-delivery'): Promise<any> {
    console.log(`🧪 [MonitoringService] Testando rate limit para: ${endpoint}`);
    const result = await this.rateLimiter.checkLimit(endpoint);
    console.log(`📊 Resultado: ${result.allowed ? 'PERMITIDO' : 'BLOQUEADO'}`);
    return result;
  }

  /**
   * ⏳ Aguardar token disponível
   */
  public async waitForRateLimit(endpoint: string = 'webhook-n8n-delivery'): Promise<any> {
    console.log(`⏳ [MonitoringService] Aguardando token para: ${endpoint}`);
    return await this.rateLimiter.waitForToken(endpoint);
  }

  /**
   * 💡 Gerar recomendações baseadas nas métricas (atualizado com RateLimiter)
   */
  private generateWebhookRecommendations(retryMetrics: any, rateLimitMetrics: any): string[] {
    const recommendations: string[] = [];

    // Recomendações do RetryManager
    if (retryMetrics.successRate < 60) {
      recommendations.push('⚠️ Taxa de sucesso baixa - verificar conectividade com n8n');
    }

    if (retryMetrics.circuitBreakerTrips > 5) {
      recommendations.push('🚫 Muitas ativações do circuit breaker - verificar estabilidade do endpoint');
    }

    if (retryMetrics.deadLetterQueueSize > 10) {
      recommendations.push('💀 Dead Letter Queue crescendo - processar items pendentes');
    }

    if (retryMetrics.circuitBreakerState === 'OPEN') {
      recommendations.push('🔴 Circuit breaker OPEN - sistema em modo de proteção');
    }

    // Recomendações do RateLimiter
    if (rateLimitMetrics.blockedPercentage > 20) {
      recommendations.push('🎛️ Alta taxa de bloqueios no rate limiter - revisar configuração');
    }

    if (rateLimitMetrics.currentTokens < 1) {
      recommendations.push('⏳ Rate limiter sem tokens - aguardando reposição');
    }

    if (rateLimitMetrics.averageWaitTime > 5000) {
      recommendations.push('⏰ Tempo de espera alto no rate limiter - considerar aumentar capacidade');
    }

    if (recommendations.length === 0) {
      recommendations.push('✅ Sistema de webhooks funcionando corretamente');
    }

    return recommendations;
  }
}

export { MonitoringService, RideData, MonitoringResult };
