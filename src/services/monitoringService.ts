import * as cron from 'node-cron';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { scrapeAllRidesDataPersistent } from '../scraper/ridesPersistentScraper';
import { scrapeAllDriversDataPersistent } from '../scraper/driversPersistentScraper';
import { DriversDataTransformer } from './driversDataTransformer';
import { DataCacheManager } from './dataCacheManager'; // ⭐ INTEGRAR SISTEMA DE CACHE SOFISTICADO
import { DatabaseManager } from './databaseManager'; // ⭐ INTEGRAR SALVAMENTO NO BANCO

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
  private previousData: RideData[] = [];
  private dataFilePath: string;
  private isRunning: boolean = false;
  private cronTasks: any[] = [];
  private cacheManager: DataCacheManager; // ⭐ USAR SISTEMA DE CACHE SOFISTICADO
  private databaseManager: DatabaseManager; // ⭐ INTEGRAR SALVAMENTO NO BANCO

  constructor() {
    this.dataFilePath = path.join(__dirname, '../../data/previous-rides-data.json');
    this.cacheManager = DataCacheManager.getInstance(); // ⭐ INICIALIZAR CACHE MANAGER
    this.databaseManager = DatabaseManager.getInstance(); // ⭐ INICIALIZAR DATABASE MANAGER
    this.loadPreviousData();
    this.initializeDatabase(); // ⭐ INICIALIZAR CONEXÃO COM BANCO
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

      const payload = {
        ...result,
        hasChanges: result.summary.newCount > 0 || 
                   result.summary.updatedCount > 0 || 
                   result.summary.cancelledCount > 0 || 
                   result.summary.completedCount > 0,
        metadata: {
          scraperVersion: '3.0.0', // ⭐ ATUALIZAR VERSÃO
          source: 'rides-dashboard-monitoring-v3',
          environment: process.env.NODE_ENV || 'development',
          cacheSystemEnabled: true // ⭐ INDICAR QUE USA SISTEMA DE CACHE
        }
      };

      // ⭐ LÓGICA CORRETA: Só enviar se há mudanças (sem spam de requests)
      if (!payload.hasChanges) {
        console.log('⏭️ Pulando envio para n8n (sem mudanças detectadas pelo sistema de cache)');
        return;
      }

      console.log(`🚀 Enviando para n8n: ${JSON.stringify(result.summary)}`);
      
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Rides-Scraper-Bot/3.0.0'
        },
        timeout: 30000
      });

      console.log(`✅ Dados enviados para n8n: ${response.status}`);    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('⚠️ n8n webhook não encontrado (404) - Verifique se o workflow está ativo');
      } else {
        console.error('❌ Erro ao enviar para n8n:', error instanceof Error ? error.message : error);
      }
    }
  }

  private async performScraping(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Scraping já em execução, pulando...');
      return;
    }

    this.isRunning = true;
    console.log(`🕐 [${new Date().toLocaleString()}] Iniciando scraping (rides + drivers)...`);
    
    try {
      // ⭐ VERIFICAR SE O BANCO ESTÁ CONECTADO
      if (!this.databaseManager.isConnectedToDatabase()) {
        console.log('⚠️ Banco de dados não conectado, tentando reconectar...');
        await this.databaseManager.initialize();
      }

      // 1. EXECUTAR SCRAPING DE RIDES
      console.log('🚗 Executando scraping de rides...');
      const scrapingResult = await scrapeAllRidesDataPersistent();
      
      if (!scrapingResult.success || !scrapingResult.data || scrapingResult.data.length === 0) {
        console.log('⚠️ Nenhum dado de rides extraído:', scrapingResult.message);
        return;
      }

      // Converter dados de tabelas para array plano
      const rawData: any[] = [];
      scrapingResult.data.forEach((table: any) => {
        if (!table.isEmpty && table.rows.length > 0) {
          table.rows.forEach((row: any) => {
            const rowData: any = {};
            table.headers.forEach((header: any, index: number) => {
              rowData[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
            });
            rowData.table_name = table.name;
            rawData.push(rowData);
          });
        }
      });

      // ⭐ USAR SISTEMA DE CACHE SOFISTICADO - detectar mudanças nos dados de tabela originais
      const changes = this.detectChanges(scrapingResult.data);

      // ⭐ SALVAR DADOS DE RIDES NO BANCO DE DADOS
      if (rawData.length > 0) {
        console.log(`💾 Salvando ${rawData.length} registros de rides no banco de dados...`);
        
        try {
          // Transformar rawData para formato RideRecord
          const rideRecords = rawData.map(ride => ({
            table_name: ride.table_name || 'unknown',
            data_hash: this.generateDataHash(ride),
            ride_data: ride,
            session_info: scrapingResult.sessionInfo || {},
            source: 'monitoring-service'
          }));
          
          await this.databaseManager.insertRideData(rideRecords);
          console.log(`✅ Dados de rides salvos no banco de dados`);
        } catch (ridesError) {
          console.error('❌ Erro ao salvar dados de rides:', ridesError);
          // Continuar execução mesmo se rides falharem
        }
      } else {
        console.log('⚠️ Nenhum dado de rides para salvar no banco');
      }

      // 2. EXECUTAR SCRAPING DE DRIVERS (usando a mesma sessão do browser)
      console.log('👥 Executando scraping de drivers...');
      const driversResult = await scrapeAllDriversDataPersistent();
      
      let driversTransformed = null;
      if (driversResult.success && driversResult.data && driversResult.data.length > 0) {
        console.log(`📊 Dados de drivers extraídos: ${driversResult.data.reduce((sum, table) => sum + table.rows.length, 0)} registros`);
        
        try {
          // Transformar e salvar dados de drivers (usando sessionInfo das rides)
          const driversTransformer = DriversDataTransformer.getInstance();
          driversTransformed = await driversTransformer.transformAndSave(
            driversResult.data,
            scrapingResult.sessionInfo || driversResult.sessionInfo, // Usar sessionInfo das rides preferencialmente
            'drivers-monitoring-service',
            driversResult.hasChanges || false
          );
          console.log(`✅ Dados de drivers processados com sucesso`);
        } catch (driversError) {
          console.error('❌ Erro ao processar dados de drivers:', driversError);
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

      // Log dados de drivers
      if (driversTransformed) {
        console.log(`👥 Drivers processados: ${driversTransformed.totalRecords} registros`);
        if (driversTransformed.newRecords > 0) {
          console.log(`🆕 Novos registros de drivers: ${driversTransformed.newRecords}`);
        }
      }

      // Enviar para n8n (apenas quando há mudanças - evita spam)
      await this.sendToN8n(changes);

      console.log(`✅ [${new Date().toLocaleString()}] Scraping concluído (rides + drivers)`);
    } catch (error) {
      console.error('❌ Erro durante scraping:', error);
    } finally {
      this.isRunning = false;
    }
  }

  public startMonitoring(): void {
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
  }

  public async runOnce(): Promise<void> {
    console.log('🔄 Executando scraping único...');
    await this.performScraping();
  }
}

export { MonitoringService, RideData, MonitoringResult };
