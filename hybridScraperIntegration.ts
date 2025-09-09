/**
 * 🔗 HYBRID SCRAPER DASHBOARD INTEGRATION
 * 
 * Registra o híbrido diretamente na tabela PostgreSQL que o dashboard lê.
 * INDEPENDENTE do dashboard - apenas escreve na tabela scraper_status.
 */

import { RidesDashboardHybridScraper } from './src/scraper/RidesDashboardHybridScraper';
import { HybridOperationService } from './src/services/hybridOperationServiceV2';
import { DatabaseManager } from './src/services/databaseManager';

export class HybridScraperDashboardIntegration {
  private hybridScraper: RidesDashboardHybridScraper;
  private operationService: HybridOperationService;
  private scraperId: string;
  private scraperName: string;
  private databaseManager: DatabaseManager;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Métricas para dashboard
  private metrics = {
    ridesScraped: 0,
    driversScraped: 0,
    errorsCount: 0,
    successRate: 100,
    responseTimeMs: 0
  };

  constructor() {
    // Gerar ID único baseado no username
    const username = process.env.RIDES_USERNAME || 'hybrid-scraper';
    this.scraperId = `hybrid-${Buffer.from(username).toString('base64').slice(0, 8)}`;
    this.scraperName = `Hybrid Scraper (${username})`;
    
    // Inicializar serviços
    this.hybridScraper = new RidesDashboardHybridScraper();
    this.operationService = HybridOperationService.getInstance({
      extractionBatchSize: 1,
      rechargePauseThreshold: 1,
      maxConcurrentRecharges: 3,
      stateCheckInterval: 8000,
      recoveryOnStart: true,
      autoFeedInterval: 60000,
      citiesRefreshInterval: 300000
    });
    
    // Inicializar DatabaseManager
    this.databaseManager = DatabaseManager.getInstance();
    
    // Registrar no PostgreSQL diretamente
    this.registerInDatabase();
    
    console.log(`🔗 [HybridIntegration] Initialized scraper: ${this.scraperId}`);
  }

  /**
   * 📊 Registrar scraper diretamente no PostgreSQL
   */
  private async registerInDatabase(): Promise<void> {
    try {
      // Garantir que DatabaseManager está inicializado
      if (!this.databaseManager.isConnectedToDatabase()) {
        await this.databaseManager.initialize();
      }

      // Criar/atualizar registro na tabela scraper_status
      const insertQuery = `
        INSERT INTO scraper_status (
          scraper_id, 
          scraper_name, 
          status, 
          last_heartbeat,
          last_activity,
          performance_metrics,
          created_at,
          updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        ON CONFLICT (scraper_id) 
        DO UPDATE SET
          scraper_name = EXCLUDED.scraper_name,
          status = EXCLUDED.status,
          last_heartbeat = EXCLUDED.last_heartbeat,
          last_activity = EXCLUDED.last_activity,
          performance_metrics = EXCLUDED.performance_metrics,
          updated_at = NOW();
      `;

      // Usar conexão direta para inserir na tabela scraper_status
      if (!this.databaseManager['pool']) {
        throw new Error('Database pool is not initialized');
      }

      const performanceMetrics = {
        lastUpdate: new Date().toISOString(),
        ridesScraped: this.metrics.ridesScraped,
        driversScraped: this.metrics.driversScraped,
        errorsCount: this.metrics.errorsCount,
        successRate: this.metrics.successRate,
        responseTimeMs: this.metrics.responseTimeMs
      };

      const pool = this.databaseManager['pool'];
      await pool.query(insertQuery, [
        this.scraperId,
        this.scraperName,
        'ONLINE_ACTIVE',
        new Date(),
        new Date(),
        JSON.stringify(performanceMetrics)
      ]);
      
      console.log(`✅ [HybridIntegration] Registered in database: ${this.scraperId}`);
      
      // Iniciar heartbeat para atualizar métricas
      this.startHeartbeat();

    } catch (error) {
      console.error('❌ [HybridIntegration] Failed to register in database:', error);
    }
  }

  /**
   * 🔄 Atualizar métricas no banco na tabela scraper_status
   */
  private async updateMetricsInDatabase(): Promise<void> {
    try {
      if (!this.databaseManager['pool']) {
        return;
      }

      const updateQuery = `
        UPDATE scraper_status 
        SET 
          status = $1,
          last_heartbeat = $2,
          last_activity = $3,
          performance_metrics = $4,
          updated_at = NOW()
        WHERE scraper_id = $5;
      `;

      const performanceMetrics = {
        lastUpdate: new Date().toISOString(),
        ridesScraped: this.metrics.ridesScraped,
        driversScraped: this.metrics.driversScraped,
        errorsCount: this.metrics.errorsCount,
        successRate: this.metrics.successRate,
        responseTimeMs: this.metrics.responseTimeMs
      };

      const pool = this.databaseManager['pool'];
      await pool.query(updateQuery, [
        'ONLINE_ACTIVE',
        new Date(),
        new Date(),
        JSON.stringify(performanceMetrics),
        this.scraperId
      ]);

      console.log(`� [HybridIntegration] Updated metrics for: ${this.scraperId}`);
    } catch (error) {
      console.error('❌ [HybridIntegration] Failed to update metrics:', error);
    }
  }

