/**
 * 📊 SCRAPER STATUS SERVICE
 * 
 * Serviço responsável por determinar o status dos scrapers
 * e fornecer dados para o dashboard em tempo real.
 * 
 * Status Types:
 * - 🟢 ONLINE_ACTIVE: Heartbeat OK + Atividade recente
 * - 🟡 ONLINE_IDLE: Heartbeat OK + Sem atividade recente  
/**
 * 🎛️ SCRAPER STATUS SERVICE
 * 
 * Gerencia o status e métricas de todos os scrapers em tempo real
 * Integrado com PostgreSQL para persistência multi-scraper
 * 
 * STATUS HIERARCHY (ordem de prioridade):
 * - 🔴 OFFLINE: Sem heartbeat há > 15 minutos
 * - ⚫ ERROR: Erros frequentes detectados  
 * - 🟢 ONLINE_ACTIVE: Scraping ativo (heartbeat + activity recentes)
 * - 🟡 ONLINE_IDLE: Online mas sem atividade de scraping
 * - � STARTING: Iniciando (primeiros 5 minutos)
 */

import { DatabaseManager } from '../../services/databaseManager';

export enum ScraperStatus {
  ONLINE_ACTIVE = 'ONLINE_ACTIVE',
  ONLINE_IDLE = 'ONLINE_IDLE', 
  OFFLINE = 'OFFLINE',
  ERROR = 'ERROR',
  STARTING = 'STARTING'
}

export interface ScraperData {
  id: string;
  name: string; // RIDES_USERNAME
  status: ScraperStatus;
  lastHeartbeat: number;
  lastActivity: number;
  lastError?: string;
  metrics: {
    successRate: number;
    ridesScraped: number;
    driversScraped: number;
    errorsCount: number;
    responseTimeMs: number;
  };
  startTime?: number;
}

export interface StatusUpdate {
  scraperId: string;
  status: ScraperStatus;
  timestamp: number;
  metrics?: Partial<ScraperData['metrics']>;
  message?: string;
}

export class ScraperStatusService {
  private static instance: ScraperStatusService | null;
  private scraperData: Map<string, ScraperData> = new Map();
  private statusHistory: Map<string, StatusUpdate[]> = new Map();
  private databaseManager: DatabaseManager;

  private constructor() {
    this.databaseManager = DatabaseManager.getInstance();
    this.initializeDefaultScrapers();
  }

  public static getInstance(): ScraperStatusService {
    if (!ScraperStatusService.instance) {
      ScraperStatusService.instance = new ScraperStatusService();
    }
    return ScraperStatusService.instance;
  }

  /**
   * 🔄 Força reset do singleton (para aplicar mudanças)
   */
  public static resetInstance(): void {
    console.log('🔄 Resetando ScraperStatusService singleton...');
    ScraperStatusService.instance = null;
  }

  /**
   * 🚀 Inicializar apenas quando scrapers forem registrados manualmente
   */
  private initializeDefaultScrapers(): void {
    // Não criar scrapers automáticos - aguardar registro manual
    console.log(`📊 [ScraperStatusService] Ready for scraper registration`);
  }

  /**
   * 🔍 Determina o status atual de um scraper baseado em múltiplos fatores
   */
  public determineScraperStatus(scraperId: string): ScraperStatus {
    const scraper = this.scraperData.get(scraperId);
    if (!scraper) {
      return ScraperStatus.OFFLINE;
    }

    const now = Date.now();

    // 1. VERIFICAÇÃO CRÍTICA: Heartbeat (15 min timeout)
    const heartbeatAge = now - scraper.lastHeartbeat;
    const isHeartbeatAlive = heartbeatAge < 15 * 60 * 1000; // 15 minutos

    if (!isHeartbeatAlive) {
      return ScraperStatus.OFFLINE;
    }

    // 2. VERIFICAÇÃO DE ATIVIDADE PRIMEIRO: Se há atividade recente, está ativo
    const activityAge = scraper.lastActivity > 0 ? now - scraper.lastActivity : Infinity;
    const isActive = activityAge < 30 * 60 * 1000; // 30 minutos

    if (isActive) {
      return ScraperStatus.ONLINE_ACTIVE;
    }

    // 3. VERIFICAÇÃO DE STARTUP: Primeiros 5 minutos (apenas se sem atividade)
    if (scraper.startTime && (now - scraper.startTime) < 5 * 60 * 1000) {
      return ScraperStatus.STARTING;
    }

    // 4. VERIFICAÇÃO DE PERFORMANCE: Taxa de erro alta
    const errorRate = this.calculateErrorRate(scraperId, '1hour');
    if (errorRate > 50) { // > 50% de erro
      return ScraperStatus.ERROR;
    }

    // 5. DEFAULT: Online mas idle
    return ScraperStatus.ONLINE_IDLE;
  }

