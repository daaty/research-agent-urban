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
exports.AIAgentController = void 0;
const aiBrowserManager_1 = require("../services/aiBrowserManager");
const browserSessionManager_1 = require("../services/browserSessionManager");
class AIAgentController {
    constructor() {
        this.aiBrowserManager = null;
        /**
         * Inicializar AI Agent
         */
        this.initializeAI = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                const geminiApiKey = process.env.GEMINI_API_KEY;
                if (!geminiApiKey) {
                    return res.status(400).json({
                        success: false,
                        message: 'GEMINI_API_KEY não configurada'
                    });
                }
                // Inicializar browser se necessário
                if (!this.browserSessionManager.isActive()) {
                    yield this.browserSessionManager.initializeBrowser();
                }
                // Inicializar AI Browser Manager
                this.aiBrowserManager = new aiBrowserManager_1.AIBrowserManager(geminiApiKey, {
                    maxRetries: 3,
                    screenshotOnError: true,
                    waitTimeout: 30000,
                    contextMemory: true
                });
                // Garantir que o browser está inicializado
                let page = this.browserSessionManager.getPage();
                let browser = this.browserSessionManager.getBrowser();
                if (!page || !browser) {
                    console.log('🔄 Browser não inicializado, inicializando...');
                    // Usar o scraper para inicializar o browser
                    const { getPersistentScraper } = require('../scraper/ridesPersistentScraper');
                    const scraper = getPersistentScraper();
                    yield scraper.initializeBrowser();
                    page = this.browserSessionManager.getPage();
                    browser = this.browserSessionManager.getBrowser();
                }
                if (!page) {
                    throw new Error('Falha ao obter instância da página após inicialização');
                }
                // Para agora, vamos aceitar browser como null se necessário
                if (!browser) {
                    console.log('⚠️ Browser instance não disponível, usando context proxy');
                    browser = null;
                }
                yield this.aiBrowserManager.initialize(browser, page);
                res.json({
                    success: true,
                    message: '🤖 AI Agent inicializado com sucesso',
                    status: 'ready',
                    capabilities: [
                        'navegação inteligente',
                        'análise visual de páginas',
                        'extração de dados',
                        'automação complexa',
                        'comandos em linguagem natural'
                    ]
                });
            }
            catch (error) {
                console.error('❌ Erro ao inicializar AI Agent:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro na inicialização',
                    error: error.message
                });
            }
        });
        /**
         * Executar comando via AI
         */
        this.executeCommand = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.aiBrowserManager) {
                    return res.status(400).json({
                        success: false,
                        message: 'AI Agent não inicializado. Use /api/ai/initialize primeiro'
                    });
                }
                const { command, context } = req.body;
                if (!command) {
                    return res.status(400).json({
                        success: false,
                        message: 'Comando é obrigatório'
                    });
                }
                console.log(`🧠 Comando recebido: "${command}"`);
                const result = yield this.aiBrowserManager.executeCommand(command, context);
                res.json({
                    success: result.success,
                    message: result.message,
                    data: result.data,
                    screenshots: result.screenshots,
                    actions_executed: result.actions_executed,
                    error: result.error,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('❌ Erro na execução do comando:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro na execução',
                    error: error.message
                });
            }
        });
        /**
         * Navegar para URL via AI
         */
        this.navigateToUrl = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.aiBrowserManager) {
                    return res.status(400).json({
                        success: false,
                        message: 'AI Agent não inicializado'
                    });
                }
                const { url, task } = req.body;
                if (!url) {
                    return res.status(400).json({
                        success: false,
                        message: 'URL é obrigatória'
                    });
                }
                const command = task
                    ? `Navegue para ${url} e ${task}`
                    : `Navegue para ${url}`;
                const result = yield this.aiBrowserManager.executeCommand(command);
                res.json({
                    success: result.success,
                    message: result.message,
                    url: url,
                    task_completed: result.success,
                    screenshots: result.screenshots,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('❌ Erro na navegação:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro na navegação',
                    error: error.message
                });
            }
        });
        /**
         * Extrair dados via AI
         */
        this.extractData = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.aiBrowserManager) {
                    return res.status(400).json({
                        success: false,
                        message: 'AI Agent não inicializado'
                    });
                }
                const { instruction, format } = req.body;
                if (!instruction) {
                    return res.status(400).json({
                        success: false,
                        message: 'Instrução de extração é obrigatória'
                    });
                }
                const fullInstruction = format
                    ? `${instruction} - Formato: ${format}`
                    : instruction;
                const result = yield this.aiBrowserManager.extractData(fullInstruction);
                res.json({
                    success: result.success,
                    message: result.message,
                    instruction: instruction,
                    extracted_data: result.data,
                    screenshots: result.screenshots,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('❌ Erro na extração de dados:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro na extração',
                    error: error.message
                });
            }
        });
        /**
         * Analisar página atual
         */
        this.analyzePage = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.aiBrowserManager) {
                    return res.status(400).json({
                        success: false,
                        message: 'AI Agent não inicializado'
                    });
                }
                const { question } = req.body;
                const defaultQuestion = question || 'Analise esta página e me diga o que vê';
                const result = yield this.aiBrowserManager.executeCommand(`Analise a página atual: ${defaultQuestion}`);
                res.json({
                    success: result.success,
                    analysis: result.message,
                    page_data: result.data,
                    screenshots: result.screenshots,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('❌ Erro na análise da página:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro na análise',
                    error: error.message
                });
            }
        });
        /**
         * Obter status do AI Agent
         */
        this.getStatus = (req, res) => __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const isInitialized = this.aiBrowserManager !== null;
                const browserActive = this.browserSessionManager.isActive();
                let stats = {};
                if (this.aiBrowserManager) {
                    stats = this.aiBrowserManager.getStats();
                }
                res.json({
                    success: true,
                    ai_agent_initialized: isInitialized,
                    browser_active: browserActive,
                    current_url: browserActive ? (_a = this.browserSessionManager.getPage()) === null || _a === void 0 ? void 0 : _a.url() : null,
                    stats: stats,
                    capabilities: {
                        natural_language_commands: true,
                        visual_analysis: true,
                        data_extraction: true,
                        smart_navigation: true,
                        context_memory: true
                    },
                    example_commands: [
                        'Faça login no sistema com email herbert@urban.com',
                        'Navegue até a página de relatórios',
                        'Extraia todos os dados de corridas da tabela',
                        'Analise os dados e me diga quantas corridas foram canceladas',
                        'Procure por informações de faturamento'
                    ]
                });
            }
            catch (error) {
                console.error('❌ Erro ao obter status:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao obter status',
                    error: error.message
                });
            }
        });
        /**
         * Limpar histórico do AI Agent
         */
        this.clearHistory = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.aiBrowserManager) {
                    return res.status(400).json({
                        success: false,
                        message: 'AI Agent não inicializado'
                    });
                }
                this.aiBrowserManager.clearHistory();
                res.json({
                    success: true,
                    message: '🧹 Histórico de ações limpo',
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('❌ Erro ao limpar histórico:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro ao limpar histórico',
                    error: error.message
                });
            }
        });
        /**
         * Exemplo de automação complexa
         */
        this.complexAutomation = (req, res) => __awaiter(this, void 0, void 0, function* () {
            try {
                if (!this.aiBrowserManager) {
                    return res.status(400).json({
                        success: false,
                        message: 'AI Agent não inicializado'
                    });
                }
                const { workflow } = req.body;
                if (!workflow) {
                    return res.status(400).json({
                        success: false,
                        message: 'Workflow é obrigatório'
                    });
                }
                // Exemplo de workflow complexo
                const command = `Execute o seguinte workflow: ${workflow}. 
        Documente cada passo e colete dados relevantes.`;
                const result = yield this.aiBrowserManager.executeCommand(command);
                res.json({
                    success: result.success,
                    workflow_result: result.message,
                    collected_data: result.data,
                    execution_log: result.actions_executed,
                    screenshots: result.screenshots,
                    timestamp: new Date().toISOString()
                });
            }
            catch (error) {
                console.error('❌ Erro na automação complexa:', error);
                res.status(500).json({
                    success: false,
                    message: 'Erro na automação',
                    error: error.message
                });
            }
        });
        this.browserSessionManager = browserSessionManager_1.BrowserSessionManager.getInstance();
    }
}
exports.AIAgentController = AIAgentController;
