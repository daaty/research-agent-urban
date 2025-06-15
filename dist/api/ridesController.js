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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const ridesDashboardScraper_1 = require("../scraper/ridesDashboardScraper");
const testBrowser_1 = require("../scraper/testBrowser");
const ridesScraperNew_1 = require("../scraper/ridesScraperNew");
const axios_1 = __importDefault(require("axios"));
const playwright_1 = require("playwright");
const ridesTestSimple_1 = require("../scraper/ridesTestSimple");
const ridesLoginWorking_1 = require("../scraper/ridesLoginWorking");
const ridesDebug_1 = require("../scraper/ridesDebug");
const ridesSimpleLogin_1 = require("../scraper/ridesSimpleLogin");
const ridesLoginRobust_1 = require("../scraper/ridesLoginRobust");
const ridesInvestigate_1 = require("../scraper/ridesInvestigate");
const ridesAngularLogin_1 = require("../scraper/ridesAngularLogin");
const ridesAngularLoginSafe_1 = require("../scraper/ridesAngularLoginSafe");
const ridesDirectLogin_1 = require("../scraper/ridesDirectLogin");
const ridesSimpleEnter_1 = require("../scraper/ridesSimpleEnter");
const ridesNetworkCapture_1 = require("../scraper/ridesNetworkCapture");
const testEnvVars_1 = require("../scraper/testEnvVars");
const ridesScrapingSimple_1 = require("../scraper/ridesScrapingSimple");
const testCancelledRides_1 = require("../scraper/testCancelledRides");
const testCancelledRides2_1 = require("../scraper/testCancelledRides2");
const router = express_1.default.Router();
// Função para enviar dados para n8n
function sendToN8n(payload) {
    return __awaiter(this, void 0, void 0, function* () {
        const webhookUrl = process.env.N8N_WEBHOOK_URL;
        if (!webhookUrl || webhookUrl.includes('seu-n8n.com')) {
            console.log('⚠️ URL do webhook n8n não configurada, pulando envio...');
            return false;
        }
        try {
            console.log('📤 Enviando dados para n8n...');
            const response = yield axios_1.default.post(webhookUrl, payload, {
                headers: {
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            });
            console.log('✅ Dados enviados para n8n com sucesso!');
            return true;
        }
        catch (error) {
            console.error('❌ Erro ao enviar dados para n8n:', error);
            return false;
        }
    });
}
// Endpoint principal para scraping do Rides Dashboard
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🚀 Iniciando scraping do Rides Dashboard...');
        const { targetPageUrl, sendToN8n: shouldSendToN8n } = req.body;
        // Realizar o scraping
        const result = yield (0, ridesDashboardScraper_1.scrapeRidesDashboard)(targetPageUrl);
        // Enviar para n8n se solicitado
        if (shouldSendToN8n) {
            const n8nPayload = {
                source: 'rides-dashboard',
                data: result,
                timestamp: new Date().toISOString(),
                success: result.success,
                message: result.message
            };
            const n8nSent = yield sendToN8n(n8nPayload);
            res.json(Object.assign(Object.assign({}, result), { n8nDelivery: {
                    attempted: true,
                    success: n8nSent,
                    timestamp: new Date().toISOString()
                } }));
        }
        else {
            res.json(result);
        }
    }
    catch (error) {
        console.error('❌ Erro durante scraping:', error.message);
        const errorResult = {
            success: false,
            message: `Erro durante scraping: ${error.message}`,
            tables: [],
            scrapedAt: new Date().toISOString()
        };
        res.status(500).json(errorResult);
    }
}));
// Endpoint para testar conexão (apenas login)
router.post('/test-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🧪 Testando login no Rides Dashboard...');
        const { RidesDashboardScraper } = yield Promise.resolve().then(() => __importStar(require('../scraper/ridesDashboardScraper')));
        const scraper = new RidesDashboardScraper();
        yield scraper.initialize();
        const loginSuccess = yield scraper.login();
        yield scraper.close();
        res.json({
            success: loginSuccess,
            message: loginSuccess ? 'Login realizado com sucesso!' : 'Falha no login',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro durante teste de login:', error.message);
        res.status(500).json({
            success: false,
            message: `Erro durante teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para listar tabelas sem extrair dados (mais rápido)
router.post('/preview', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        console.log('👀 Preview de tabelas do Rides Dashboard...');
        const { targetPageUrl } = req.body;
        const { RidesDashboardScraper } = yield Promise.resolve().then(() => __importStar(require('../scraper/ridesDashboardScraper')));
        const scraper = new RidesDashboardScraper();
        yield scraper.initialize();
        const loginSuccess = yield scraper.login();
        if (!loginSuccess) {
            yield scraper.close();
            return res.status(401).json({
                success: false,
                message: 'Falha no login',
                timestamp: new Date().toISOString()
            });
        }
        if (targetPageUrl) {
            yield scraper.scrapeTablesFromPage(targetPageUrl);
        }
        // Contar tabelas sem extrair dados completos
        const tableCount = (yield ((_a = scraper.page) === null || _a === void 0 ? void 0 : _a.$$eval('table', tables => tables.length))) || 0;
        yield scraper.close();
        res.json({
            success: true,
            message: `${tableCount} tabelas encontradas`,
            tableCount,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro durante preview:', error.message);
        res.status(500).json({
            success: false,
            message: `Erro durante preview: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint simples para testar se o Playwright funciona
router.post('/test-browser', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🧪 Testando browser básico...');
        const browser = yield playwright_1.chromium.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = yield browser.newPage();
        yield page.goto('https://www.google.com');
        const title = yield page.title();
        yield browser.close();
        res.json({
            success: true,
            message: 'Browser funcionando!',
            title: title,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro no teste do browser:', error.message);
        res.status(500).json({
            success: false,
            message: `Erro no teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para teste simples do browser
router.post('/test-browser-simple', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🧪 Iniciando teste simples do browser...');
        const result = yield (0, testBrowser_1.testBrowserSimple)();
        res.json(Object.assign(Object.assign({}, result), { timestamp: new Date().toISOString() }));
    }
    catch (error) {
        console.error('❌ Erro no teste simples:', error.message);
        res.status(500).json({
            success: false,
            message: `Erro no teste simples: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para teste simples do Rides
router.post('/test-simple', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesTestSimple_1.testRidesSimple)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante teste simples: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para testar login funcional
router.post('/test-login-working', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesLoginWorking_1.testRidesLoginWorking)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para debug detalhado do login
router.post('/debug-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesDebug_1.debugRidesLogin)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante debug: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint simples para login
router.post('/simple-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesSimpleLogin_1.simpleRidesLogin)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para testar após login manual
router.post('/test-manual-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesSimpleLogin_1.testAfterManualLogin)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para testar login robusto
router.post('/test-login-robust', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesLoginRobust_1.testRidesLoginRobust)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante teste robusto: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para investigar formulário
router.post('/investigate-form', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesInvestigate_1.investigateRidesForm)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante investigação: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para testar login com AngularJS
router.post('/test-angular-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesAngularLogin_1.testRidesAngularLogin)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante teste Angular: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para teste de login AngularJS seguro
router.post('/test-angular-login-safe', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesAngularLoginSafe_1.testAngularLoginSafe)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para teste de login direto
router.post('/test-direct-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesDirectLogin_1.testDirectLogin)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante login direto: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para login simples com Enter
router.post('/test-enter-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesSimpleEnter_1.testSimpleEnterLogin)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante login com Enter: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para capturar requisições de rede
router.post('/capture-network', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesNetworkCapture_1.captureNetworkRequests)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante captura: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para scraping completo
router.post('/scrape-full', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, ridesScraperNew_1.scrapeRidesData)(process.env.RIDES_URL, process.env.RIDES_LOGIN, process.env.RIDES_PASSWORD);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante scraping completo: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para testar variáveis de ambiente
router.post('/test-env', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, testEnvVars_1.testEnvironmentVariables)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para scraping simples baseado no login que funciona
router.post('/scrape-simple', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('Iniciando scraping simples das 5 abas...');
        const result = yield (0, ridesScrapingSimple_1.scrapeAllRidesData)();
        res.json({
            success: result.success,
            data: result.data,
            message: result.message,
            summary: {
                totalTables: result.data.length,
                tablesWithData: result.data.filter(t => !t.isEmpty).length,
                emptyTables: result.data.filter(t => t.isEmpty).length,
                totalRecords: result.data.reduce((sum, table) => sum + table.rows.length, 0)
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            data: [],
            message: `Erro durante scraping simples: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para DEBUG específico da aba CANCELADOS
router.post('/test-cancelled-only', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🧪 Iniciando teste específico da aba CANCELADOS...');
        const result = yield (0, testCancelledRides_1.testCancelledRidesOnly)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// Endpoint para DEBUG avançado da aba CANCELADOS
router.post('/test-cancelled-advanced', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🧪 Iniciando teste AVANÇADO da aba CANCELADOS...');
        const result = yield (0, testCancelledRides2_1.testCancelledRidesAdvanced)();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante teste avançado: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
exports.default = router;
