"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HybridOperationService = void 0;
const driverIdQueue_1 = require("../queue/driverIdQueue");
const rechargeQueue_1 = require("../queue/rechargeQueue");
const operationStateManager_1 = require("../queue/operationStateManager");
const driverIdProvider_1 = require("./driverIdProvider");
const RidesDashboardHybridScraper_1 = require("../scraper/RidesDashboardHybridScraper");
const logger_1 = require("../utils/logger");
/**
 * Serviço principal de operação híbrida
 * Orquestra entre extração de dados pessoais e recargas de crédito
 */
class HybridOperationService {
    constructor(config) {
        this.isRunning = false;
        this.currentMode = 'idle';
        this.operationInterval = null;
        this.autoFeedInterval = null;
        this.isLoadingIds = false; // Flag para evitar conflitos
        this.rechargeResults = new Map(); // Armazenar resultados das recargas
        this.config = config;
        this.driverQueue = driverIdQueue_1.DriverIdQueue.getInstance();
        this.rechargeQueue = rechargeQueue_1.RechargeQueue.getInstance();
        this.stateManager = operationStateManager_1.OperationStateManager.getInstance();
        this.driverIdProvider = driverIdProvider_1.DriverIdProvider.getInstance();
        this.dashboardScraper = new RidesDashboardHybridScraper_1.RidesDashboardHybridScraper('hybrid_scraper');
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
    static getInstance(config) {
        if (!HybridOperationService.instance) {
            const defaultConfig = {
                extractionBatchSize: 5,
                rechargePauseThreshold: 1,
                maxConcurrentRecharges: 3,
                stateCheckInterval: 5000,
                recoveryOnStart: true,
                autoFeedInterval: 300000, // 5 minutos
                citiesRefreshInterval: 1800000 // 30 minutos
            };
            HybridOperationService.instance = new HybridOperationService(config || defaultConfig);
        }
        return HybridOperationService.instance;
    }
    /**
     * Inicia operação híbrida
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                logger_1.logger.warn('HYBRID', 'Operação híbrida já está rodando');
                return;
            }
            logger_1.logger.info('HYBRID', 'Iniciando sistema de operação híbrida...');
            try {
                // Inicializar navegador e login do dashboard híbrido já no início
                logger_1.logger.info('HYBRID', 'Inicializando navegador do sistema híbrido...');
                yield this.dashboardScraper.initialize();
                logger_1.logger.success('HYBRID', 'Navegador do sistema híbrido inicializado');
                // Verificar recuperação de estado
                if (this.config.recoveryOnStart) {
                    logger_1.logger.debug('HYBRID', 'Verificando recuperação de estado...');
                    yield this.checkRecovery();
                }
                // Buscar IDs iniciais das APIs
                logger_1.logger.debug('HYBRID', 'Buscando IDs iniciais das APIs...');
                yield this.loadInitialDriverIds();
                // Iniciar loop principal
                this.isRunning = true;
                this.startOperationLoop();
                logger_1.logger.debug('HYBRID', 'Loop principal iniciado');
                // Iniciar alimentação automática de IDs
                this.startAutoFeed();
                logger_1.logger.debug('HYBRID', 'Alimentação automática de IDs iniciada');
                logger_1.logger.success('HYBRID', `Sistema híbrido iniciado - batch=${this.config.extractionBatchSize}, threshold=${this.config.rechargePauseThreshold}`);
            }
            catch (error) {
                logger_1.logger.error('HYBRID', 'Erro ao iniciar sistema híbrido', error);
                throw error;
            }
        });
    }
    /**
     * Para operação híbrida
     */
    stop() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.isRunning) {
                logger_1.logger.warn('HYBRID', 'Operação híbrida não está rodando');
                return;
            }
            logger_1.logger.warn('HYBRID', 'Parando sistema de operação híbrida...');
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
            logger_1.logger.info('HYBRID', 'Sistema híbrido parado com sucesso');
        });
    }
    /**
     * Carrega IDs iniciais das APIs
     */
    loadInitialDriverIds() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isLoadingIds) {
                logger_1.logger.debug('HYBRID', 'Carregamento de IDs já em andamento, pulando...');
                return;
            }
            this.isLoadingIds = true;
            logger_1.logger.debug('HYBRID', 'Carregando IDs iniciais das dashboards...');
            try {
                // 1. Primeiro tentar extrair IDs reais da dashboard Active Drivers
                logger_1.logger.debug('HYBRID', 'Tentando extrair IDs reais da página Active Drivers...');
                try {
                    yield this.ensureDashboardReady();
                    const realDriverIds = yield this.dashboardScraper.extractAllDriverIds();
                    if (realDriverIds && realDriverIds.length > 0) {
                        logger_1.logger.success('HYBRID', `${realDriverIds.length} IDs reais extraídos da dashboard Active Drivers`);
                        // Adicionar IDs reais com prioridade alta
                        this.driverQueue.addDriverIds(realDriverIds, 'high');
                        logger_1.logger.info('HYBRID', `IDs da dashboard carregados: ${realDriverIds.length} IDs reais (alta prioridade)`);
                        return; // Sucesso, não precisa buscar nas APIs
                    }
                }
                catch (dashboardError) {
                    logger_1.logger.warn('HYBRID', `Erro ao extrair IDs da dashboard: ${dashboardError.message}`);
                    logger_1.logger.debug('HYBRID', 'Tentando fallback para APIs das cidades...');
                }
                // 2. Fallback: usar APIs das cidades
                const drivers = yield this.driverIdProvider.getAllDriverIds();
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
                    logger_1.logger.info('HYBRID', `IDs das APIs carregados: ${highPriorityIds.length} alta prioridade, ${normalPriorityIds.length} normal`);
                }
                else {
                    logger_1.logger.warn('HYBRID', 'Nenhum ID encontrado nas APIs, sistema funcionará apenas com recargas');
                }
            }
            catch (error) {
                logger_1.logger.error('HYBRID', 'Erro ao carregar IDs iniciais', error);
            }
            finally {
                this.isLoadingIds = false;
            }
        });
    }
    /**
     * Inicia alimentação automática de IDs
     */
    startAutoFeed() {
        this.autoFeedInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            if (!this.isRunning)
                return;
            // Não executar se já estiver carregando IDs
            if (this.isLoadingIds) {
                logger_1.logger.debug('HYBRID', 'Auto-feed: aguardando carregamento principal terminar...');
                return;
            }
            try {
                logger_1.logger.debug('HYBRID', 'Alimentação automática: buscando novos IDs...');
                const currentStats = this.driverQueue.getStats();
                // Só buscar novos IDs se a fila estiver baixa
                if (currentStats.total < this.config.extractionBatchSize * 2) {
                    logger_1.logger.debug('HYBRID', 'Fila baixa, buscando novos IDs...');
                    // Marcar que estamos carregando IDs
                    this.isLoadingIds = true;
                    try {
                        // 1. Primeiro tentar extrair IDs reais da dashboard
                        logger_1.logger.debug('HYBRID', 'Extraindo IDs atuais da dashboard...');
                        const realDriverIds = yield this.dashboardScraper.extractAllDriverIds();
                        if (realDriverIds && realDriverIds.length > 0) {
                            // Filtrar IDs que já não estão na fila
                            const currentIds = this.driverQueue.getAllIds();
                            const newIds = realDriverIds.filter(id => !currentIds.includes(id));
                            if (newIds.length > 0) {
                                this.driverQueue.addDriverIds(newIds, 'high');
                                logger_1.logger.info('HYBRID', `Auto-feed: ${newIds.length} novos IDs reais da dashboard adicionados`);
                            }
                            else {
                                logger_1.logger.debug('HYBRID', 'Todos os IDs da dashboard já estão na fila');
                            }
                            return; // Sucesso com IDs reais
                        }
                    }
                    catch (dashboardError) {
                        logger_1.logger.warn('HYBRID', `Auto-feed: erro ao extrair da dashboard: ${dashboardError.message}`);
                        // 2. Fallback: usar APIs das cidades APENAS se dashboard falhou
                        logger_1.logger.debug('HYBRID', 'Auto-feed: usando fallback das APIs...');
                        const drivers = yield this.driverIdProvider.getAllDriverIds();
                        if (drivers.length > 0) {
                            const highPriorityIds = drivers.filter(d => d.priority === 'high').map(d => d.id);
                            const normalPriorityIds = drivers.filter(d => d.priority === 'normal').map(d => d.id);
                            if (highPriorityIds.length > 0) {
                                this.driverQueue.addDriverIds(highPriorityIds, 'high');
                            }
                            if (normalPriorityIds.length > 0) {
                                this.driverQueue.addDriverIds(normalPriorityIds, 'normal');
                            }
                            logger_1.logger.debug('HYBRID', `Auto-feed: ${drivers.length} novos IDs das APIs adicionados (fallback)`);
                        }
                    }
                    finally {
                        this.isLoadingIds = false;
                    }
                }
            }
            catch (error) {
                this.isLoadingIds = false;
                logger_1.logger.error('HYBRID', 'Erro na alimentação automática', error);
            }
        }), this.config.autoFeedInterval);
    }
    /**
     * Verifica e executa recuperação de estado
     */
    checkRecovery() {
        return __awaiter(this, void 0, void 0, function* () {
            const recovery = this.stateManager.getRecoveryInfo();
            if (recovery.shouldRecover) {
                logger_1.logger.info('HYBRID', 'Estado de recuperação detectado:');
                logger_1.logger.info('HYBRID', `   - ID atual: ${recovery.currentDriverId || 'nenhum'}`);
                logger_1.logger.info('HYBRID', `   - Total processado: ${recovery.totalProcessed}`);
                logger_1.logger.info('HYBRID', `   - Última gravação: ${recovery.lastSavedMinutesAgo.toFixed(1)} min atrás`);
                // Carregar estado das filas
                yield this.loadQueueStates();
            }
        });
    }
    /**
     * Carrega estados das filas
     */
    loadQueueStates() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.debug('HYBRID', 'Carregando estados das filas...');
        });
    }
    /**
     * Loop principal de operação
     */
    startOperationLoop() {
        this.operationInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            if (!this.isRunning)
                return;
            try {
                yield this.processOperationCycle();
            }
            catch (error) {
                logger_1.logger.error('HYBRID', 'Erro no ciclo de operação', error);
                this.stats.errorCount++;
                const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                this.stateManager.setLastError(errorMessage);
            }
        }), this.config.stateCheckInterval);
    }
    /**
     * Processa um ciclo de operação
     */
    processOperationCycle() {
        return __awaiter(this, void 0, void 0, function* () {
            // 1. Verificar se há recargas pendentes
            const pendingRecharges = this.rechargeQueue.getStats().pending;
            if (pendingRecharges >= this.config.rechargePauseThreshold) {
                yield this.switchToRechargeMode();
                return;
            }
            // 2. Se não há recargas urgentes, continuar extração
            if (this.currentMode !== 'extraction') {
                yield this.switchToExtractionMode();
            }
            yield this.processExtraction();
        });
    }
    /**
     * Muda para modo de recarga
     */
    switchToRechargeMode() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currentMode === 'recharge')
                return;
            logger_1.logger.info('HYBRID', 'Mudando para modo RECARGA');
            this.currentMode = 'recharge';
            this.stats.lastInterruption = new Date();
            this.stateManager.setMode(false, true);
            yield this.processRecharges();
        });
    }
    /**
     * Muda para modo de extração
     */
    switchToExtractionMode() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.currentMode === 'extraction')
                return;
            logger_1.logger.info('HYBRID', 'Mudando para modo EXTRAÇÃO');
            this.currentMode = 'extraction';
            this.stateManager.setMode(true, false);
        });
    }
    /**
     * Processa recargas pendentes
     */
    processRecharges() {
        return __awaiter(this, void 0, void 0, function* () {
            let processed = 0;
            while (processed < this.config.maxConcurrentRecharges) {
                // Buscar próxima recarga baseado na interface real
                const allRequests = this.rechargeQueue.getAllRequests();
                const pendingRequests = allRequests.filter(r => r.status === 'pending');
                if (pendingRequests.length === 0)
                    break;
                // Ordenar por prioridade
                pendingRequests.sort((a, b) => {
                    if (a.priority === 'urgent' && b.priority !== 'urgent')
                        return -1;
                    if (a.priority !== 'urgent' && b.priority === 'urgent')
                        return 1;
                    return a.requestedAt.getTime() - b.requestedAt.getTime();
                });
                const recharge = pendingRequests[0];
                try {
                    logger_1.logger.info('HYBRID', `Processando recarga: ${recharge.driverId} - R$ ${recharge.amount}`);
                    // Processar recarga usando o dashboard scraper
                    yield this.simulateRechargeProcess(recharge);
                    this.rechargeQueue.markAsCompleted(recharge.id);
                    this.stats.totalRecharges++;
                    processed++;
                }
                catch (error) {
                    logger_1.logger.error('HYBRID', `Erro na recarga ${recharge.id}`, error);
                    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                    this.rechargeQueue.markAsFailed(recharge.id, errorMessage);
                    this.stats.errorCount++;
                }
            }
            // Se não há mais recargas, voltar para extração
            if (this.rechargeQueue.getStats().pending === 0) {
                yield this.switchToExtractionMode();
            }
        });
    }
    /**
     * Processa recarga usando o dashboard scraper
     */
    simulateRechargeProcess(recharge) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Atualizar status para processing
                if (this.rechargeResults.has(recharge.id)) {
                    const result = this.rechargeResults.get(recharge.id);
                    result.status = 'processing';
                    result.attempts = (result.attempts || 0) + 1;
                    this.rechargeResults.set(recharge.id, result);
                }
                // Garantir que dashboard está pronto
                yield this.ensureDashboardReady();
                // Processar recarga usando o scraper
                const success = yield this.dashboardScraper.processRecharge(recharge.driverId, recharge.amount);
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
                logger_1.logger.success('HYBRID', `Recarga concluída: ${recharge.driverId} - R$ ${recharge.amount / 100}`);
            }
            catch (error) {
                // Atualizar resultado com erro
                if (this.rechargeResults.has(recharge.id)) {
                    const result = this.rechargeResults.get(recharge.id);
                    result.status = 'failed';
                    result.success = false;
                    result.completedAt = new Date().toISOString();
                    result.error = error instanceof Error ? error.message : String(error);
                    this.rechargeResults.set(recharge.id, result);
                }
                logger_1.logger.error('HYBRID', 'Erro no processamento da recarga', error);
                throw error;
            }
        });
    }
    /**
     * Processa extração de dados
     */
    processExtraction() {
        return __awaiter(this, void 0, void 0, function* () {
            const driverStats = this.driverQueue.getStats();
            if (driverStats.total === 0) {
                logger_1.logger.warn('HYBRID', 'Fila de extração vazia, tentando buscar novos IDs...');
                yield this.loadInitialDriverIds();
                this.currentMode = 'idle';
                return;
            }
            let processed = 0;
            while (processed < this.config.extractionBatchSize && driverStats.total > 0) {
                // Verificar se chegaram recargas urgentes
                const urgentRecharges = this.rechargeQueue.getAllRequests()
                    .filter(r => r.priority === 'urgent' && r.status === 'pending').length;
                if (urgentRecharges > 0) {
                    logger_1.logger.warn('HYBRID', 'Interrompendo extração para recargas urgentes');
                    break;
                }
                const driverItem = this.driverQueue.getNextId();
                if (!driverItem)
                    break;
                try {
                    logger_1.logger.info('HYBRID', `Extraindo dados do motorista: ${driverItem.id}`);
                    this.stateManager.setCurrentDriverId(driverItem.id);
                    // Aqui você implementaria a lógica real de extração
                    const personalData = yield this.extractDriverPersonalData(driverItem.id);
                    // Simular salvamento no banco
                    yield this.savePersonalData(driverItem.id, personalData);
                    this.driverQueue.markAsCompleted(driverItem.id);
                    this.stats.totalExtracted++;
                    this.stateManager.incrementProcessed();
                    processed++;
                    // Delay entre extrações para evitar sobrecarregar o sistema
                    if (processed < this.config.extractionBatchSize) {
                        logger_1.logger.debug('HYBRID', 'Aguardando 3 segundos antes da próxima extração...');
                        yield new Promise(resolve => setTimeout(resolve, 3000));
                    }
                }
                catch (error) {
                    logger_1.logger.error('HYBRID', `Erro na extração ${driverItem.id}`, error);
                    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
                    this.driverQueue.markAsFailed(driverItem.id, errorMessage);
                    this.stats.errorCount++;
                }
            }
            this.stateManager.setCurrentDriverId(null);
        });
    }
    /**
     * Extrai dados pessoais do motorista usando o scraper real
     * Abre dashboard, espera login manual/captcha, extrai dados
     */
    extractDriverPersonalData(driverId) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                logger_1.logger.debug('HYBRID', `Iniciando extração de dados para motorista: ${driverId}`);
                // 1. Verificar se scraper está inicializado
                yield this.ensureDashboardReady();
                // 2. Executar extração de dados do motorista específico
                logger_1.logger.debug('HYBRID', `Extraindo dados do motorista: ${driverId}`);
                const extractedData = yield this.dashboardScraper.extractDriverData(driverId);
                if (!extractedData || extractedData.error) {
                    throw new Error(`Falha na extração: ${(extractedData === null || extractedData === void 0 ? void 0 : extractedData.error) || 'Dados não encontrados'}`);
                }
                logger_1.logger.success('HYBRID', `Dados extraídos com sucesso para motorista ${driverId}`);
                return {
                    driver_id: driverId,
                    driver_name: ((_a = extractedData.data) === null || _a === void 0 ? void 0 : _a.name) || 'Nome não encontrado',
                    phone_number: ((_b = extractedData.data) === null || _b === void 0 ? void 0 : _b.phone) || 'Telefone não encontrado',
                    performance_data: extractedData.data || {},
                    extractedAt: new Date(),
                    source: 'dashboard_scraping',
                    city: extractedData.city
                };
            }
            catch (error) {
                logger_1.logger.error('HYBRID', `Erro na extração para motorista ${driverId}`, error);
                throw error;
            }
        });
    }
    /**
     * Garante que o dashboard scraper está pronto e logado
     * CORRIGIDO: Evita reinicializar se já estiver logado
     */
    ensureDashboardReady() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Verificar se scraper está logado
                const status = this.dashboardScraper.getStatus();
                logger_1.logger.debug('HYBRID', `Status atual: logado=${status.isLoggedIn}, URL=${status.pageUrl}`);
                if (!status.isLoggedIn) {
                    logger_1.logger.debug('HYBRID', 'Dashboard não está logada, iniciando processo de login...');
                    logger_1.logger.debug('HYBRID', 'Abrindo dashboard...');
                    // Inicializar scraper (faz login automaticamente)
                    logger_1.logger.warn('HYBRID', '⏳ 🤖 ATENÇÃO: O sistema abrirá a dashboard - resolva o CAPTCHA e faça login se necessário!');
                    yield this.dashboardScraper.initialize();
                    logger_1.logger.success('HYBRID', 'Login concluído com sucesso! Prosseguindo com a extração...');
                }
                else {
                    logger_1.logger.debug('HYBRID', 'Dashboard já está logada, prosseguindo com extração...');
                }
            }
            catch (error) {
                logger_1.logger.error('HYBRID', 'Erro ao preparar dashboard', error);
                throw error;
            }
        });
    }
    /**
     * Busca dados específicos do motorista nos dados extraídos
     */
    findDriverInScrapedData(driverId, scrapedData) {
        for (const table of scrapedData) {
            if (table.isEmpty)
                continue;
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
    delay(ms) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise(resolve => setTimeout(resolve, ms));
        });
    }
    /**
     * Salva dados pessoais no banco (implementação simulada)
     */
    savePersonalData(driverId, data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Simular salvamento
            logger_1.logger.debug('HYBRID', `Dados salvos para motorista ${driverId}`);
        });
    }
    /**
     * Adiciona motorista à fila de extração
     */
    addDriverToQueue(driverId, priority = 'normal') {
        this.driverQueue.addDriverIds([driverId], priority);
        logger_1.logger.debug('HYBRID', `Motorista ${driverId} adicionado à fila (${priority})`);
    }
    /**
     * Adiciona recarga à fila
     */
    addRechargeToQueue(driverId, amount, urgent = false) {
        const rechargeId = this.rechargeQueue.addRechargeRequest(driverId, amount, urgent ? 'urgent' : 'normal');
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
        logger_1.logger.info('HYBRID', `Recarga adicionada: ${driverId} - R$ ${amount} (${urgent ? 'urgente' : 'normal'})`);
        return rechargeId;
    }
    /**
     * Obtém resultado de uma recarga específica
     */
    getRechargeResult(rechargeId) {
        return this.rechargeResults.get(rechargeId) || null;
    }
    /**
     * Força atualização dos IDs das cidades
     */
    refreshDriverIds() {
        return __awaiter(this, void 0, void 0, function* () {
            logger_1.logger.debug('HYBRID', 'Forçando atualização dos IDs das cidades...');
            yield this.loadInitialDriverIds();
        });
    }
    /**
     * Atualiza configuração da cidade
     */
    updateCity(name, apiUrl) {
        this.driverIdProvider.updateCityConfig(name, apiUrl, true);
        logger_1.logger.debug('HYBRID', `Cidade atualizada: ${name}`);
    }
    /**
     * Obtém estatísticas atuais
     */
    getStats() {
        return Object.assign(Object.assign({}, this.stats), { currentMode: this.currentMode, uptime: this.isRunning ? Date.now() - this.stats.uptime : 0 });
    }
    /**
     * Obtém status das filas
     */
    getQueueStatus() {
        return {
            drivers: this.driverQueue.getStats(),
            recharges: this.rechargeQueue.getStats(),
            operation: this.stateManager.getState(),
            providers: this.driverIdProvider.getStats()
        };
    }
}
exports.HybridOperationService = HybridOperationService;