  /**
   * 💓 Atualizar heartbeat de um scraper
   */
  public updateHeartbeat(scraperId: string): void {
    const scraper = this.scraperData.get(scraperId);
    if (scraper) {
      scraper.lastHeartbeat = Date.now();
      this.updateScraperStatus(scraperId);
    }
  }

  /**
   * ⚡ Atualizar atividade de scraping
   */
  public updateActivity(scraperId: string, metrics?: Partial<ScraperData['metrics']>): void {
    const scraper = this.scraperData.get(scraperId);
    if (scraper) {
      scraper.lastActivity = Date.now();
      scraper.lastHeartbeat = Date.now(); // Atividade implica heartbeat
      
      if (metrics) {
        scraper.metrics = { ...scraper.metrics, ...metrics };
      }
      
      this.updateScraperStatus(scraperId);
    }
  }

  /**
   * ❌ Reportar erro de scraper
   */
  public reportError(scraperId: string, error: string): void {
    const scraper = this.scraperData.get(scraperId);
    if (scraper) {
      scraper.lastError = error;
      scraper.metrics.errorsCount++;
      this.updateScraperStatus(scraperId);
    }
  }

  /**
   * 🔄 Atualizar status e notificar mudanças
   */
  private updateScraperStatus(scraperId: string): ScraperStatus {
    const scraper = this.scraperData.get(scraperId);
    if (!scraper) {
      return ScraperStatus.OFFLINE;
    }

    const oldStatus = scraper.status;
    const newStatus = this.determineScraperStatus(scraperId);

    if (oldStatus !== newStatus) {
      scraper.status = newStatus;
      
      // Adicionar ao histórico
      const update: StatusUpdate = {
        scraperId,
        status: newStatus,
        timestamp: Date.now(),
        metrics: scraper.metrics
      };

      const history = this.statusHistory.get(scraperId) || [];
      history.push(update);
      
      // Manter apenas últimas 100 mudanças
      if (history.length > 100) {
        history.shift();
      }
      
      this.statusHistory.set(scraperId, history);

      console.log(`📊 [StatusService] ${scraperId}: ${oldStatus} → ${newStatus}`);
      
      // TODO: Emitir evento WebSocket
      this.emitStatusChange(update);
    }

    return newStatus;
  }

  /**
   * 📊 Calcular taxa de erro
   */
  private calculateErrorRate(scraperId: string, period: '1hour' | '24hour' = '1hour'): number {
    const scraper = this.scraperData.get(scraperId);
    if (!scraper) return 0;

    // Implementação simplificada - pode ser expandida com dados do banco
    const totalAttempts = scraper.metrics.ridesScraped + scraper.metrics.driversScraped + scraper.metrics.errorsCount;
    if (totalAttempts === 0) return 0;

    return (scraper.metrics.errorsCount / totalAttempts) * 100;
  }

  /**
   * 📡 Emitir mudança de status via WebSocket (placeholder)
   */
  private emitStatusChange(update: StatusUpdate): void {
    // TODO: Implementar quando WebSocket estiver configurado
    console.log(`🔄 [StatusService] Status change event: ${JSON.stringify(update)}`);
  }

