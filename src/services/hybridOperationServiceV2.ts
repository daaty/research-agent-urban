import { DriverIdQueue } from '../queue/driverIdQueue';
import { RechargeQueue } from '../queue/rechargeQueue';
import { OperationStateManager } from '../queue/operationStateManager';
import { DriverIdProvider, DriverInfo } from './driverIdProvider';
import { RidesDashboardHybridScraper } from '../scraper/RidesDashboardHybridScraper';
import { logger } from '../utils/logger';

export interface HybridOperationConfig {
  extractionBatchSize: number;
  rechargePauseThreshold: number;
  maxConcurrentRecharges: number;
  stateCheckInterval: number;
  recoveryOnStart: boolean;
  autoFeedInterval: number; // Intervalo para buscar novos IDs automaticamente
  citiesRefreshInterval: number; // Intervalo para atualizar cache das cidades
}

export interface HybridOperationStats {
  totalExtracted: number;
  totalRecharges: number;
  currentMode: 'extraction' | 'recharge' | 'idle';
  uptime: number;
  lastInterruption: Date | null;
  errorCount: number;
  successRate: number;
}

/**
 * Serviço principal de operação híbrida
 * Orquestra entre extração de dados pessoais e recargas de crédito
 */
export class HybridOperationService {
  private static instance: HybridOperationService;
  private driverQueue: DriverIdQueue;
  private rechargeQueue: RechargeQueue;
  private stateManager: OperationStateManager;
  private driverIdProvider: DriverIdProvider;
  private dashboardScraper: RidesDashboardHybridScraper;
  
  private isRunning: boolean = false;
  private currentMode: 'extraction' | 'recharge' | 'idle' = 'idle';
  private stats: HybridOperationStats;
  private config: HybridOperationConfig;
  private operationInterval: NodeJS.Timeout | null = null;
  private autoFeedInterval: NodeJS.Timeout | null = null;
  private isLoadingIds: boolean = false; // Flag para evitar conflitos
  private rechargeResults: Map<string, any> = new Map(); // Armazenar resultados das recargas

  private constructor(config: HybridOperationConfig) {
    this.config = config;
    this.driverQueue = DriverIdQueue.getInstance();
    this.rechargeQueue = RechargeQueue.getInstance();
    this.stateManager = OperationStateManager.getInstance();
    this.driverIdProvider = DriverIdProvider.getInstance();
    this.dashboardScraper = new RidesDashboardHybridScraper('hybrid_scraper');
    
    this.stats = {
      totalExtracted: 0,
      totalRecharges: 0,
      currentMode: 'idle',
      uptime: 0,
      lastInterruption: null,
      errorCount: 0,
      successRate: 100
    };
  }

  public static getInstance(config?: HybridOperationConfig): HybridOperationService {
    if (!HybridOperationService.instance) {
      const defaultConfig: HybridOperationConfig = {
        extractionBatchSize: 1,      // ✅ Processar 1 por vez para evitar conflitos
        rechargePauseThreshold: 1,
        maxConcurrentRecharges: 1,   // ✅ Apenas 1 recarga simultânea também
        stateCheckInterval: 8000,    // ✅ Verificar estado a cada 8 segundos
        recoveryOnStart: true,
        autoFeedInterval: 300000,    // 5 minutos
        citiesRefreshInterval: 1800000 // 30 minutos
      };
      
      HybridOperationService.instance = new HybridOperationService(config || defaultConfig);
    }
    return HybridOperationService.instance;
  }

