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
exports.RidesPersistentScraper = void 0;
exports.getPersistentScraper = getPersistentScraper;
exports.scrapeAllRidesDataPersistent = scrapeAllRidesDataPersistent;
const browserSessionManager_1 = require("../services/browserSessionManager");
const dataCacheManager_1 = require("../services/dataCacheManager");
class RidesPersistentScraper {
    constructor() {
        this.sessionManager = browserSessionManager_1.BrowserSessionManager.getInstance();
        this.cacheManager = dataCacheManager_1.DataCacheManager.getInstance();
        // Extrair domínio base da URL de login
        const loginUrl = process.env.RIDES_LOGIN_URL || 'https://rides.ec2dashboard.com/#/page/login';
        this.baseUrl = loginUrl.split('#')[0]; // https://rides.ec2dashboard.com/
        // Montar URLs dinamicamente baseado no domínio
        this.ridesPages = [
            { name: 'Ongoing Rides', url: `${this.baseUrl}#/app/ongoing-rides/` },
            { name: 'Scheduled Rides', url: `${this.baseUrl}#/app/scheduled-rides/` },
            { name: 'Completed Rides', url: `${this.baseUrl}#/app/completed-rides/` },
            { name: 'Cancelled Rides', url: `${this.baseUrl}#/app/cancelled-rides/4/` },
            { name: 'Missed Rides', url: `${this.baseUrl}#/app/missed-rides/3/` }
        ];
    }
    /**
     * Executa scraping usando sessão persistente
     */
    scrapeAllData() {
        return __awaiter(this, arguments, void 0, function* (skipLoginVerification = false) {
            try {
                console.log('🚀 Iniciando scraping com sessão persistente...');
                console.log(`🔧 [RIDES] Skip Login Verification PARÂMETRO: ${skipLoginVerification}`);
                // 🔥 CONTROLE INTERNO: Se já fez login uma vez, sempre pular
                let finalSkipLogin = skipLoginVerification;
                if (RidesPersistentScraper.hasLoggedInSuccessfully) {
                    finalSkipLogin = true;
                    console.log('🔥 [RIDES-CONTROL] JÁ FEZ LOGIN ANTES - FORÇANDO skipLogin=true');
                }
                else {
                    console.log('🔥 [RIDES-CONTROL] PRIMEIRA EXECUÇÃO - USANDO parâmetro original');
                }
                console.log(`🔧 [RIDES] Skip Login Verification FINAL: ${finalSkipLogin}`);
                // Verificar status detalhado antes de começar
                const browserWasActive = this.sessionManager.isActive();
                const sessionStatus = yield this.sessionManager.getSessionStatus();
                console.log('📊 Status da sessão:', sessionStatus.message);
                // 🔥 NOVA LÓGICA: Pular verificação se solicitado
                let loginSuccess = true;
                if (finalSkipLogin) {
                    console.log('⚡ [RIDES] Pulando verificação de login - assumindo login manual válido');
                    console.log('🔧 [RIDES] skipLoginVerification === true - NÃO chamando ensureLoginWithCaptchaHandling()');
                    // Garantir que browser está ativo
                    if (!this.sessionManager.isActive()) {
                        console.log('🔧 [RIDES] Browser inativo, inicializando...');
                        yield this.sessionManager.initializeBrowser();
                    }
                    else {
                        console.log('🔧 [RIDES] Browser já está ativo - seguindo direto para scraping');
                    }
                }
                else {
                    console.log('🔧 [RIDES] skipLoginVerification === false - chamando ensureLoginWithCaptchaHandling()');
                    // Garantir que está logado (com tratamento de captcha)
                    loginSuccess = yield this.sessionManager.ensureLoginWithCaptchaHandling(false);
                    if (!loginSuccess) {
                        const finalStatus = yield this.sessionManager.getSessionStatus();
                        return {
                            success: false,
                            data: [],
                            message: finalStatus.requiresManualLogin
                                ? 'Captcha detectado - por favor faça login manualmente no navegador e tente novamente'
                                : 'Falha no login',
                            sessionInfo: {
                                isNewLogin: !browserWasActive,
                                browserStatus: 'login_failed',
                                sessionValid: false
                            }
                        };
                    }
                }
                console.log('✅ Login verificado/realizado com sucesso');
                // Extrair dados de todas as páginas
                const allData = [];
                for (const ridePage of this.ridesPages) {
                    console.log(`📊 Processando: ${ridePage.name}...`);
                    try {
                        // Navegar para a página
                        yield this.sessionManager.navigateToPage(ridePage.url);
                        // Aguardar tabela carregar
                        yield this.delay(5000);
                        // Extrair dados da tabela
                        const tableData = yield this.sessionManager.extractTableData(ridePage.name);
                        allData.push(tableData);
                        const recordCount = tableData.isEmpty ? 0 : tableData.rows.length;
                        console.log(`✅ ${ridePage.name}: ${recordCount} registros encontrados`);
                    }
                    catch (error) {
                        console.error(`❌ Erro ao processar ${ridePage.name}:`, error.message);
                        allData.push({
                            name: ridePage.name,
                            url: ridePage.url,
                            headers: [],
                            rows: [],
                            isEmpty: true
                        });
                    }
                }
                const totalRecords = allData.reduce((sum, table) => sum + table.rows.length, 0);
                // ⭐ NOVA FUNCIONALIDADE: Comparar com dados anteriores
                console.log('🔍 Comparando com dados anteriores...');
                const comparison = this.cacheManager.compareAndGetDifferences(allData);
                let resultMessage = '';
                if (comparison.hasChanges) {
                    const newRecords = comparison.differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0);
                    resultMessage = `✅ Scraping concluído! ${newRecords} novos registros encontrados de ${totalRecords} total`;
                }
                else {
                    resultMessage = `✅ Scraping concluído! Nenhuma mudança detectada (${totalRecords} registros existentes)`;
                }
                console.log(resultMessage);
                // 🔥 MARCAR LOGIN COMO BEM-SUCEDIDO
                if (!RidesPersistentScraper.hasLoggedInSuccessfully) {
                    RidesPersistentScraper.hasLoggedInSuccessfully = true;
                    console.log('🔥 [RIDES-CONTROL] ✅ MARCANDO LOGIN COMO BEM-SUCEDIDO - Próximas execuções pularão login');
                }
                return {
                    success: true,
                    data: allData,
                    message: resultMessage,
                    sessionInfo: {
                        isNewLogin: !browserWasActive,
                        browserStatus: 'active',
                        sessionValid: true
                    },
                    hasChanges: comparison.hasChanges,
                    onlyNewData: true,
                    differences: comparison.differences
                };
            }
            catch (error) {
                console.error('❌ Erro durante scraping persistente:', error);
                return {
                    success: false,
                    data: [],
                    message: `❌ Erro durante scraping: ${error.message}`,
                    sessionInfo: {
                        isNewLogin: false,
                        browserStatus: 'error',
                        sessionValid: false
                    }
                };
            }
        });
    }
    /**
     * Scraping de uma página específica
     */
    scrapeSinglePage(pageName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const ridePage = this.ridesPages.find(page => page.name.toLowerCase().includes(pageName.toLowerCase()));
                if (!ridePage) {
                    return {
                        success: false,
                        data: [],
                        message: `❌ Página '${pageName}' não encontrada. Páginas disponíveis: ${this.ridesPages.map(p => p.name).join(', ')}`
                    };
                }
                // Garantir login
                const loginSuccess = yield this.sessionManager.ensureLogin();
                if (!loginSuccess) {
                    return {
                        success: false,
                        data: [],
                        message: '❌ Falha no login'
                    };
                }
                // Navegar e extrair dados
                yield this.sessionManager.navigateToPage(ridePage.url);
                yield this.delay(5000);
                const tableData = yield this.sessionManager.extractTableData(ridePage.name);
                return {
                    success: true,
                    data: [tableData],
                    message: `✅ Página '${ridePage.name}' processada: ${tableData.rows.length} registros`
                };
            }
            catch (error) {
                return {
                    success: false,
                    data: [],
                    message: `❌ Erro ao processar página '${pageName}': ${error.message}`
                };
            }
        });
    }
    /**
     * Força um novo login e limpa o cache
     */
    forceNewLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔄 Forçando novo login...');
                const success = yield this.sessionManager.forceRelogin();
                return {
                    success,
                    message: success ? '✅ Novo login realizado com sucesso' : '❌ Falha no novo login'
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `❌ Erro ao forçar novo login: ${error.message}`
                };
            }
        });
    }
    /**
     * Obtém status detalhado da sessão
     */
    getSessionStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.sessionManager.getSessionStatus();
        });
    }
    /**
     * Executa limpeza completa (fechar browser e limpar cache)
     */
    cleanup() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🧹 Executando limpeza completa...');
                this.sessionManager.clearSession();
                yield this.sessionManager.closeBrowser();
                return {
                    success: true,
                    message: '✅ Limpeza completa realizada - browser fechado e sessão limpa'
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: `❌ Erro durante limpeza: ${error.message}`
                };
            }
        });
    }
    /**
     * Função auxiliar para delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Lista as páginas disponíveis para scraping
     */
    getAvailablePages() {
        return this.ridesPages.map(page => ({
            name: page.name,
            url: page.url
        }));
    }
    /**
     * Aguarda que o usuário faça login manual
     */
    waitForManualLogin() {
        return __awaiter(this, arguments, void 0, function* (timeoutMs = 300000) {
            return yield this.sessionManager.waitForManualLogin(timeoutMs);
        });
    }
    /**
     * Inicializa o navegador
     */
    initializeBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.sessionManager.initializeBrowser();
        });
    }
    /**
     * Obtém a página atual
     */
    getPage() {
        return this.sessionManager.getPage();
    }
    /**
     * Limpa o cache de dados (útil para testes)
     */
    clearCache() {
        this.cacheManager.clearCache();
    }
    /**
     * Obtém estatísticas do cache
     */
    getCacheStats() {
        return this.cacheManager.getCacheStats();
    }
    /**
     * Obtém payload otimizado para webhook (somente dados novos)
     */
    getWebhookPayload(result) {
        if (!result.hasChanges || !result.differences) {
            return null;
        }
        const comparison = this.cacheManager.compareAndGetDifferences(result.data);
        return Object.assign(Object.assign({}, comparison.webhookPayload), { sessionInfo: result.sessionInfo });
    }
}
exports.RidesPersistentScraper = RidesPersistentScraper;
// 🔥 CONTROLE INTERNO DE LOGIN
RidesPersistentScraper.hasLoggedInSuccessfully = false;
// Instância singleton do scraper
let scraperInstance = null;
/**
 * Função utilitária para obter a instância do scraper
 */
function getPersistentScraper() {
    if (!scraperInstance) {
        scraperInstance = new RidesPersistentScraper();
    }
    return scraperInstance;
}
/**
 * Função principal para compatibilidade com o sistema existente
 */
function scrapeAllRidesDataPersistent() {
    return __awaiter(this, arguments, void 0, function* (skipLoginVerification = false) {
        const scraper = getPersistentScraper();
        return yield scraper.scrapeAllData(skipLoginVerification);
    });
}
