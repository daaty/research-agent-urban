/**
 * 🎛️ DASHBOARD CONTROLLER
 * 
 * Controller principal do dashboard que integra com o MonitoringService existente
 * e fornece dados para a interface web.
 */

import { Request, Response } from 'express';
import { MonitoringService } from '../../services/monitoringService';
import { ScraperStatusService, ScraperStatus } from '../services/scraperStatusService';

export class DashboardController {
  private monitoring: MonitoringService;
  private statusService: ScraperStatusService;

  constructor() {
    this.monitoring = MonitoringService.getInstance();
    this.statusService = ScraperStatusService.getInstance();
    
    // Integrar com MonitoringService para receber updates
    this.setupMonitoringIntegration();
  }

  /**
   * 🔗 Integrar com o MonitoringService existente
   */
  private setupMonitoringIntegration(): void {
    // Registrar scraper atual baseado em RIDES_USERNAME
    const currentScraperId = this.getCurrentScraperId();
    const scraperName = process.env.RIDES_USERNAME || 'default-scraper';
    
    this.statusService.registerScraper(currentScraperId, scraperName);
    
    console.log(`🔗 [DashboardController] Integrated with scraper: ${currentScraperId} (${scraperName})`);
  }

  /**
   * 🆔 Obter ID do scraper atual
   */
  private getCurrentScraperId(): string {
    // Usar RIDES_USERNAME como base para ID único
    const username = process.env.RIDES_USERNAME || 'default';
    return `scraper-${Buffer.from(username).toString('base64').slice(0, 8)}`;
  }