  /**
   * Inicia operação híbrida
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      logger.warn('HYBRID', 'Operação híbrida já está rodando');
      return;
    }

    logger.info('HYBRID', 'Iniciando sistema de operação híbrida...');

    try {
      // Inicializar navegador e login do dashboard híbrido já no início
      logger.info('HYBRID', 'Inicializando navegador do sistema híbrido...');
      await this.dashboardScraper.initialize();
      logger.success('HYBRID', 'Navegador do sistema híbrido inicializado');

      // Verificar recuperação de estado
      if (this.config.recoveryOnStart) {
        logger.debug('HYBRID', 'Verificando recuperação de estado...');
        await this.checkRecovery();
      }

      // Buscar IDs iniciais das APIs
      logger.debug('HYBRID', 'Buscando IDs iniciais das APIs...');
      await this.loadInitialDriverIds();

      // Iniciar loop principal
      this.isRunning = true;
      this.startOperationLoop();
      logger.debug('HYBRID', 'Loop principal iniciado');

      // Iniciar alimentação automática de IDs
      this.startAutoFeed();
      logger.debug('HYBRID', 'Alimentação automática de IDs iniciada');

      logger.success('HYBRID', `Sistema híbrido iniciado - batch=${this.config.extractionBatchSize}, threshold=${this.config.rechargePauseThreshold}`);

    } catch (error) {
      logger.error('HYBRID', 'Erro ao iniciar sistema híbrido', error);
      throw error;
    }
  }

  /**
   * Para operação híbrida
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      logger.warn('HYBRID', 'Operação híbrida não está rodando');
      return;
    }

    logger.warn('HYBRID', 'Parando sistema de operação híbrida...');
    
    this.isRunning = false;
    
    if (this.operationInterval) {
      clearInterval(this.operationInterval);
      this.operationInterval = null;
    }

    if (this.autoFeedInterval) {
      clearInterval(this.autoFeedInterval);
      this.autoFeedInterval = null;
    }
    
    // Salvar estado final
    this.stateManager.saveState();
    
    logger.info('HYBRID', 'Sistema híbrido parado com sucesso');
  }

  /**
   * Carrega IDs iniciais das APIs
   */
  private async loadInitialDriverIds(): Promise<void> {
    if (this.isLoadingIds) {
      logger.debug('HYBRID', 'Carregamento de IDs já em andamento, pulando...');
      return;
    }
    
    this.isLoadingIds = true;
    logger.debug('HYBRID', 'Carregando IDs iniciais das dashboards...');
    
    try {
      // 1. Primeiro tentar extrair IDs reais da dashboard Active Drivers
      logger.debug('HYBRID', 'Tentando extrair IDs reais da página Active Drivers...');
      
      try {
        await this.ensureDashboardReady();
        const realDriverIds = await this.dashboardScraper.extractAllDriverIds();
        
        if (realDriverIds && realDriverIds.length > 0) {
          logger.success('HYBRID', `${realDriverIds.length} IDs reais extraídos da dashboard Active Drivers`);
          
          // Adicionar IDs reais com prioridade alta
          this.driverQueue.addDriverIds(realDriverIds, 'high');
          
          logger.info('HYBRID', `IDs da dashboard carregados: ${realDriverIds.length} IDs reais (alta prioridade)`);
          return; // Sucesso, não precisa buscar nas APIs
        }
      } catch (dashboardError: any) {
        logger.warn('HYBRID', `Erro ao extrair IDs da dashboard: ${dashboardError.message}`);
        logger.debug('HYBRID', 'Tentando fallback para APIs das cidades...');
      }
      
      // 2. Fallback: usar APIs das cidades
      const drivers = await this.driverIdProvider.getAllDriverIds();
      
      if (drivers.length > 0) {
        // Separar por prioridade
        const highPriorityIds = drivers.filter(d => d.priority === 'high').map(d => d.id);
        const normalPriorityIds = drivers.filter(d => d.priority === 'normal').map(d => d.id);
        
        // Adicionar à fila
        if (highPriorityIds.length > 0) {
          this.driverQueue.addDriverIds(highPriorityIds, 'high');
        }
        if (normalPriorityIds.length > 0) {
          this.driverQueue.addDriverIds(normalPriorityIds, 'normal');
        }
        
        logger.info('HYBRID', `IDs das APIs carregados: ${highPriorityIds.length} alta prioridade, ${normalPriorityIds.length} normal`);
      } else {
        logger.warn('HYBRID', 'Nenhum ID encontrado nas APIs, sistema funcionará apenas com recargas');
      }
      
    } catch (error) {
      logger.error('HYBRID', 'Erro ao carregar IDs iniciais', error);
    } finally {
      this.isLoadingIds = false;
    }
  }