  /**
   * 📋 Obter todos os scrapers com status atual
   * Agora lê direto do banco de dados para suporte multi-scraper
   */
  public async getAllScrapers(): Promise<ScraperData[]> {
    console.log('🔍 [getAllScrapers] INÍCIO - Tentando ler scrapers...');
    try {
      // ✅ GARANTIR que DatabaseManager está inicializado
      console.log('🔍 [getAllScrapers] Verificando conexão com banco...');
      if (!this.databaseManager.isConnectedToDatabase()) {
        console.log('🔄 Inicializando DatabaseManager...');
        await this.databaseManager.initialize();
      }
      
      console.log('✅ [getAllScrapers] DatabaseManager conectado, executando query...');
      const query = `
        SELECT 
          scraper_id,
          scraper_name,
          status,
          last_heartbeat,
          last_activity,
          performance_metrics,
          created_at,
          updated_at
        FROM scraper_status 
        ORDER BY created_at ASC
      `;
      
      console.log('📊 [getAllScrapers] Executando query no PostgreSQL...');
      const result = await this.databaseManager.query(query);
      console.log(`🎯 [getAllScrapers] Query retornou ${result.rows.length} linhas`);
      
      const scrapers: ScraperData[] = [];
      
      for (const row of result.rows) {
        const scraperId = row.scraper_id;
        const lastHeartbeat = row.last_heartbeat ? new Date(row.last_heartbeat).getTime() : 0;
        const lastActivity = row.last_activity ? new Date(row.last_activity).getTime() : 0;
        
        // Determinar status atual baseado nos timestamps do banco
        const status = this.determineScraperStatusFromDatabase(lastHeartbeat, lastActivity);
        
        // Extrair métricas do performance_metrics JSON
        let metrics = {
          successRate: 0,
          ridesScraped: 0,
          driversScraped: 0,
          errorsCount: 0,
          responseTimeMs: 0
        };

        if (row.performance_metrics) {
          try {
            const dbMetrics = typeof row.performance_metrics === 'string' 
              ? JSON.parse(row.performance_metrics) 
              : row.performance_metrics;
            
            metrics = {
              successRate: dbMetrics.successRate || 0,
              ridesScraped: dbMetrics.ridesScraped || 0,
              driversScraped: dbMetrics.driversScraped || 0,
              errorsCount: dbMetrics.errorsCount || 0,
              responseTimeMs: 0 // Pode ser adicionado depois
            };
          } catch (error) {
            console.warn(`⚠️ Erro ao parsear métricas para ${scraperId}:`, error);
          }
        }
        
        const scraperData: ScraperData = {
          id: scraperId,
          name: row.scraper_name || `Scraper ${scraperId}`,
          status: status,
          lastHeartbeat: lastHeartbeat,
          lastActivity: lastActivity,
          metrics: metrics
        };
        
        scrapers.push(scraperData);
      }

      console.log(`✅ [getAllScrapers] SUCESSO - Processados ${scrapers.length} scrapers do banco`);
      return scrapers;
    } catch (error) {
      console.error('❌ [getAllScrapers] ERRO ao buscar scrapers do banco:', error);
      console.log('🔄 [getAllScrapers] FALLBACK - Usando memória local...');
      // Fallback para dados locais em caso de erro
      return this.getAllScrapersFromMemory();
    }
  }

  /**
   * 📋 Fallback: Obter scrapers da memória local
   */
  private getAllScrapersFromMemory(): ScraperData[] {
    console.log('🧠 [getAllScrapersFromMemory] INÍCIO - Lendo da memória local...');
    const scrapers: ScraperData[] = [];
    
    console.log(`🧠 [getAllScrapersFromMemory] Scrapers na memória: ${this.scraperData.size}`);
    for (const [scraperId, scraper] of this.scraperData) {
      console.log(`🧠 [getAllScrapersFromMemory] Processando scraper: ${scraperId}`);
      // Atualizar status antes de retornar
      scraper.status = this.determineScraperStatus(scraperId);
      scrapers.push({ ...scraper });
    }

    return scrapers;
  }