  /**
   * 📊 GET /api/dashboard/status - Status geral do dashboard
   */
  public async getDashboardStatus(req: Request, res: Response): Promise<void> {
    try {
      const scrapers = await this.statusService.getAllScrapers();
      const overallStats = await this.statusService.getOverallStats();
      const webhookStatus = this.monitoring.getWebhookSystemStatus();

      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: {
          scrapers,
          stats: overallStats,
          webhookSystem: webhookStatus,
          environment: {
            nodeEnv: process.env.NODE_ENV || 'development',
            ridesUsername: process.env.RIDES_USERNAME,
            scrapeInterval: process.env.SCRAPE_INTERVAL || '5',
            headlessMode: process.env.HEADLESS_MODE,
            databaseConnected: true // TODO: Get from actual DB status
          }
        }
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error getting dashboard status:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get dashboard status',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🎯 GET /api/scrapers - Lista todos os scrapers
   */
  public async getScrapers(req: Request, res: Response): Promise<void> {
    try {
      const scrapers = await this.statusService.getAllScrapers();
      
      res.json({
        success: true,
        data: scrapers,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error getting scrapers:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scrapers',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🔍 GET /api/scrapers/:id - Detalhes de um scraper específico
   */
  public async getScraper(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const scraper = this.statusService.getScraper(id);

      if (!scraper) {
        res.status(404).json({
          success: false,
          error: 'Scraper not found',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const history = this.statusService.getStatusHistory(id, 20);

      res.json({
        success: true,
        data: {
          scraper,
          history
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error getting scraper:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get scraper details',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * ▶️ POST /api/scrapers/start - Iniciar monitoramento
   */
  public async startScraper(req: Request, res: Response): Promise<void> {
    try {
      // Iniciar monitoramento usando MonitoringService existente
      this.monitoring.startMonitoring();
      
      // Atualizar status
      const currentScraperId = this.getCurrentScraperId();
      this.statusService.updateActivity(currentScraperId);

      res.json({
        success: true,
        message: 'Scraper monitoring started',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error starting scraper:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to start scraper',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * ⏹️ POST /api/scrapers/stop - Parar monitoramento
   */
  public async stopScraper(req: Request, res: Response): Promise<void> {
    try {
      // Parar monitoramento usando MonitoringService existente
      this.monitoring.stopMonitoring();

      res.json({
        success: true,
        message: 'Scraper monitoring stopped',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error stopping scraper:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to stop scraper',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🔄 POST /api/scrapers/run-once - Executar scraping uma vez
   */
  public async runOnce(req: Request, res: Response): Promise<void> {
    try {
      // Executar scraping uma vez usando MonitoringService existente
      await this.monitoring.runOnce();
      
      // Atualizar atividade
      const currentScraperId = this.getCurrentScraperId();
      this.statusService.updateActivity(currentScraperId);

      res.json({
        success: true,
        message: 'Single scraping execution completed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error running once:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to execute single scraping',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 📊 GET /api/metrics - Métricas do sistema
   */
  public async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const retryMetrics = this.monitoring.getRetryMetrics();
      const dlqData = this.monitoring.getDeadLetterQueue();
      const overallStats = this.statusService.getOverallStats();

      res.json({
        success: true,
        data: {
          retry: retryMetrics,
          deadLetterQueue: {
            size: dlqData.length,
            items: dlqData
          },
          scrapers: overallStats
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error getting metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get metrics',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🔧 POST /api/system/reset-circuit-breaker - Reset circuit breaker
   */
  public async resetCircuitBreaker(req: Request, res: Response): Promise<void> {
    try {
      this.monitoring.resetCircuitBreaker();

      res.json({
        success: true,
        message: 'Circuit breaker reset successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error resetting circuit breaker:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset circuit breaker',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🔄 POST /api/system/process-dlq - Processar Dead Letter Queue
   */
  public async processDLQ(req: Request, res: Response): Promise<void> {
    try {
      await this.monitoring.processDLQ();

      res.json({
        success: true,
        message: 'Dead Letter Queue processed successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error processing DLQ:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process Dead Letter Queue',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🧹 POST /api/system/clear-dlq - Limpar Dead Letter Queue
   */
  public async clearDLQ(req: Request, res: Response): Promise<void> {
    try {
      const clearedCount = this.monitoring.clearDeadLetterQueue();

      res.json({
        success: true,
        message: `Cleared ${clearedCount} items from Dead Letter Queue`,
        data: { clearedCount },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error clearing DLQ:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear Dead Letter Queue',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 💓 POST /api/scrapers/heartbeat - Receber heartbeat
   */
  public async updateHeartbeat(req: Request, res: Response): Promise<void> {
    try {
      const currentScraperId = this.getCurrentScraperId();
      this.statusService.updateHeartbeat(currentScraperId);

      res.json({
        success: true,
        message: 'Heartbeat updated',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error updating heartbeat:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update heartbeat',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🏥 GET /api/health - Health check
   */
  public async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const currentScraperId = this.getCurrentScraperId();
      const scraper = this.statusService.getScraper(currentScraperId);
      const webhookStatus = this.monitoring.getWebhookSystemStatus();

      res.json({
        success: true,
        health: 'OK',
        data: {
          scraper: scraper ? {
            id: scraper.id,
            status: scraper.status,
            lastHeartbeat: scraper.lastHeartbeat
          } : null,
          webhook: webhookStatus,
          timestamp: new Date().toISOString(),
          uptime: process.uptime()
        }
      });
    } catch (error) {
      console.error('❌ [DashboardController] Error in health check:', error);
      res.status(500).json({
        success: false,
        health: 'ERROR',
        error: 'Health check failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🔄 Método para ser chamado pelo MonitoringService quando houver atividade
   */
  public reportScrapingActivity(metrics?: {
    ridesScraped?: number;
    driversScraped?: number;
    responseTimeMs?: number;
    success?: boolean;
  }): void {
    try {
      const currentScraperId = this.getCurrentScraperId();
      
      if (metrics?.success === false) {
        this.statusService.reportError(currentScraperId, 'Scraping failed');
      } else {
        this.statusService.updateActivity(currentScraperId, {
          ridesScraped: metrics?.ridesScraped,
          driversScraped: metrics?.driversScraped,
          responseTimeMs: metrics?.responseTimeMs
        });
      }
    } catch (error) {
      console.error('❌ [DashboardController] Error reporting activity:', error);
    }
  }

  /**
   * 🔄 POST /api/debug/reset-singleton - Resetar singleton para aplicar correções
   */
  public async resetSingleton(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔄 [DEBUG] Resetando ScraperStatusService singleton...');
      
      // Reset do singleton
      ScraperStatusService.resetInstance();
      
      // Nova instância
      this.statusService = ScraperStatusService.getInstance();
      
      // Re-registrar scraper atual
      const currentScraperId = this.getCurrentScraperId();
      const scraperName = process.env.RIDES_USERNAME || 'default-scraper';
      this.statusService.registerScraper(currentScraperId, scraperName);
      
      // Testar nova instância
      const scrapers = await this.statusService.getAllScrapers();
      
      res.json({
        success: true,
        message: 'Singleton resetado com sucesso',
        timestamp: new Date().toISOString(),
        scrapersFound: scrapers.length,
        scrapers: scrapers.map(s => ({
          id: s.id,
          name: s.name,
          status: s.status,
          rides: s.metrics.ridesScraped,
          drivers: s.metrics.driversScraped
        }))
      });
      
      console.log(`✅ [DEBUG] Singleton resetado! Encontrados ${scrapers.length} scrapers.`);
      
    } catch (error: any) {
      console.error('❌ [DEBUG] Erro ao resetar singleton:', error);
      res.status(500).json({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  }
}
