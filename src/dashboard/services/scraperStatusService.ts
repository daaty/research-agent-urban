/**
 * 📊 SCRAPER STATUS SERVICE
 * 
 * Serviço responsável por determinar o status dos scrapers
 * e fornecer dados para o dashboard em tempo real.
 * 
 * Status Types:
 * - 🟢 ONLINE_ACTIVE: Heartbeat OK + Atividade recente
 * - 🟡 ONLINE_IDLE: Heartbeat OK + Sem atividade recente  
 * - 🔴 OFFLINE: Sem heartbeat há > 15 minutos
 * - ⚫ ERROR: Erros frequentes detectados
 * - 🔵 STARTING: Iniciando (primeiros 5 minutos)
 */

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
  private static instance: ScraperStatusService;
  private scraperData: Map<string, ScraperData> = new Map();
  private statusHistory: Map<string, StatusUpdate[]> = new Map();

  private constructor() {
    this.initializeDefaultScrapers();
  }

  public static getInstance(): ScraperStatusService {
    if (!ScraperStatusService.instance) {
      ScraperStatusService.instance = new ScraperStatusService();
    }
    return ScraperStatusService.instance;
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
   */
  public getAllScrapers(): ScraperData[] {
    const scrapers: ScraperData[] = [];
    
    for (const [scraperId, scraper] of this.scraperData) {
      // Atualizar status antes de retornar
      scraper.status = this.determineScraperStatus(scraperId);
      scrapers.push({ ...scraper });
    }

    return scrapers;
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
  public getOverallStats() {
    const scrapers = this.getAllScrapers();
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