  /**
   * 🎯 Determinar status do scraper baseado nos dados do banco
   */
  private determineScraperStatusFromDatabase(lastHeartbeat: number, lastActivity: number): ScraperStatus {
    const now = Date.now();

    // 1. VERIFICAÇÃO CRÍTICA: Heartbeat (15 min timeout)
    const heartbeatAge = lastHeartbeat > 0 ? now - lastHeartbeat : Infinity;
    const isHeartbeatAlive = heartbeatAge < 15 * 60 * 1000; // 15 minutos

    if (!isHeartbeatAlive) {
      return ScraperStatus.OFFLINE;
    }

    // 2. VERIFICAÇÃO DE ATIVIDADE: Se há atividade recente, está ativo
    const activityAge = lastActivity > 0 ? now - lastActivity : Infinity;
    const isActive = activityAge < 30 * 60 * 1000; // 30 minutos

    if (isActive) {
      return ScraperStatus.ONLINE_ACTIVE;
    }

    // 3. VERIFICAÇÃO DE INÍCIO: Scrapers novos (< 5 min) começam como STARTING
    const startupAge = lastHeartbeat > 0 ? now - lastHeartbeat : Infinity;
    const isStarting = startupAge < 5 * 60 * 1000; // 5 minutos

    if (isStarting && lastActivity === 0) {
      return ScraperStatus.STARTING;
    }

    // 4. DEFAULT: Online mas idle
    return ScraperStatus.ONLINE_IDLE;
  }

  /**
   * 🎯 Obter scraper específico
   */
  public getScraper(scraperId: string): ScraperData | null {
    const scraper = this.scraperData.get(scraperId);
    if (!scraper) return null;

    // Atualizar status antes de retornar
    scraper.status = this.determineScraperStatus(scraperId);
    return { ...scraper };
  }

  /**
   * 📈 Obter histórico de status
   */
  public getStatusHistory(scraperId: string, limit: number = 50): StatusUpdate[] {
    const history = this.statusHistory.get(scraperId) || [];
    return history.slice(-limit);
  }

  /**
   * 🔧 Registrar novo scraper dinamicamente
   */
  public registerScraper(scraperId: string, name: string): void {
    if (!this.scraperData.has(scraperId)) {
      this.scraperData.set(scraperId, {
        id: scraperId,
        name,
        status: ScraperStatus.STARTING,
        lastHeartbeat: Date.now(),
        lastActivity: 0,
        metrics: {
          successRate: 0,
          ridesScraped: 0,
          driversScraped: 0,
          errorsCount: 0,
          responseTimeMs: 0
        },
        startTime: Date.now()
      });
      this.statusHistory.set(scraperId, []);
      
      console.log(`📊 [StatusService] Registered new scraper: ${scraperId} (${name})`);
    }
  }

  /**
   * 📊 Obter estatísticas gerais
   */
  public async getOverallStats() {
    const scrapers = await this.getAllScrapers();
    const totalScrapers = scrapers.length;
    const onlineScrapers = scrapers.filter(s => 
      s.status === ScraperStatus.ONLINE_ACTIVE || 
      s.status === ScraperStatus.ONLINE_IDLE
    ).length;
    const activeScrapers = scrapers.filter(s => 
      s.status === ScraperStatus.ONLINE_ACTIVE
    ).length;
    const offlineScrapers = scrapers.filter(s => 
      s.status === ScraperStatus.OFFLINE
    ).length;
    const errorScrapers = scrapers.filter(s => 
      s.status === ScraperStatus.ERROR
    ).length;

    const totalRides = scrapers.reduce((sum, s) => sum + s.metrics.ridesScraped, 0);
    const totalDrivers = scrapers.reduce((sum, s) => sum + s.metrics.driversScraped, 0);
    const totalErrors = scrapers.reduce((sum, s) => sum + s.metrics.errorsCount, 0);

    return {
      totalScrapers,
      onlineScrapers,
      activeScrapers,
      offlineScrapers,
      errorScrapers,
      totalRides,
      totalDrivers,
      totalErrors,
      overallSuccessRate: totalErrors > 0 ? 
        ((totalRides + totalDrivers) / (totalRides + totalDrivers + totalErrors)) * 100 : 100
    };
  }
}