  /**
   * Inicia alimentação automática de IDs
   */
  private startAutoFeed(): void {
    this.autoFeedInterval = setInterval(async () => {
      if (!this.isRunning) return;
      
      // Não executar se já estiver carregando IDs
      if (this.isLoadingIds) {
        logger.debug('HYBRID', 'Auto-feed: aguardando carregamento principal terminar...');
        return;
      }
      
      try {
        logger.debug('HYBRID', 'Alimentação automática: buscando novos IDs...');
        const currentStats = this.driverQueue.getStats();
        
        // Só buscar novos IDs se a fila estiver baixa
        if (currentStats.total < this.config.extractionBatchSize * 2) {
          logger.debug('HYBRID', 'Fila baixa, buscando novos IDs...');
          
          // Marcar que estamos carregando IDs
          this.isLoadingIds = true;
          
          try {
            // 1. Primeiro tentar extrair IDs reais da dashboard
            logger.debug('HYBRID', 'Extraindo IDs atuais da dashboard...');
            const realDriverIds = await this.dashboardScraper.extractAllDriverIds();
            
            if (realDriverIds && realDriverIds.length > 0) {
              // Filtrar IDs que já não estão na fila
              const currentIds = this.driverQueue.getAllIds();
              const newIds = realDriverIds.filter(id => !currentIds.includes(id));
              
              if (newIds.length > 0) {
                this.driverQueue.addDriverIds(newIds, 'high');
                logger.info('HYBRID', `Auto-feed: ${newIds.length} novos IDs reais da dashboard adicionados`);
              } else {
                logger.debug('HYBRID', 'Todos os IDs da dashboard já estão na fila');
              }
              return; // Sucesso com IDs reais
            }
          } catch (dashboardError: any) {
            logger.warn('HYBRID', `Auto-feed: erro ao extrair da dashboard: ${dashboardError.message}`);
            
            // 2. Fallback: usar APIs das cidades APENAS se dashboard falhou
            logger.debug('HYBRID', 'Auto-feed: usando fallback das APIs...');
            const drivers = await this.driverIdProvider.getAllDriverIds();
            
            if (drivers.length > 0) {
              const highPriorityIds = drivers.filter(d => d.priority === 'high').map(d => d.id);
              const normalPriorityIds = drivers.filter(d => d.priority === 'normal').map(d => d.id);
              
              if (highPriorityIds.length > 0) {
                this.driverQueue.addDriverIds(highPriorityIds, 'high');
              }
              if (normalPriorityIds.length > 0) {
                this.driverQueue.addDriverIds(normalPriorityIds, 'normal');
              }
              
              logger.debug('HYBRID', `Auto-feed: ${drivers.length} novos IDs das APIs adicionados (fallback)`);
            }
          } finally {
            this.isLoadingIds = false;
          }
        }
        
      } catch (error) {
        this.isLoadingIds = false;
        logger.error('HYBRID', 'Erro na alimentação automática', error);
      }
    }, this.config.autoFeedInterval);
  }

  /**
   * Verifica e executa recuperação de estado
   */
  private async checkRecovery(): Promise<void> {
    const recovery = this.stateManager.getRecoveryInfo();
    
    if (recovery.shouldRecover) {
      logger.info('HYBRID', 'Estado de recuperação detectado:');
      logger.info('HYBRID', `   - ID atual: ${recovery.currentDriverId || 'nenhum'}`);
      logger.info('HYBRID', `   - Total processado: ${recovery.totalProcessed}`);
      logger.info('HYBRID', `   - Última gravação: ${recovery.lastSavedMinutesAgo.toFixed(1)} min atrás`);
      
      // Carregar estado das filas
      await this.loadQueueStates();
    }
  }

  /**
   * Carrega estados das filas
   */
  private async loadQueueStates(): Promise<void> {
    logger.debug('HYBRID', 'Carregando estados das filas...');
  }

  /**
   * Loop principal de operação
   */
  private startOperationLoop(): void {
    this.operationInterval = setInterval(async () => {
      if (!this.isRunning) return;

      try {
        await this.processOperationCycle();
      } catch (error) {
        logger.error('HYBRID', 'Erro no ciclo de operação', error);
        this.stats.errorCount++;
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.stateManager.setLastError(errorMessage);
      }
    }, this.config.stateCheckInterval);
  }

