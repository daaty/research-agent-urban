"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.BrowserSessionManager = void 0;
const playwright_1 = require("playwright");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const environmentDetector_1 = require("../config/environmentDetector");
const logger_1 = require("../utils/logger");
class BrowserSessionManager {
    constructor(instanceName = 'default') {
        // ✅ SIMPLIFICADO: Sem locks desnecessários para processo único
        this.browser = null;
        this.context = null;
        this.page = null;
        // 🔄 Cache de status para evitar verificações excessivas
        this.lastLoginCheck = 0;
        this.lastLoginStatus = false;
        this.loginCheckCacheDuration = 30000; // 30 segundos
        // 🔄 Cache inteligente - invalida em certas condições
        this.lastUrl = '';
        // URLs de configuração (usando variáveis de ambiente)
        this.loginUrl = process.env.RIDES_LOGIN_URL || 'https://rides.ec2dashboard.com/#/page/login';
        this.email = process.env.RIDES_USERNAME || '';
        this.password = process.env.RIDES_PASSWORD || '';
        this.instanceName = instanceName;
        this.isHeadless = process.env.HEADLESS_MODE === 'true';
        this.logger = logger_1.Logger.getInstance(); // ⭐ INICIALIZAR LOGGER
        // 🆕 Diretórios específicos por instância
        this.userDataDir = path.join(process.cwd(), 'browser-data', instanceName);
        this.sessionFilePath = path.join(process.cwd(), `session-data-${instanceName}.json`);
        this.sessionData = this.loadSessionData();
        // 🔍 Detectar ambiente e configurar adequadamente
        const envDetector = environmentDetector_1.EnvironmentDetector.getInstance();
        const envConfig = envDetector.getConfig();
        // Log do ambiente detectado (apenas para a primeira instância)
        if (instanceName === 'default') {
            envDetector.logEnvironmentInfo();
        }
        // Ajustar headless baseado no ambiente
        if (envConfig.displayMode === 'headless') {
            this.isHeadless = true;
        }
        else if (envConfig.displayMode === 'vnc' || envConfig.displayMode === 'xvfb') {
            this.isHeadless = false;
        }
        this.logger.info('BROWSER', `Browser [${instanceName}] configurado para modo: ${envConfig.displayMode.toUpperCase()}`);
        this.logger.info('BROWSER', `Headless [${instanceName}]: ${this.isHeadless ? 'SIM' : 'NÃO'}`);
        // Garantir que o diretório de dados do browser existe
        if (!fs.existsSync(this.userDataDir)) {
            fs.mkdirSync(this.userDataDir, { recursive: true });
        }
    }
    /**
     * 🆕 Obtém instância nomeada do BrowserSessionManager
     */
    static getInstance(instanceName = 'default') {
        if (!BrowserSessionManager.instances.has(instanceName)) {
            BrowserSessionManager.instances.set(instanceName, new BrowserSessionManager(instanceName));
        }
        return BrowserSessionManager.instances.get(instanceName);
    }
    /**
     * 🔄 COORDENAÇÃO DE LOGIN - Verificar se outro está fazendo login
     */
    static isAnotherInstanceLoggingIn(currentInstance) {
        return BrowserSessionManager.loginCoordination.isLoginInProgress &&
            BrowserSessionManager.loginCoordination.activeInstance !== currentInstance;
    }
    /**
     * 🔄 COORDENAÇÃO DE LOGIN - Marcar início de login
     */
    static startLoginProcess(instanceName) {
        console.log(`🔒 [${instanceName}] Iniciando processo de login (bloqueando outras instâncias)`);
        BrowserSessionManager.loginCoordination.isLoginInProgress = true;
        BrowserSessionManager.loginCoordination.activeInstance = instanceName;
    }
    /**
     * 🔄 COORDENAÇÃO DE LOGIN - Marcar fim de login
     */
    static endLoginProcess(instanceName) {
        console.log(`🔓 [${instanceName}] Finalizando processo de login (liberando outras instâncias)`);
        BrowserSessionManager.loginCoordination.isLoginInProgress = false;
        BrowserSessionManager.loginCoordination.activeInstance = null;
    }
    /**
     * 🆕 Lista todas as instâncias ativas
     */
    static getActiveInstances() {
        return Array.from(BrowserSessionManager.instances.keys());
    }
    /**
     * 🆕 Obtém nome da instância atual
     */
    getInstanceName() {
        return this.instanceName;
    }
    /**
     * 🌐 NAVEGAÇÃO SIMPLES: Navegar diretamente (sem locks desnecessários)
     */
    navigateWithLock(url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page) {
                throw new Error('Página não disponível para navegação');
            }
            console.log(`🌐 [${this.instanceName}] Navegando para: ${url.substring(0, 50)}...`);
            yield this.page.goto(url, options || { waitUntil: 'domcontentloaded', timeout: 30000 });
            console.log(`✅ [${this.instanceName}] Navegação concluída com sucesso`);
        });
    }
    /**
     * 🔄 CACHE INTELIGENTE: Invalidar cache quando necessário
     */
    invalidateLoginCache() {
        this.lastLoginCheck = 0;
        this.lastLoginStatus = false;
        console.log(`🔄 [${this.instanceName}] Cache de login invalidado`);
    }
    /**
     * 🔄 CACHE SIMPLES: Verificar apenas se foi para login inesperadamente
     */
    checkUrlChangeAndInvalidateCache(currentUrl) {
        // ✅ SIMPLIFICADO: Apenas invalidar se realmente for para login
        if (currentUrl.includes('#/page/login')) {
            console.log(`🔄 [${this.instanceName}] Cache de login invalidado`);
            this.invalidateLoginCache();
        }
    }
    /**
     * Carrega dados da sessão do arquivo local
     */
    loadSessionData() {
        try {
            if (fs.existsSync(this.sessionFilePath)) {
                const data = fs.readFileSync(this.sessionFilePath, 'utf8');
                return JSON.parse(data);
            }
        }
        catch (error) {
            console.log('⚠️ Erro ao carregar dados da sessão, criando nova sessão');
        }
        return {
            isLoggedIn: false,
            loginTimestamp: 0,
            sessionExpiry: 0,
            userData: null
        };
    }
    /**
     * Salva dados da sessão no arquivo local
     */
    saveSessionData() {
        try {
            fs.writeFileSync(this.sessionFilePath, JSON.stringify(this.sessionData, null, 2));
        }
        catch (error) {
            console.error('❌ Erro ao salvar dados da sessão:', error);
        }
    }
    /**
     * Verifica se a sessão ainda é válida (não expirou)
     */
    isSessionValid() {
        const now = Date.now();
        return this.sessionData.isLoggedIn &&
            this.sessionData.sessionExpiry > now &&
            (now - this.sessionData.loginTimestamp) < (2 * 60 * 60 * 1000); // 2 horas
    }
    /**
     * Verifica se o usuário está logado no navegador (detecta login manual)
     */
    isCurrentlyLoggedIn() {
        return __awaiter(this, arguments, void 0, function* (verbose = true) {
            if (!this.page)
                return false;
            // 🔄 Verificar mudança de URL e invalidar cache se necessário
            const currentUrl = this.page.url();
            this.checkUrlChangeAndInvalidateCache(currentUrl);
            // 🔄 Usar cache durante scraping para evitar verificações excessivas
            const now = Date.now();
            if (!verbose &&
                (now - this.lastLoginCheck) < this.loginCheckCacheDuration) {
                return this.lastLoginStatus;
            }
            try {
                if (verbose) {
                    console.log('🔍 Verificando URL atual:', currentUrl);
                }
                // Se está na página de login, definitivamente não está logado
                if (currentUrl.includes('login')) {
                    if (verbose) {
                        console.log('❌ Ainda na página de login');
                    }
                    this.lastLoginCheck = now;
                    this.lastLoginStatus = false;
                    return false;
                }
                // Se não está na página de login, verificar se realmente está no dashboard
                if (currentUrl.includes('dashboard') || currentUrl.includes('app/')) {
                    if (verbose) {
                        console.log('✅ URL indica dashboard');
                    }
                    // Aguardar um pouco para elementos carregarem (apenas se verbose)
                    if (verbose) {
                        // 🔒 VERIFICAÇÃO CRÍTICA: Verificar se page ainda é válida antes de waitForTimeout
                        if (this.page && !this.page.isClosed()) {
                            yield this.page.waitForTimeout(3000);
                        }
                    }
                    // Verificações específicas para o site rides.ec2dashboard.com
                    try {
                        // Verificar se há elementos específicos do dashboard Urban
                        const specificChecks = yield Promise.all([
                            // Verificar se há tabelas de dados (principal indicador)
                            this.page.$('table.t-fancy-table').then(el => !!el),
                            // Verificar se há título do dashboard Urban
                            this.page.$eval('title', el => el.textContent).then(title => (title === null || title === void 0 ? void 0 : title.includes('Dashboard')) || (title === null || title === void 0 ? void 0 : title.includes('Urban'))).catch(() => false),
                            // Verificar se há elementos de navegação específicos
                            this.page.$('.navbar, .nav-menu, .sidebar').then(el => !!el),
                            // Verificar se NÃO há formulário de login
                            this.page.$('#exampleInputEmail1').then(el => !el),
                            // Verificar se há conteúdo da página logada
                            this.page.$eval('body', el => el.textContent).then(text => text && text.length > 1000 && !text.includes('Login')).catch(() => false)
                        ]);
                        if (verbose) {
                            console.log('🔍 Verificações específicas:', {
                                hasTable: specificChecks[0],
                                hasTitle: specificChecks[1],
                                hasNavigation: specificChecks[2],
                                noLoginForm: specificChecks[3],
                                hasContent: specificChecks[4]
                            });
                        }
                        // Para considerar logado, deve passar em pelo menos 3 verificações
                        // E OBRIGATORIAMENTE não deve ter formulário de login
                        const positiveChecks = specificChecks.filter(Boolean).length;
                        const hasLoginForm = !specificChecks[3]; // Inverter pois specificChecks[3] é "NÃO há formulário"
                        if (verbose) {
                            console.log(`🔍 Resultado: ${positiveChecks}/5 verificações positivas`);
                            console.log(`🔍 Formulário de login presente: ${hasLoginForm ? 'SIM' : 'NÃO'}`);
                        }
                        // Regra: pelo menos 3 verificações positivas E sem formulário de login
                        const isLoggedIn = positiveChecks >= 3 && !hasLoginForm;
                        if (verbose) {
                            if (isLoggedIn) {
                                console.log('✅ Login confirmado por verificações específicas');
                            }
                            else {
                                console.log('❌ Login não confirmado pelas verificações');
                            }
                        }
                        // 🔄 Atualizar cache
                        this.lastLoginCheck = now;
                        this.lastLoginStatus = isLoggedIn;
                        return isLoggedIn;
                    }
                    catch (error) {
                        console.log('⚠️ Erro ao verificar elementos específicos:', error);
                        this.lastLoginCheck = now;
                        this.lastLoginStatus = false;
                        return false;
                    }
                }
                // Se não está nem em login nem em dashboard, algo está errado
                console.log('⚠️ URL não reconhecida, assumindo não logado');
                this.lastLoginCheck = now;
                this.lastLoginStatus = false;
                return false;
            }
            catch (error) {
                console.log('⚠️ Erro ao verificar status de login:', error);
                this.lastLoginCheck = now;
                this.lastLoginStatus = false;
                return false;
            }
        });
    }
    /**
     * Inicializa o navegador com dados persistentes
     */
    initializeBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.context && this.page) {
                // Verificar se o context ainda está ativo
                try {
                    yield this.page.title(); // Teste se a página ainda responde
                    console.log('✅ Browser já inicializado e ativo');
                    return;
                }
                catch (error) {
                    // Context/Page não está mais válido, reinicializar
                    console.log('⚠️ Sessão anterior inválida, reinicializando...');
                }
            }
            this.logger.info('BROWSER', 'Inicializando browser com persistência...');
            try {
                // 🔍 Obter configuração de browser baseada no ambiente
                const envDetector = environmentDetector_1.EnvironmentDetector.getInstance();
                const playwrightConfig = envDetector.getPlaywrightConfig();
                console.log(`🖥️ Configuração Playwright: headless=${playwrightConfig.headless}`);
                // Usar apenas os argumentos padrão do Playwright
                this.context = yield playwright_1.chromium.launchPersistentContext(this.userDataDir, {
                    headless: playwrightConfig.headless,
                    args: playwrightConfig.args,
                    viewport: playwrightConfig.viewport
                });
                // Obter referência do browser do context
                this.browser = this.context.browser();
                // Se o browser não foi retornado pelo context, vamos tentar uma abordagem diferente
                if (!this.browser) {
                    console.log('⚠️ Context não retornou instância do browser, usando abordagem alternativa...');
                    // Para compatibilidade com AI Agent, vamos criar um mock ou usar o context como proxy
                    this.browser = this.context; // Temporariamente para testes
                }
                // Pegar a página existente ou criar uma nova
                const pages = this.context.pages();
                this.page = pages.length > 0 ? pages[0] : yield this.context.newPage();
                // 🎯 CONFIGURAÇÃO PÓS-INICIALIZAÇÃO PARA FOCO (apenas VNC)
                if (!this.isHeadless) {
                    setTimeout(() => __awaiter(this, void 0, void 0, function* () {
                        try {
                            console.log(`🎯 [${this.instanceName}] Aplicando foco pós-inicialização...`);
                            // Tentar focar usando xdotool simples
                            const { exec } = require('child_process');
                            const { promisify } = require('util');
                            const execAsync = promisify(exec);
                            // Encontrar janela e focar
                            const windows = yield execAsync('DISPLAY=:99 xdotool search --class "chrome"').catch(() => ({ stdout: '' }));
                            const windowIds = windows.stdout.trim().split('\n').filter((id) => id.length > 0);
                            if (windowIds.length > 0) {
                                const windowIndex = this.instanceName === 'hybrid_scraper' ? 1 : 0;
                                const targetWindow = windowIds[windowIndex];
                                if (targetWindow) {
                                    yield execAsync(`DISPLAY=:99 xdotool windowraise ${targetWindow}`).catch(() => { });
                                    yield execAsync(`DISPLAY=:99 xdotool windowfocus ${targetWindow}`).catch(() => { });
                                    console.log(`✅ [${this.instanceName}] Foco aplicado na janela ${targetWindow}`);
                                }
                            }
                        }
                        catch (error) {
                            console.log(`⚠️ [${this.instanceName}] Erro no foco pós-inicialização:`, String(error));
                        }
                    }), 3000); // Aguardar 3 segundos
                }
                this.logger.success('BROWSER', 'Browser inicializado com sucesso');
            }
            catch (error) {
                console.error('❌ Erro ao inicializar browser:', error);
                throw error;
            }
        });
    }
    /**
     * Verifica e executa login se necessário
     */
    ensureLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.context || !this.page) {
                yield this.initializeBrowser();
            }
            // 🔄 VERIFICAR SE OUTRA INSTÂNCIA ESTÁ FAZENDO LOGIN
            if (BrowserSessionManager.isAnotherInstanceLoggingIn(this.instanceName)) {
                console.log(`⏳ [${this.instanceName}] Aguardando outra instância terminar login...`);
                // Aguardar até a outra instância terminar
                while (BrowserSessionManager.isAnotherInstanceLoggingIn(this.instanceName)) {
                    yield new Promise(resolve => setTimeout(resolve, 2000));
                    console.log(`⏳ [${this.instanceName}] Ainda aguardando login de ${BrowserSessionManager.loginCoordination.activeInstance}...`);
                }
                console.log(`✅ [${this.instanceName}] Outra instância terminou login, verificando status...`);
                // Verificar se agora está logado (pode ter sido resolvido pela outra instância)
                const isLoggedAfterWait = yield this.isCurrentlyLoggedIn();
                if (isLoggedAfterWait) {
                    console.log(`✅ [${this.instanceName}] Login foi resolvido pela outra instância!`);
                    return true;
                }
            }
            console.log(`🔐 [${this.instanceName}] Verificando status de login...`);
            // Primeiro, verificar se há sessão válida em cache
            if (this.isSessionValid()) {
                console.log('✅ Sessão válida encontrada no cache');
                // Mesmo com sessão válida, verificar se realmente está logado
                const isCurrentlyLoggedIn = yield this.isCurrentlyLoggedIn();
                if (isCurrentlyLoggedIn) {
                    console.log('✅ Sessão válida e usuário logado confirmado');
                    return true;
                }
                else {
                    console.log('⚠️ Sessão em cache, mas usuário não está logado. Limpando cache...');
                    this.clearSession();
                }
            }
            // Verificar se já está logado no navegador (login manual ou sessão persistente)
            const isCurrentlyLoggedIn = yield this.isCurrentlyLoggedIn();
            if (isCurrentlyLoggedIn) {
                console.log('✅ Login válido detectado no navegador');
                // Atualizar dados da sessão para refletir o login atual
                const now = Date.now();
                this.sessionData = {
                    isLoggedIn: true,
                    loginTimestamp: now,
                    sessionExpiry: now + (2 * 60 * 60 * 1000), // 2 horas de validade
                    userData: { email: this.email, detectedLogin: true }
                };
                this.saveSessionData();
                return true;
            }
            // Tentar navegar para dashboard primeiro para verificar se está logado
            try {
                console.log('🔍 Tentando acessar dashboard para verificar login...');
                const baseUrl = this.loginUrl.split('#')[0]; // Extrair domínio base
                yield this.page.goto(`${baseUrl}#/app/dashboard/`, {
                    waitUntil: 'domcontentloaded',
                    timeout: 15000
                });
                yield this.page.waitForTimeout(5000); // Aguardar mais tempo para carregamento
                // Verificar novamente após navegar para dashboard
                const isLoggedAfterDashboard = yield this.isCurrentlyLoggedIn();
                if (isLoggedAfterDashboard) {
                    console.log('✅ Login confirmado após navegação para dashboard');
                    // Atualizar dados da sessão
                    const now = Date.now();
                    this.sessionData = {
                        isLoggedIn: true,
                        loginTimestamp: now,
                        sessionExpiry: now + (2 * 60 * 60 * 1000),
                        userData: { email: this.email, dashboardAccess: true }
                    };
                    this.saveSessionData();
                    return true;
                }
            }
            catch (error) {
                console.log('⚠️ Erro ao verificar dashboard:', error);
            }
            // Se chegou aqui, precisa fazer login automático
            console.log('🔑 Necessário fazer login...');
            console.log('⚠️ ATENÇÃO: Se há captcha, faça login manualmente e tente novamente');
            return yield this.performLogin();
        });
    }
    /**
     * Executa o processo de login
     */
    performLogin() {
        return __awaiter(this, void 0, void 0, function* () {
            // 🔒 COORDENAÇÃO: Marcar início do processo de login
            BrowserSessionManager.startLoginProcess(this.instanceName);
            try {
                console.log('📍 Navegando para página de login...');
                yield this.page.goto(this.loginUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
                yield this.page.waitForTimeout(3000);
                // Verificar se há captcha na página
                const hasCaptcha = yield this.checkForCaptcha();
                if (hasCaptcha) {
                    console.log('🤖 CAPTCHA detectado na página!');
                    console.log('⚠️ Login automático não é possível com captcha');
                    console.log('📝 Por favor, faça login manualmente no navegador VNC');
                    console.log('� O sistema irá detectar automaticamente quando você completar o login...');
                    // 🔄 Iniciar polling para detectar login manual
                    return yield this.waitForManualLogin();
                }
                // Preencher credenciais apenas se não há captcha
                console.log('📝 Preenchendo credenciais...');
                yield this.page.fill('#exampleInputEmail1', this.email);
                yield this.page.fill('#exampleInputPassword1', this.password);
                // Fazer login
                console.log('🚪 Fazendo login...');
                yield this.page.press('#exampleInputPassword1', 'Enter');
                yield this.page.waitForTimeout(8000);
                // Verificar se login foi bem-sucedido com método mais robusto
                const isLoggedIn = yield this.verifyLoginSuccess();
                if (isLoggedIn) {
                    // Atualizar dados da sessão
                    const now = Date.now();
                    this.sessionData = {
                        isLoggedIn: true,
                        loginTimestamp: now,
                        sessionExpiry: now + (2 * 60 * 60 * 1000), // 2 horas de validade
                        userData: { email: this.email, automaticLogin: true }
                    };
                    this.saveSessionData();
                    console.log('✅ Login automático realizado com sucesso!');
                    return true;
                }
                else {
                    console.log('❌ Falha no login automático');
                    return false;
                }
            }
            catch (error) {
                console.error('❌ Erro durante login:', error);
                return false;
            }
            finally {
                // 🔓 COORDENAÇÃO: SEMPRE liberar processo de login
                BrowserSessionManager.endLoginProcess(this.instanceName);
            }
        });
    }
    /**
     * Verifica se o login foi bem-sucedido de forma mais robusta
     */
    verifyLoginSuccess() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Aguardar um pouco para redirecionamento
                yield this.page.waitForTimeout(5000);
                const currentUrl = this.page.url();
                console.log('🔍 URL após login:', currentUrl);
                // Se ainda está na página de login, login falhou
                if (currentUrl.includes('login')) {
                    console.log('❌ Ainda na página de login');
                    return false;
                }
                // Verificar se foi redirecionado para dashboard
                if (currentUrl.includes('dashboard') || currentUrl.includes('app/')) {
                    console.log('✅ Redirecionado para dashboard');
                    // Verificação dupla usando o método robusto
                    const loginConfirmed = yield this.isCurrentlyLoggedIn();
                    if (loginConfirmed) {
                        console.log('✅ Login confirmado por verificação de elementos');
                        return true;
                    }
                }
                return false;
            }
            catch (error) {
                console.log('⚠️ Erro ao verificar sucesso do login:', error);
                return false;
            }
        });
    }
    /**
     * Verifica se há captcha na página de login - versão melhorada
     */
    checkForCaptcha() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔍 Verificando presença de captcha na página...');
                // Aguardar um pouco para garantir que a página carregou completamente
                yield this.page.waitForTimeout(2000);
                // Verificar elementos comuns de captcha
                const captchaSelectors = [
                    'iframe[src*="recaptcha"]',
                    'iframe[src*="hcaptcha"]',
                    '.g-recaptcha',
                    '.h-captcha',
                    'div[class*="captcha"]',
                    'div[id*="captcha"]',
                    'img[src*="captcha"]',
                    '#captcha',
                    '.captcha-container',
                    '.captcha-wrapper',
                    '[data-captcha]',
                    '[data-sitekey]',
                    '.cf-turnstile',
                    'iframe[title*="captcha"]',
                    'iframe[title*="challenge"]'
                ];
                let captchaFound = false;
                let detectedSelector = '';
                for (const selector of captchaSelectors) {
                    try {
                        const element = yield this.page.$(selector);
                        if (element) {
                            const isVisible = yield element.isVisible();
                            if (isVisible) {
                                console.log(`🤖 Captcha detectado e visível: ${selector}`);
                                captchaFound = true;
                                detectedSelector = selector;
                                break;
                            }
                            else {
                                console.log(`📋 Captcha encontrado mas não visível: ${selector}`);
                            }
                        }
                    }
                    catch (error) {
                        // Continuar verificando outros seletores
                    }
                }
                // Verificação adicional: procurar por texto indicativo de captcha
                if (!captchaFound) {
                    const pageContent = (yield this.page.textContent('body')) || '';
                    const captchaTexts = [
                        'captcha',
                        'verify you are human',
                        'prove you are not a robot',
                        'security check',
                        'human verification'
                    ];
                    for (const text of captchaTexts) {
                        if (pageContent.toLowerCase().includes(text)) {
                            console.log(`🤖 Captcha detectado por texto: "${text}"`);
                            captchaFound = true;
                            detectedSelector = `texto: "${text}"`;
                            break;
                        }
                    }
                }
                if (captchaFound) {
                    console.log(`🤖 CAPTCHA CONFIRMADO - Detectado via: ${detectedSelector}`);
                    console.log('⚠️ Login automático não será tentado');
                    return true;
                }
                else {
                    console.log('✅ Nenhum captcha detectado - prosseguindo com login automático');
                    return false;
                }
            }
            catch (error) {
                console.log('⚠️ Erro ao verificar captcha:', error);
                // Em caso de erro, assumir que há captcha para ser seguro
                console.log('🛡️ Por segurança, assumindo presença de captcha');
                return true;
            }
        });
    }
    /**
     * Navega para uma página específica
     */
    navigateToPage(url) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page) {
                throw new Error('Browser não está inicializado');
            }
            console.log(`📍 Navegando para: ${url}`);
            try {
                // Tentar com networkidle primeiro
                yield this.page.goto(url, {
                    waitUntil: 'networkidle',
                    timeout: 20000
                });
            }
            catch (error) {
                console.log(`⚠️ Timeout com networkidle, tentando com domcontentloaded...`);
                // Se der timeout, tentar com domcontentloaded
                yield this.page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 15000
                });
            }
            // 🔒 VERIFICAÇÃO CRÍTICA: Verificar se page ainda é válida antes de waitForTimeout
            if (this.page && !this.page.isClosed()) {
                yield this.page.waitForTimeout(3000);
            }
        });
    }
    /**
     * Extrai dados de uma tabela na página atual
     */
    extractTableData(tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page) {
                throw new Error('Browser não está inicializado');
            }
            const currentUrl = this.page.url();
            try {
                // Tentar encontrar a tabela
                const tableExists = yield this.page.$('table.t-fancy-table');
                if (!tableExists) {
                    return {
                        name: tableName,
                        url: currentUrl,
                        headers: [],
                        rows: [],
                        isEmpty: true
                    };
                }
                // Extrair headers
                const headers = yield this.page.$$eval('table.t-fancy-table thead th', ths => ths.map(th => { var _a; return ((_a = th.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; }));
                // Verificar se há dados na tabela
                const noDataMessage = yield this.page.$('td.dataTables_empty');
                if (noDataMessage) {
                    return {
                        name: tableName,
                        url: currentUrl,
                        headers: headers,
                        rows: [],
                        isEmpty: true
                    };
                }
                // Extrair dados das linhas
                let rows = yield this.page.$$eval('table.t-fancy-table tbody tr:not(.odd):not(.even)', trs => trs.map(tr => {
                    const tds = tr.querySelectorAll('td');
                    return Array.from(tds).map(td => { var _a; return ((_a = td.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                }));
                // Se não encontrou linhas, tentar outro seletor
                if (rows.length === 0) {
                    rows = yield this.page.$$eval('table.t-fancy-table tbody tr', trs => trs.map(tr => {
                        const tds = tr.querySelectorAll('td');
                        return Array.from(tds).map(td => { var _a; return ((_a = td.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                    }));
                }
                return {
                    name: tableName,
                    url: currentUrl,
                    headers: headers,
                    rows: rows,
                    isEmpty: rows.length === 0
                };
            }
            catch (error) {
                console.error(`❌ Erro ao extrair dados da tabela ${tableName}:`, error);
                return {
                    name: tableName,
                    url: currentUrl,
                    headers: [],
                    rows: [],
                    isEmpty: true
                };
            }
        });
    }
    /**
     * Obtém a página atual para operações customizadas
     */
    getPage() {
        return this.page;
    }
    /**
     * Obtém a instância do browser para operações customizadas
     */
    getBrowser() {
        return this.browser;
    }
    /**
     * Verifica se o browser está ativo
     */
    isActive() {
        return this.context !== null && this.page !== null;
    }
    /**
     * Obtém status detalhado da sessão
     */
    getSessionStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            const browserActive = this.isActive();
            const sessionValid = this.isSessionValid();
            let currentlyLoggedIn = false;
            let availablePages = [];
            let requiresManualLogin = false;
            if (browserActive && this.page) {
                try {
                    // ⚠️ CORREÇÃO: Apenas verificar login, NÃO navegar para login
                    currentlyLoggedIn = yield this.isCurrentlyLoggedIn(false); // Modo silencioso
                    // 🔍 Se não detectou login automaticamente, verificar se fez login manual
                    if (!currentlyLoggedIn) {
                        const currentUrl = this.page.url();
                        // Se não está na página de login, pode ter feito login manual
                        if (!currentUrl.includes('login') && (currentUrl.includes('dashboard') || currentUrl.includes('app/'))) {
                            console.log('🔍 URL sugere login manual, verificando...');
                            // 🔒 VERIFICAÇÃO CRÍTICA: Verificar se page ainda é válida antes de waitForTimeout
                            if (this.page && !this.page.isClosed()) {
                                yield this.page.waitForTimeout(2000); // Aguardar carregamento
                            }
                            currentlyLoggedIn = yield this.isCurrentlyLoggedIn(true); // Verificação detalhada
                            if (currentlyLoggedIn) {
                                console.log('✅ Login manual detectado e confirmado!');
                                // Atualizar dados da sessão
                                const now = Date.now();
                                this.sessionData = {
                                    isLoggedIn: true,
                                    loginTimestamp: now,
                                    sessionExpiry: now + (2 * 60 * 60 * 1000),
                                    userData: { email: this.email, manualLogin: true }
                                };
                                this.saveSessionData();
                            }
                        }
                    }
                    // Listar páginas disponíveis
                    if (this.context) {
                        availablePages = this.context.pages().map(p => p.url());
                    }
                }
                catch (error) {
                    console.log('⚠️ Erro ao verificar status:', error);
                }
            }
            let message = '';
            if (!browserActive) {
                message = 'Browser não está ativo';
            }
            else if (requiresManualLogin) {
                message = 'Captcha detectado - login manual necessário';
            }
            else if (currentlyLoggedIn) {
                message = 'Logado e pronto para scraping';
            }
            else if (sessionValid) {
                message = 'Sessão válida em cache';
            }
            else {
                message = 'Não logado';
            }
            return {
                browserActive,
                sessionValid,
                currentlyLoggedIn,
                message,
                availablePages,
                requiresManualLogin
            };
        });
    }
    /**
     * Limpa dados da sessão
     */
    clearSession() {
        this.sessionData = {
            isLoggedIn: false,
            loginTimestamp: 0,
            sessionExpiry: 0,
            userData: null
        };
        this.saveSessionData();
        // Remover arquivo de sessão
        if (fs.existsSync(this.sessionFilePath)) {
            fs.unlinkSync(this.sessionFilePath);
        }
    }
    /**
     * Fecha o navegador (só usar quando realmente necessário)
     */
    closeBrowser() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.context) {
                console.log('🔒 Fechando navegador...');
                yield this.context.close();
                this.context = null;
                this.page = null;
            }
        });
    }
    /**
     * Força um novo login (limpa cache e faz login novamente)
     */
    forceRelogin() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Forçando novo login...');
            this.clearSession();
            return yield this.ensureLogin();
        });
    }
    /**
     * Aguarda que o usuário faça login manual (útil quando há captcha) - VERSÃO OTIMIZADA
     */
    waitForManualLogin() {
        return __awaiter(this, arguments, void 0, function* (timeout = 300000) {
            console.log('⏳ Aguardando login manual via VNC...');
            console.log('💡 Acesse o VNC em http://localhost:6080 para resolver o captcha');
            console.log('🔄 O sistema detectará automaticamente quando você fizer login...');
            const startTime = Date.now();
            let checkCount = 0;
            while (Date.now() - startTime < timeout) {
                checkCount++;
                // ⚠️ CORREÇÃO: Verificar se página ainda existe
                if (!this.page) {
                    console.log('❌ Página não disponível');
                    return false;
                }
                const currentUrl = this.page.url();
                // Log menos frequente para reduzir spam
                if (checkCount % 10 === 0) {
                    const elapsed = Math.floor((Date.now() - startTime) / 1000);
                    const total = Math.floor(timeout / 1000);
                    console.log(`🔍 Verificando URL: ${currentUrl}...`);
                    console.log(`⏳ Aguardando... (${elapsed}s/${total}s)`);
                }
                // ⚠️ CORREÇÃO: Usar verificação silenciosa
                const isLoggedIn = yield this.isCurrentlyLoggedIn(false);
                if (isLoggedIn) {
                    console.log('✅ Login manual detectado com sucesso!');
                    // Atualizar dados da sessão
                    const now = Date.now();
                    this.sessionData = {
                        isLoggedIn: true,
                        loginTimestamp: now,
                        sessionExpiry: now + (2 * 60 * 60 * 1000),
                        userData: { email: this.email, manualLogin: true }
                    };
                    this.saveSessionData();
                    return true;
                }
                // ⚠️ CORREÇÃO: Aguardar 5 segundos entre verificações
                yield new Promise(resolve => setTimeout(resolve, 5000));
            }
            console.log('❌ Timeout aguardando login manual');
            return false;
        });
    }
    /**
     * Método híbrido que usa a mesma lógica do início - funciona para reinicialização
     */
    ensureLoginWithCaptchaHandling() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔄 Iniciando processo de login com tratamento de captcha...');
                // Garantir que browser está ativo
                if (!this.page) {
                    yield this.initializeBrowser();
                }
                // Verificar se já está logado primeiro
                const alreadyLoggedIn = yield this.isCurrentlyLoggedIn();
                if (alreadyLoggedIn) {
                    console.log('✅ Já está logado, continuando...');
                    return true;
                }
                console.log('📍 Navegando para página de login...');
                yield this.page.goto(this.loginUrl, {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000
                });
                yield this.page.waitForTimeout(3000);
                // 🔑 MESMA LÓGICA DO INÍCIO: Verificar captcha ANTES de preencher
                const hasCaptcha = yield this.checkForCaptcha();
                if (hasCaptcha) {
                    console.log('🤖 CAPTCHA detectado na página!');
                    console.log('⚠️ Login automático não é possível com captcha');
                    console.log('📝 Por favor, faça login manualmente no navegador VNC');
                    console.log('🔄 O sistema irá detectar automaticamente quando você completar o login...');
                    // 🔄 MESMA LÓGICA: Aguardar login manual
                    return yield this.waitForManualLogin();
                }
                // Se não há captcha, tentar login automático
                console.log('📝 Preenchendo credenciais...');
                yield this.page.fill('#exampleInputEmail1', this.email);
                yield this.page.fill('#exampleInputPassword1', this.password);
                console.log('🚪 Fazendo login...');
                yield this.page.press('#exampleInputPassword1', 'Enter');
                yield this.page.waitForTimeout(8000);
                // Verificar se login foi bem-sucedido
                const isLoggedIn = yield this.verifyLoginSuccess();
                if (isLoggedIn) {
                    // Atualizar dados da sessão
                    const now = Date.now();
                    this.sessionData = {
                        isLoggedIn: true,
                        loginTimestamp: now,
                        sessionExpiry: now + (2 * 60 * 60 * 1000),
                        userData: { email: this.email, automaticLogin: true, captchaHandled: true }
                    };
                    this.saveSessionData();
                    console.log('✅ Login automático realizado com sucesso após verificação de captcha!');
                    return true;
                }
                else {
                    console.log('❌ Falha no login automático, pode ter captcha não detectado');
                    console.log('🔄 Tentando aguardar login manual como fallback...');
                    // 🔑 FALLBACK: Se falhou, pode ser captcha não detectado, aguardar login manual
                    return yield this.waitForManualLogin();
                }
            }
            catch (error) {
                console.error('❌ Erro durante login com tratamento de captcha:', error);
                console.log('🔄 Tentando aguardar login manual como fallback...');
                // Em caso de erro, tentar login manual
                return yield this.waitForManualLogin();
            }
        });
    }
    /**
     * Método de debug para verificar o que está na página atual
     */
    debugCurrentPage() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page) {
                console.log('❌ Página não disponível para debug');
                return;
            }
            try {
                const currentUrl = this.page.url();
                const title = yield this.page.title();
                console.log('🔍 === DEBUG DA PÁGINA ATUAL ===');
                console.log('📍 URL:', currentUrl);
                console.log('📄 Title:', title);
                // Verificar elementos específicos
                const elements = yield Promise.all([
                    this.page.$('nav').then(el => ({ selector: 'nav', found: !!el })),
                    this.page.$('.sidebar').then(el => ({ selector: '.sidebar', found: !!el })),
                    this.page.$('.navigation').then(el => ({ selector: '.navigation', found: !!el })),
                    this.page.$('.user-info').then(el => ({ selector: '.user-info', found: !!el })),
                    this.page.$('.logout').then(el => ({ selector: '.logout', found: !!el })),
                    this.page.$('.dashboard-content').then(el => ({ selector: '.dashboard-content', found: !!el })),
                    this.page.$('.main-content').then(el => ({ selector: '.main-content', found: !!el })),
                    this.page.$('input[type="email"]').then(el => ({ selector: 'input[type="email"]', found: !!el })),
                    this.page.$('input[type="password"]').then(el => ({ selector: 'input[type="password"]', found: !!el })),
                    this.page.$('.login-form').then(el => ({ selector: '.login-form', found: !!el }))
                ]);
                console.log('🔍 Elementos encontrados:');
                elements.forEach(el => {
                    console.log(`   ${el.found ? '✅' : '❌'} ${el.selector}`);
                });
                // Verificar se há tabelas (indicador de estar no dashboard)
                const tables = yield this.page.$$('table');
                console.log(`📊 Tabelas encontradas: ${tables.length}`);
                // Verificar texto da página para identificar estado
                const bodyText = yield this.page.textContent('body');
                const hasLoginText = (bodyText === null || bodyText === void 0 ? void 0 : bodyText.toLowerCase().includes('login')) || (bodyText === null || bodyText === void 0 ? void 0 : bodyText.toLowerCase().includes('entrar'));
                const hasDashboardText = (bodyText === null || bodyText === void 0 ? void 0 : bodyText.toLowerCase().includes('dashboard')) || (bodyText === null || bodyText === void 0 ? void 0 : bodyText.toLowerCase().includes('painel'));
                console.log(`📝 Texto da página indica login: ${hasLoginText ? '✅' : '❌'}`);
                console.log(`📝 Texto da página indica dashboard: ${hasDashboardText ? '✅' : '❌'}`);
                console.log('🔍 === FIM DO DEBUG ===');
            }
            catch (error) {
                console.error('❌ Erro durante debug:', error);
            }
        });
    }
}
exports.BrowserSessionManager = BrowserSessionManager;
BrowserSessionManager.instances = new Map();
BrowserSessionManager.loginCoordination = {
    isLoginInProgress: false,
    activeInstance: null
}; // 🔄 COORDENAÇÃO DE LOGIN