  /**
   * 💓 Iniciar heartbeat para atualização de métricas
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Heartbeat a cada 30 segundos
    this.heartbeatInterval = setInterval(() => {
      // Atualizar métricas no banco
      this.updateMetricsInDatabase();
    }, 30000);

    console.log(`💓 [HybridIntegration] Heartbeat started for ${this.scraperId}`);
  }

  /**
   * ⚡ Notificar atividade (atualizar métricas locais)
   */
  private notifyActivity(type: 'ride' | 'driver' | 'recharge' | 'error', details?: any): void {
    try {
      // Atualizar métricas baseado no tipo
      switch (type) {
        case 'ride':
          this.metrics.ridesScraped++;
          break;
        case 'driver':
          this.metrics.driversScraped++;
          break;
        case 'recharge':
          // Recharge é considerado uma operação de driver bem-sucedida
          this.metrics.driversScraped++;
          break;
        case 'error':
          this.metrics.errorsCount++;
          break;
      }

      // Calcular taxa de sucesso
      const total = this.metrics.ridesScraped + this.metrics.driversScraped + this.metrics.errorsCount;
      this.metrics.successRate = total > 0 ? ((this.metrics.ridesScraped + this.metrics.driversScraped) / total) * 100 : 100;

      // Log da atividade
      console.log(`📊 [HybridIntegration] Activity: ${type}, Metrics:`, this.metrics);

      // Força atualização imediata no banco para operações críticas
      if (type === 'error' || (details && details.forceUpdate)) {
        this.updateMetricsInDatabase().catch(err => 
          console.warn('⚠️ Failed to force update metrics:', err)
        );
      }

    } catch (error) {
      console.warn('⚠️ [HybridIntegration] Failed to notify activity:', error);
    }
  }

  /**
   * 🎯 Executar operação de extração com integração ao dashboard
   */
  public async performExtraction(driverIds: string[]): Promise<any[]> {
    console.log(`🚀 [HybridIntegration] Starting extraction for ${driverIds.length} drivers`);
    
    const results: any[] = [];
    const startTime = Date.now();

    try {
      // Notificar início da atividade
      this.notifyActivity('driver', { action: 'extraction_start', count: driverIds.length });

      // Inicializar o scraper se necessário
      await this.hybridScraper.initialize();

      for (const driverId of driverIds) {
        try {
          console.log(`🔍 [HybridIntegration] Processing driver: ${driverId}`);
          
          // Usar o scraper híbrido diretamente
          const driverData = await this.hybridScraper.extractDriverData(driverId);
          
          if (driverData) {
            results.push(driverData);
            this.notifyActivity('driver', { driverId, success: true });
            console.log(`✅ [HybridIntegration] Successfully processed driver: ${driverId}`);
          } else {
            console.warn(`⚠️ [HybridIntegration] No data for driver: ${driverId}`);
          }

          // Delay entre drivers para simular comportamento humano
          await this.delay(3000 + Math.random() * 2000);

        } catch (error) {
          console.error(`❌ [HybridIntegration] Error processing driver ${driverId}:`, error);
          this.notifyActivity('error', { driverId, error: error.message });
        }
      }

      // Calcular tempo de resposta médio
      this.metrics.responseTimeMs = Math.round((Date.now() - startTime) / driverIds.length);

      console.log(`🎯 [HybridIntegration] Extraction completed: ${results.length}/${driverIds.length} drivers processed`);
      return results;

    } catch (error) {
      console.error('❌ [HybridIntegration] Critical error during extraction:', error);
      this.notifyActivity('error', { critical: true, error: error.message });
      throw error;
    }
  }

  /**
   * 💰 Executar operação de recarga com integração ao dashboard
   */
  public async performRecharge(driverId: string, amount: number): Promise<boolean> {
    console.log(`💰 [HybridIntegration] Starting recharge: Driver ${driverId}, Amount ${amount}`);
    
    const startTime = Date.now();
    
    try {
      // Usar o scraper híbrido diretamente
      const success = await this.hybridScraper.processRecharge(driverId, amount);
      
      // Calcular tempo da operação
      this.metrics.responseTimeMs = Math.round((Date.now() - startTime));
      
      if (success) {
        this.notifyActivity('recharge', { 
          driverId, 
          amount, 
          success: true, 
          responseTime: this.metrics.responseTimeMs,
          forceUpdate: true // Força atualização imediata no banco
        });
        console.log(`✅ [HybridIntegration] Recharge successful: Driver ${driverId}`);
      } else {
        this.notifyActivity('error', { 
          driverId, 
          amount, 
          error: 'Recharge failed',
          forceUpdate: true 
        });
        console.warn(`⚠️ [HybridIntegration] Recharge failed: Driver ${driverId}`);
      }

      return success;

    } catch (error) {
      console.error(`❌ [HybridIntegration] Error during recharge for driver ${driverId}:`, error);
      this.notifyActivity('error', { 
        driverId, 
        amount, 
        error: error.message,
        forceUpdate: true 
      });
      return false;
    }
  }

  /**
   * 📊 Obter métricas atuais
   */
  public getMetrics() {
    return { ...this.metrics };
  }

  /**
   * 🆔 Obter ID do scraper
   */
  public getScraperId(): string {
    return this.scraperId;
  }

  /**
   * 🏷️ Obter nome do scraper
   */
  public getScraperName(): string {
    return this.scraperName;
  }

  /**
   * 🛑 Finalizar integração (cleanup)
   */
  public destroy(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.hybridScraper) {
      // Cleanup do browser se necessário
      // this.hybridScraper.close();
    }

    console.log(`🛑 [HybridIntegration] Destroyed scraper: ${this.scraperId}`);
  }

  /**
   * ⏱️ Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton para usar globalmente
let hybridIntegration: HybridScraperDashboardIntegration | null = null;

export function getHybridScraperIntegration(): HybridScraperDashboardIntegration {
  if (!hybridIntegration) {
    hybridIntegration = new HybridScraperDashboardIntegration();
  }
  return hybridIntegration;
}

export function destroyHybridScraperIntegration(): void {
  if (hybridIntegration) {
    hybridIntegration.destroy();
    hybridIntegration = null;
  }
}