  /**
   * Processa um ciclo de operação
   */
  private async processOperationCycle(): Promise<void> {
    // 1. Verificar se há recargas pendentes
    const pendingRecharges = this.rechargeQueue.getStats().pending;
    
    if (pendingRecharges >= this.config.rechargePauseThreshold) {
      await this.switchToRechargeMode();
      return;
    }
    
    // 2. Se não há recargas urgentes, continuar extração
    if (this.currentMode !== 'extraction') {
      await this.switchToExtractionMode();
    }
    
    await this.processExtraction();
  }

  /**
   * Muda para modo de recarga
   */
  private async switchToRechargeMode(): Promise<void> {
    if (this.currentMode === 'recharge') return;
    
    logger.info('HYBRID', 'Mudando para modo RECARGA');
    this.currentMode = 'recharge';
    this.stats.lastInterruption = new Date();
    this.stateManager.setMode(false, true);
    
    await this.processRecharges();
  }

  /**
   * Muda para modo de extração
   */
  private async switchToExtractionMode(): Promise<void> {
    if (this.currentMode === 'extraction') return;
    
    logger.info('HYBRID', 'Mudando para modo EXTRAÇÃO');
    this.currentMode = 'extraction';
    this.stateManager.setMode(true, false);
  }

  /**
   * Processa recargas pendentes
   */
  private async processRecharges(): Promise<void> {
    let processed = 0;
    
    while (processed < this.config.maxConcurrentRecharges) {
      // Buscar próxima recarga baseado na interface real
      const allRequests = this.rechargeQueue.getAllRequests();
      const pendingRequests = allRequests.filter(r => r.status === 'pending');
      
      if (pendingRequests.length === 0) break;
      
      // Ordenar por prioridade
      pendingRequests.sort((a, b) => {
        if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
        if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
        return a.requestedAt.getTime() - b.requestedAt.getTime();
      });
      
      const recharge = pendingRequests[0];
      
      try {
        logger.info('HYBRID', `Processando recarga: ${recharge.driverId} - R$ ${recharge.amount}`);
        
        // Processar recarga usando o dashboard scraper
        await this.simulateRechargeProcess(recharge);
        
        this.rechargeQueue.markAsCompleted(recharge.id);
        this.stats.totalRecharges++;
        processed++;
        
      } catch (error) {
        logger.error('HYBRID', `Erro na recarga ${recharge.id}`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.rechargeQueue.markAsFailed(recharge.id, errorMessage);
        this.stats.errorCount++;
      }
    }
    
    // Se não há mais recargas, voltar para extração
    if (this.rechargeQueue.getStats().pending === 0) {
      await this.switchToExtractionMode();
    }
  }

  /**
   * Processa recarga usando o dashboard scraper
   */
  private async simulateRechargeProcess(recharge: any): Promise<void> {
    try {
      // Atualizar status para processing
      if (this.rechargeResults.has(recharge.id)) {
        const result = this.rechargeResults.get(recharge.id);
        result.status = 'processing';
        result.attempts = (result.attempts || 0) + 1;
        this.rechargeResults.set(recharge.id, result);
      }
      
      // Garantir que dashboard está pronto
      await this.ensureDashboardReady();
      
      // Processar recarga usando o scraper
      const success = await this.dashboardScraper.processRecharge(
        recharge.driverId, 
        recharge.amount
      );
      
      if (!success) {
        throw new Error('Falha no processamento da recarga');
      }
      
      // Atualizar resultado com sucesso
      if (this.rechargeResults.has(recharge.id)) {
        const result = this.rechargeResults.get(recharge.id);
        result.status = 'completed';
        result.success = true;
        result.completedAt = new Date().toISOString();
        result.error = null;
        this.rechargeResults.set(recharge.id, result);
      }
      
      logger.success('HYBRID', `Recarga concluída: ${recharge.driverId} - R$ ${recharge.amount/100}`);
    } catch (error) {
      // Atualizar resultado com erro
      if (this.rechargeResults.has(recharge.id)) {
        const result = this.rechargeResults.get(recharge.id);
        result.status = 'failed';
        result.success = false;
        result.completedAt = new Date().toISOString();
        result.error = error instanceof Error ? error.message : String(error);
        this.rechargeResults.set(recharge.id, result);
      }
      
      logger.error('HYBRID', 'Erro no processamento da recarga', error);
      throw error;
    }
  }

  /**
   * Processa extração de dados
   */
  private async processExtraction(): Promise<void> {
    const driverStats = this.driverQueue.getStats();
    
    if (driverStats.total === 0) {
      logger.warn('HYBRID', 'Fila de extração vazia, tentando buscar novos IDs...');
      await this.loadInitialDriverIds();
      this.currentMode = 'idle';
      return;
    }
    
    let processed = 0;
    
    while (processed < this.config.extractionBatchSize && driverStats.total > 0) {
      // Verificar se chegaram recargas urgentes
      const urgentRecharges = this.rechargeQueue.getAllRequests()
        .filter(r => r.priority === 'urgent' && r.status === 'pending').length;
      
      if (urgentRecharges > 0) {
        logger.warn('HYBRID', 'Interrompendo extração para recargas urgentes');
        break;
      }
      
      const driverItem = this.driverQueue.getNextId();
      if (!driverItem) break;
      
      try {
        logger.info('HYBRID', `Extraindo dados do motorista: ${driverItem.id}`);
        this.stateManager.setCurrentDriverId(driverItem.id);
        
        // Aqui você implementaria a lógica real de extração
        const personalData = await this.extractDriverPersonalData(driverItem.id);
        
        // Simular salvamento no banco
        await this.savePersonalData(driverItem.id, personalData);
        
        this.driverQueue.markAsCompleted(driverItem.id);
        this.stats.totalExtracted++;
        this.stateManager.incrementProcessed();
        processed++;
        
        // Delay entre extrações para evitar sobrecarregar o sistema
        if (processed < this.config.extractionBatchSize) {
          logger.debug('HYBRID', 'Aguardando 3 segundos antes da próxima extração...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
      } catch (error) {
        logger.error('HYBRID', `Erro na extração ${driverItem.id}`, error);
        const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
        this.driverQueue.markAsFailed(driverItem.id, errorMessage);
        this.stats.errorCount++;
      }
    }
    
    this.stateManager.setCurrentDriverId(null);
  }

  /**
   * Extrai dados pessoais do motorista usando o scraper real
   * Abre dashboard, espera login manual/captcha, extrai dados
   */
  private async extractDriverPersonalData(driverId: string): Promise<any> {
    try {
      logger.debug('HYBRID', `Iniciando extração de dados para motorista: ${driverId}`);
      
      // 1. Verificar se scraper está inicializado
      await this.ensureDashboardReady();
      
      // 2. Executar extração de dados do motorista específico
      logger.debug('HYBRID', `Extraindo dados do motorista: ${driverId}`);
      const extractedData = await this.dashboardScraper.extractDriverData(driverId);
      
      if (!extractedData || extractedData.error) {
        throw new Error(`Falha na extração: ${extractedData?.error || 'Dados não encontrados'}`);
      }
      
      logger.success('HYBRID', `Dados extraídos com sucesso para motorista ${driverId}`);
      
      return {
        driver_id: driverId,
        driver_name: extractedData.data?.name || 'Nome não encontrado',
        phone_number: extractedData.data?.phone || 'Telefone não encontrado',
        performance_data: extractedData.data || {},
        extractedAt: new Date(),
        source: 'dashboard_scraping',
        city: extractedData.city
      };
      
    } catch (error: any) {
      logger.error('HYBRID', `Erro na extração para motorista ${driverId}`, error);
      throw error;
    }
  }

  /**
   * Garante que o dashboard scraper está pronto e logado
   */
  private async ensureDashboardReady(): Promise<void> {
    try {
      // Verificar se scraper está logado
      const status = this.dashboardScraper.getStatus();
      
      if (!status.isLoggedIn) {
        logger.debug('HYBRID', 'Dashboard não está logada, iniciando processo de login...');
        logger.debug('HYBRID', 'Abrindo dashboard...');
        
        // Inicializar scraper (faz login automaticamente)
        logger.warn('HYBRID', '⏳ 🤖 ATENÇÃO: O sistema abrirá a dashboard - resolva o CAPTCHA e faça login se necessário!');
        
        await this.dashboardScraper.initialize();
        
        logger.success('HYBRID', 'Login concluído com sucesso! Prosseguindo com a extração...');
      } else {
        logger.debug('HYBRID', 'Dashboard já está logada, prosseguindo...');
      }
      
    } catch (error: any) {
      logger.error('HYBRID', 'Erro ao preparar dashboard', error);
      throw error;
    }
  }

  /**
   * Busca dados específicos do motorista nos dados extraídos
   */
  private findDriverInScrapedData(driverId: string, scrapedData: any[]): any | null {
    for (const table of scrapedData) {
      if (table.isEmpty) continue;
      
      // Procurar nas linhas da tabela
      for (const row of table.rows) {
        // Assumindo que o ID do motorista está na primeira coluna
        if (row[0] && row[0].toString() === driverId) {
          return {
            name: row[1] || 'Nome não encontrado',
            phone: row[2] || 'Telefone não encontrado',
            performance: {
              requests_sent: row[3] || 0,
              requests_received: row[4] || 0,
              success_rides: row[5] || 0,
              // Mapear outras colunas conforme estrutura da tabela
            },
            rawData: row
          };
        }
      }
    }
    
    return null;
  }

  /**
   * Delay helper
   */
  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Salva dados pessoais no banco (implementação simulada)
   */
  private async savePersonalData(driverId: string, data: any): Promise<void> {
    // Simular salvamento
    logger.debug('HYBRID', `Dados salvos para motorista ${driverId}`);
  }

  /**
   * Adiciona motorista à fila de extração
   */
  public addDriverToQueue(driverId: string, priority: 'high' | 'normal' = 'normal'): void {
    this.driverQueue.addDriverIds([driverId], priority);
    logger.debug('HYBRID', `Motorista ${driverId} adicionado à fila (${priority})`);
  }

  /**
   * Adiciona recarga à fila
   */
  public addRechargeToQueue(driverId: string, amount: number, urgent: boolean = false): string {
    const rechargeId = this.rechargeQueue.addRechargeRequest(
      driverId,
      amount,
      urgent ? 'urgent' : 'normal'
    );
    
    // Inicializar resultado da recarga
    this.rechargeResults.set(rechargeId, {
      id: rechargeId,
      driverId,
      amount,
      priority: urgent ? 'urgent' : 'normal',
      status: 'queued',
      requestedAt: new Date().toISOString(),
      completedAt: null,
      success: null,
      error: null,
      attempts: 0
    });
    
    logger.info('HYBRID', `Recarga adicionada: ${driverId} - R$ ${amount} (${urgent ? 'urgente' : 'normal'})`);
    return rechargeId;
  }

  /**
   * Obtém resultado de uma recarga específica
   */
  public getRechargeResult(rechargeId: string): any | null {
    return this.rechargeResults.get(rechargeId) || null;
  }

  /**
   * Força atualização dos IDs das cidades
   */
  public async refreshDriverIds(): Promise<void> {
    logger.debug('HYBRID', 'Forçando atualização dos IDs das cidades...');
    await this.loadInitialDriverIds();
  }

  /**
   * Atualiza configuração da cidade
   */
  public updateCity(name: string, apiUrl: string): void {
    this.driverIdProvider.updateCityConfig(name, apiUrl, true);
    logger.debug('HYBRID', `Cidade atualizada: ${name}`);
  }

  /**
   * Obtém estatísticas atuais
   */
  public getStats(): HybridOperationStats {
    return {
      ...this.stats,
      currentMode: this.currentMode,
      uptime: this.isRunning ? Date.now() - this.stats.uptime : 0
    };
  }

  /**
   * Obtém status das filas
   */
  public getQueueStatus() {
    return {
      drivers: this.driverQueue.getStats(),
      recharges: this.rechargeQueue.getStats(),
      operation: this.stateManager.getState(),
      providers: this.driverIdProvider.getStats()
    };
  }
}
