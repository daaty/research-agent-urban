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
exports.AIBrowserManager = void 0;
const geminiClient_1 = require("./geminiClient");
class AIBrowserManager {
    constructor(geminiApiKey, config) {
        this.page = null;
        this.browser = null;
        this.actionHistory = [];
        this.contextMemory = [];
        this.geminiClient = new geminiClient_1.GeminiClient(geminiApiKey);
        this.config = Object.assign({ maxRetries: 3, screenshotOnError: true, waitTimeout: 30000, contextMemory: true }, config);
    }
    /**
     * Inicializar browser com configurações otimizadas para AI
     */
    initialize(browser, page) {
        return __awaiter(this, void 0, void 0, function* () {
            this.browser = browser;
            this.page = page;
            // Configurações para melhor análise de AI
            yield this.page.setViewportSize({ width: 1920, height: 1080 });
            // Interceptar requests para otimizar performance
            yield this.page.route('**/*', (route) => {
                const resourceType = route.request().resourceType();
                // Bloquear recursos desnecessários para AI
                if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
                    route.abort();
                }
                else {
                    route.continue();
                }
            });
            console.log('🤖 AI Browser Manager inicializado');
        });
    }
    /**
     * Executar comando de navegação via AI
     */
    executeCommand(command, context) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page) {
                return {
                    success: false,
                    message: 'Browser não inicializado',
                    error: 'Browser not initialized'
                };
            }
            console.log(`🧠 Executando comando AI: "${command}"`);
            try {
                // 1. Capturar estado atual
                const currentUrl = this.page.url();
                const screenshot = yield this.captureScreenshot();
                // 2. Analisar comando com Gemini
                const analysisRequest = {
                    command,
                    screenshot,
                    pageUrl: currentUrl,
                    context: context || this.buildContext(),
                    previousActions: this.actionHistory.slice(-5) // Últimas 5 ações
                };
                let geminiResponse;
                // Tentar análise visual primeiro se há screenshot
                if (screenshot) {
                    geminiResponse = yield this.geminiClient.analyzeScreenshot(screenshot, command, analysisRequest.context);
                }
                else {
                    geminiResponse = yield this.geminiClient.analyzeAndPlan(analysisRequest);
                }
                if (!geminiResponse.success) {
                    return {
                        success: false,
                        message: 'Falha na análise AI',
                        error: geminiResponse.error
                    };
                }
                // 3. Executar ações planejadas
                const result = yield this.executeActions(geminiResponse.actions || []);
                // 4. Atualizar contexto
                if (this.config.contextMemory) {
                    this.updateContext(command, result.success);
                }
                return {
                    success: result.success,
                    message: geminiResponse.response || 'Comando executado',
                    screenshots: [screenshot],
                    actions_executed: geminiResponse.actions,
                    data: result.data
                };
            }
            catch (error) {
                console.error('❌ Erro na execução do comando AI:', error);
                return {
                    success: false,
                    message: 'Erro na execução',
                    error: error.message,
                    screenshots: this.config.screenshotOnError ? [yield this.captureScreenshot()] : undefined
                };
            }
        });
    }
    /**
     * Executar sequência de ações
     */
    executeActions(actions) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                return { success: false };
            let success = true;
            let collectedData = {};
            for (const action of actions) {
                try {
                    console.log(`🎯 Executando ação: ${action.type}`);
                    switch (action.type) {
                        case 'navigate':
                            if (action.url) {
                                yield this.page.goto(action.url, { waitUntil: 'networkidle' });
                            }
                            break;
                        case 'click':
                            if (action.selector) {
                                yield this.page.waitForSelector(action.selector, { timeout: 10000 });
                                yield this.page.click(action.selector);
                            }
                            else if (action.coordinates) {
                                yield this.page.mouse.click(action.coordinates.x, action.coordinates.y);
                            }
                            break;
                        case 'type':
                            if (action.selector && action.text) {
                                yield this.page.waitForSelector(action.selector, { timeout: 10000 });
                                yield this.page.fill(action.selector, action.text);
                            }
                            break;
                        case 'scroll':
                            if (action.selector) {
                                yield this.page.waitForSelector(action.selector);
                                yield this.page.locator(action.selector).scrollIntoViewIfNeeded();
                            }
                            else {
                                yield this.page.evaluate(() => {
                                    window.scrollBy(0, 500);
                                });
                            }
                            break;
                        case 'wait':
                            const duration = action.duration || 2000;
                            yield this.page.waitForTimeout(duration);
                            break;
                        case 'screenshot':
                            yield this.captureScreenshot();
                            break;
                        default:
                            console.warn(`⚠️ Ação não reconhecida: ${action.type}`);
                    }
                    // Adicionar ação ao histórico
                    this.actionHistory.push(action);
                    // Pequena pausa entre ações
                    yield this.page.waitForTimeout(500);
                }
                catch (error) {
                    console.error(`❌ Erro na ação ${action.type}:`, error.message);
                    success = false;
                    // Tentar continuar com próxima ação em alguns casos
                    if (action.type !== 'navigate') {
                        continue;
                    }
                    else {
                        break;
                    }
                }
            }
            return { success, data: collectedData };
        });
    }
    /**
     * Capturar screenshot para análise
     */
    captureScreenshot() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                return '';
            try {
                const screenshot = yield this.page.screenshot({
                    type: 'png',
                    fullPage: false // Só viewport visível para AI
                });
                return screenshot.toString('base64');
            }
            catch (error) {
                console.error('❌ Erro ao capturar screenshot:', error);
                return '';
            }
        });
    }
    /**
     * Construir contexto para AI
     */
    buildContext() {
        var _a;
        const context = [
            'Sistema: Research Agent Urban - Web Automation',
            `URL atual: ${((_a = this.page) === null || _a === void 0 ? void 0 : _a.url()) || 'unknown'}`,
            `Ações recentes: ${this.actionHistory.slice(-3).map(a => a.type).join(', ')}`
        ];
        if (this.contextMemory.length > 0) {
            context.push(`Contexto anterior: ${this.contextMemory.slice(-3).join('; ')}`);
        }
        return context.join('\n');
    }
    /**
     * Atualizar memória de contexto
     */
    updateContext(command, success) {
        const contextEntry = `${success ? '✅' : '❌'} ${command}`;
        this.contextMemory.push(contextEntry);
        // Manter apenas últimos 10 contextos
        if (this.contextMemory.length > 10) {
            this.contextMemory = this.contextMemory.slice(-10);
        }
    }
    /**
     * Extrair dados inteligentes da página
     */
    extractData(instruction) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page) {
                return {
                    success: false,
                    message: 'Browser não inicializado'
                };
            }
            try {
                // Capturar screenshot e conteúdo da página
                const screenshot = yield this.captureScreenshot();
                const pageContent = yield this.page.content();
                // Usar AI para extrair dados específicos
                const response = yield this.geminiClient.analyzeScreenshot(screenshot, `Extraia dados conforme solicitado: ${instruction}`, 'Análise de dados da página web');
                return {
                    success: response.success,
                    message: response.response || 'Dados extraídos',
                    screenshots: [screenshot],
                    data: response.response
                };
            }
            catch (error) {
                return {
                    success: false,
                    message: 'Erro na extração de dados',
                    error: error.message
                };
            }
        });
    }
    /**
     * Limpar histórico e contexto
     */
    clearHistory() {
        this.actionHistory = [];
        this.contextMemory = [];
        console.log('🧹 Histórico de ações limpo');
    }
    /**
     * Obter estatísticas do agente
     */
    getStats() {
        return {
            actions_executed: this.actionHistory.length,
            context_memory_size: this.contextMemory.length,
            last_actions: this.actionHistory.slice(-5),
            recent_context: this.contextMemory.slice(-3)
        };
    }
}
exports.AIBrowserManager = AIBrowserManager;
