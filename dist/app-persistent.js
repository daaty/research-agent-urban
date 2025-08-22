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
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: '.env.local' });
const express_1 = __importDefault(require("express"));
const logger_1 = require("./utils/logger");
// 🔧 Configurar logging
logger_1.logger.setConsoleLevel(logger_1.LogLevel.INFO); // Apenas INFO, WARN, ERROR no console
logger_1.logger.setFileLevel(logger_1.LogLevel.DEBUG); // Tudo nos arquivos
logger_1.logger.info('STARTUP', '🚀 Iniciando Research Agent Urban AI - Sistema Híbrido');
const ridesPersistentScraper_1 = require("./scraper/ridesPersistentScraper");
const driversPersistentScraper_1 = require("./scraper/driversPersistentScraper");
const monitoringService_1 = require("./services/monitoringService");
const config_1 = require("./config");
const axios_1 = __importDefault(require("axios"));
const databaseManager_1 = require("./services/databaseManager");
const dataTransformer_1 = require("./services/dataTransformer");
const driversDataTransformer_1 = require("./services/driversDataTransformer");
const aiAgentController_1 = require("./api/aiAgentController");
const api_1 = __importDefault(require("./api"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
// 🔄 API Routes - Controle de Recargas e Sistema Híbrido
app.use('/api', api_1.default);
// Instância do scraper persistente
const scraper = (0, ridesPersistentScraper_1.getPersistentScraper)();
// 🗄️ Instâncias do banco de dados
const databaseManager = databaseManager_1.DatabaseManager.getInstance();
const dataTransformer = dataTransformer_1.DataTransformer.getInstance();
// 📊 Instância do MonitoringService (Rides + Drivers integrado)
const monitoringService = new monitoringService_1.MonitoringService();
// 🤖 Instância do AI Agent Controller
const aiController = new aiAgentController_1.AIAgentController();
// 🔄 Função para processar resultado e enviar webhook
function processScrapingResult(result_1) {
    return __awaiter(this, arguments, void 0, function* (result, source = 'manual') {
        if (result.success) {
            console.log('✅ Scraping concluído com sucesso!');
            // 🗄️ NOVO: Armazenar dados no PostgreSQL
            try {
                if (databaseManager.isConnectedToDatabase()) {
                    if (result.hasChanges && result.differences && result.differences.length > 0) {
                        // Armazenar dados diferenciais (apenas mudanças)
                        console.log('💾 Salvando dados novos no PostgreSQL...');
                        yield dataTransformer.processDifferentialData(result.differences, source);
                        console.log('✅ Dados diferenciais salvos no PostgreSQL!');
                    }
                    else if (source === 'initial-execution') {
                        // ✅ Exceção: Na primeira execução sempre salvar dados completos
                        console.log('💾 Primeira execução - salvando dados completos no PostgreSQL...');
                        yield dataTransformer.processFullScrapingData(result.data, source);
                        console.log('✅ Dados iniciais salvos no PostgreSQL!');
                    }
                    else {
                        // ✅ NÃO salvar se não há mudanças - evitar duplicação
                        console.log('ℹ️ Nenhuma mudança detectada - dados não salvos no PostgreSQL');
                    }
                }
                else {
                    console.log('⚠️ PostgreSQL não conectado - dados não salvos no banco');
                }
            }
            catch (dbError) {
                console.error('❌ Erro ao salvar no PostgreSQL:', dbError);
                // Não interromper o fluxo se o banco falhar
            }
            // ⭐ LÓGICA: Enviar apenas dados novos para n8n
            if (config_1.config.n8nWebhookUrl && !config_1.config.n8nWebhookUrl.includes('seu-n8n.com')) {
                if (result.hasChanges && result.differences && result.differences.length > 0) {
                    try {
                        console.log('📤 Enviando APENAS dados novos para n8n...');
                        // Criar payload com apenas dados novos
                        const webhookPayload = {
                            timestamp: new Date().toISOString(),
                            source: `rides-dashboard-persistent-${source}`,
                            mode: 'persistent-browser',
                            sessionInfo: result.sessionInfo,
                            onlyNewData: true,
                            differences: result.differences,
                            summary: {
                                totalNewRecords: result.differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0),
                                totalUpdatedRecords: result.differences.reduce((sum, diff) => sum + diff.updatedRecords.length, 0),
                                totalRemovedRecords: result.differences.reduce((sum, diff) => sum + diff.removedRecords.length, 0),
                                tablesWithChanges: result.differences.length
                            }
                        };
                        yield axios_1.default.post(config_1.config.n8nWebhookUrl, webhookPayload);
                        const newRecords = webhookPayload.summary.totalNewRecords;
                        console.log(`✅ ${newRecords} novos registros enviados para n8n!`);
                    }
                    catch (error) {
                        console.error('❌ Erro ao enviar para n8n:', error);
                    }
                }
                else {
                    console.log('ℹ️ Nenhuma mudança detectada - webhook não enviado');
                }
            }
            else {
                console.log('⚠️ Webhook N8N não configurado ou URL inválida');
            }
        }
        return result;
    });
}
// 🏥 Health check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        message: '🚀 Scraper Persistente funcionando!',
        mode: 'persistent-browser',
        headlessMode: config_1.config.headlessMode,
        timestamp: new Date().toISOString()
    });
});
// 📊 Status detalhado do sistema
app.get('/api/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sessionStatus = yield scraper.getSessionStatus();
        res.json({
            status: 'online',
            mode: 'persistent',
            browser: {
                active: sessionStatus.browserActive,
                sessionValid: sessionStatus.sessionValid,
                message: sessionStatus.message
            },
            config: {
                headlessMode: config_1.config.headlessMode,
                n8nConfigured: config_1.config.n8nWebhookUrl && !config_1.config.n8nWebhookUrl.includes('seu-n8n.com')
            },
            availablePages: sessionStatus.availablePages,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🎯 ENDPOINT PRINCIPAL - Scraping com sessão persistente
app.post('/api/rides/scrape', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🚀 Iniciando scraping persistente...');
        const result = yield (0, ridesPersistentScraper_1.scrapeAllRidesDataPersistent)();
        // Processar resultado e enviar webhook se necessário
        yield processScrapingResult(result, 'api');
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                mode: 'persistent',
                sessionInfo: result.sessionInfo,
                hasChanges: result.hasChanges,
                onlyNewData: result.onlyNewData,
                differences: result.differences,
                data: result.data, // Dados completos para referência
                summary: {
                    totalTables: result.data.length,
                    tablesWithData: result.data.filter(table => !table.isEmpty).length,
                    tablesEmpty: result.data.filter(table => table.isEmpty).length,
                    totalRecords: result.data.reduce((sum, table) => sum + table.rows.length, 0),
                    newRecords: result.differences ? result.differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0) : 0,
                    timestamp: new Date().toISOString()
                }
            });
        }
        else {
            console.error('❌ Erro no scraping persistente:', result.message);
            res.status(500).json({
                success: false,
                message: result.message,
                mode: 'persistent',
                sessionInfo: result.sessionInfo,
                data: []
            });
        }
    }
    catch (error) {
        console.error('❌ Erro crítico no scraping persistente:', error);
        res.status(500).json({
            success: false,
            message: `Erro crítico durante scraping persistente: ${error.message}`,
            mode: 'persistent',
            data: []
        });
    }
}));
// 📄 Scraping de página específica
app.post('/api/rides/scrape-page', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { pageName } = req.body;
        if (!pageName) {
            return res.status(400).json({
                success: false,
                message: 'Nome da página é obrigatório',
                availablePages: scraper.getAvailablePages()
            });
        }
        console.log(`🎯 Scraping da página: ${pageName}`);
        const result = yield scraper.scrapeSinglePage(pageName);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro ao processar página: ${error.message}`,
            data: []
        });
    }
}));
// 🔄 Forçar novo login
app.post('/api/auth/force-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🔄 Forçando novo login...');
        const result = yield scraper.forceNewLogin();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro ao forçar login: ${error.message}`
        });
    }
}));
// 🧹 Limpeza completa
app.post('/api/system/cleanup', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🧹 Executando limpeza completa...');
        const result = yield scraper.cleanup();
        res.json(result);
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro durante limpeza: ${error.message}`
        });
    }
}));
// 📋 Listar páginas disponíveis
app.get('/api/rides/pages', (req, res) => {
    res.json({
        success: true,
        pages: scraper.getAvailablePages(),
        message: 'Lista de páginas disponíveis para scraping'
    });
});
// 🔄 Endpoint de teste rápido
app.get('/api/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const status = yield scraper.getSessionStatus();
        res.json({
            success: true,
            message: 'Teste executado com sucesso',
            browserStatus: status,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: `Erro no teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// � ================== ENDPOINTS DE DRIVERS ==================
// 🚗 Endpoint para scraping de drivers
app.get('/api/drivers/scrape', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🎯 [API] Iniciando scraping de drivers...');
        const result = yield (0, driversPersistentScraper_1.scrapeAllDriversDataPersistent)();
        if (result.success) {
            // Transformar e salvar dados
            const driversTransformer = driversDataTransformer_1.DriversDataTransformer.getInstance();
            const transformedData = yield driversTransformer.transformAndSave(result.data, result.sessionInfo, 'api-request', result.hasChanges || false);
            res.json({
                success: true,
                message: result.message,
                data: {
                    totalTables: result.data.length,
                    totalRecords: transformedData.totalRecords,
                    newRecords: transformedData.newRecords,
                    hasChanges: result.hasChanges || false,
                    tables: result.data.map(table => ({
                        name: table.name,
                        recordCount: table.isEmpty ? 0 : table.rows.length,
                        isEmpty: table.isEmpty
                    }))
                },
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: result.message,
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('❌ [API] Erro no scraping de drivers:', error.message);
        res.status(500).json({
            success: false,
            message: `Erro no scraping de drivers: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🎯 Endpoint para teste específico da página Active Drivers
app.get('/api/drivers/active/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🎯 [API] Testando scraping de Active Drivers...');
        // Importar classe diretamente para teste
        const { DriversPersistentScraper } = yield Promise.resolve().then(() => __importStar(require('./scraper/driversPersistentScraper')));
        const driverscraper = new DriversPersistentScraper();
        // Testar apenas a primeira página (Active Drivers)
        const result = yield driverscraper.scrapeAllDriversData();
        if (result.success && result.data.length > 0) {
            const activeDriversData = result.data.find(table => table.name === 'Active Drivers');
            res.json({
                success: true,
                message: 'Teste de Active Drivers concluído',
                data: {
                    tableName: (activeDriversData === null || activeDriversData === void 0 ? void 0 : activeDriversData.name) || 'Active Drivers',
                    headers: (activeDriversData === null || activeDriversData === void 0 ? void 0 : activeDriversData.headers) || [],
                    totalRecords: (activeDriversData === null || activeDriversData === void 0 ? void 0 : activeDriversData.rows.length) || 0,
                    sampleRecords: (activeDriversData === null || activeDriversData === void 0 ? void 0 : activeDriversData.rows.slice(0, 3)) || [], // Primeiros 3 registros como exemplo
                    isEmpty: (activeDriversData === null || activeDriversData === void 0 ? void 0 : activeDriversData.isEmpty) || true
                },
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: result.message,
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('❌ [API] Erro no teste de Active Drivers:', error.message);
        res.status(500).json({
            success: false,
            message: `Erro no teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🎯 Endpoint para teste específico da página Deactive Drivers
app.get('/api/drivers/deactive/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🎯 [API] Testando scraping de Deactive Drivers...');
        // Importar classe diretamente para teste
        const { DriversPersistentScraper } = yield Promise.resolve().then(() => __importStar(require('./scraper/driversPersistentScraper')));
        const driverscraper = new DriversPersistentScraper();
        // Testar apenas a página Deactive Drivers
        const result = yield driverscraper.scrapeAllDriversData();
        if (result.success && result.data.length > 0) {
            const deactiveDriversData = result.data.find(table => table.name === 'Deactive Drivers');
            res.json({
                success: true,
                message: 'Teste de Deactive Drivers concluído',
                data: {
                    tableName: (deactiveDriversData === null || deactiveDriversData === void 0 ? void 0 : deactiveDriversData.name) || 'Deactive Drivers',
                    headers: (deactiveDriversData === null || deactiveDriversData === void 0 ? void 0 : deactiveDriversData.headers) || [],
                    totalRecords: (deactiveDriversData === null || deactiveDriversData === void 0 ? void 0 : deactiveDriversData.rows.length) || 0,
                    sampleRecords: (deactiveDriversData === null || deactiveDriversData === void 0 ? void 0 : deactiveDriversData.rows.slice(0, 3)) || [], // Primeiros 3 registros como exemplo
                    isEmpty: (deactiveDriversData === null || deactiveDriversData === void 0 ? void 0 : deactiveDriversData.isEmpty) || true
                },
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: result.message,
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('❌ [API] Erro no teste de Deactive Drivers:', error.message);
        res.status(500).json({
            success: false,
            message: `Erro no teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🎯 Endpoint para teste específico da página Enrollment Drivers
app.get('/api/drivers/enrollment/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🎯 [API] Testando scraping de Drivers Enrollment...');
        // Importar classe diretamente para teste
        const { DriversPersistentScraper } = yield Promise.resolve().then(() => __importStar(require('./scraper/driversPersistentScraper')));
        const driverscraper = new DriversPersistentScraper();
        // Testar apenas a página Drivers Enrollment
        const result = yield driverscraper.scrapeAllDriversData();
        if (result.success && result.data.length > 0) {
            const enrollmentData = result.data.find(table => table.name === 'Drivers Enrollment');
            res.json({
                success: true,
                message: 'Teste de Drivers Enrollment concluído',
                data: {
                    tableName: (enrollmentData === null || enrollmentData === void 0 ? void 0 : enrollmentData.name) || 'Drivers Enrollment',
                    headers: (enrollmentData === null || enrollmentData === void 0 ? void 0 : enrollmentData.headers) || [],
                    totalRecords: (enrollmentData === null || enrollmentData === void 0 ? void 0 : enrollmentData.rows.length) || 0,
                    sampleRecords: (enrollmentData === null || enrollmentData === void 0 ? void 0 : enrollmentData.rows.slice(0, 3)) || [], // Primeiros 3 registros como exemplo
                    isEmpty: (enrollmentData === null || enrollmentData === void 0 ? void 0 : enrollmentData.isEmpty) || true
                },
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: result.message,
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('❌ [API] Erro no teste de Drivers Enrollment:', error.message);
        res.status(500).json({
            success: false,
            message: `Erro no teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🎯 Endpoint para teste específico da página Leaderboard
app.get('/api/drivers/leaderboard/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🎯 [API] Testando scraping de Leaderboard...');
        // Importar classe diretamente para teste
        const { DriversPersistentScraper } = yield Promise.resolve().then(() => __importStar(require('./scraper/driversPersistentScraper')));
        const driverscraper = new DriversPersistentScraper();
        // Testar apenas a página Leaderboard
        const result = yield driverscraper.scrapeAllDriversData();
        if (result.success && result.data.length > 0) {
            const leaderboardData = result.data.find(table => table.name === 'Leaderboard');
            res.json({
                success: true,
                message: 'Teste de Leaderboard concluído',
                data: {
                    tableName: (leaderboardData === null || leaderboardData === void 0 ? void 0 : leaderboardData.name) || 'Leaderboard',
                    headers: (leaderboardData === null || leaderboardData === void 0 ? void 0 : leaderboardData.headers) || [],
                    totalRecords: (leaderboardData === null || leaderboardData === void 0 ? void 0 : leaderboardData.rows.length) || 0,
                    sampleRecords: (leaderboardData === null || leaderboardData === void 0 ? void 0 : leaderboardData.rows.slice(0, 3)) || [], // Primeiros 3 registros como exemplo
                    isEmpty: (leaderboardData === null || leaderboardData === void 0 ? void 0 : leaderboardData.isEmpty) || true
                },
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: result.message,
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('❌ [API] Erro no teste de Leaderboard:', error.message);
        res.status(500).json({
            success: false,
            message: `Erro no teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🎯 Endpoint para teste específico da página Driver Performance
app.get('/api/drivers/performance/test', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🎯 [API] Testando scraping de Driver Performance...');
        // Importar classe diretamente para teste
        const { DriversPersistentScraper } = yield Promise.resolve().then(() => __importStar(require('./scraper/driversPersistentScraper')));
        const driverscraper = new DriversPersistentScraper();
        // Testar apenas a página Driver Performance
        const result = yield driverscraper.scrapeAllDriversData();
        if (result.success && result.data.length > 0) {
            const performanceData = result.data.find(table => table.name === 'Driver Performance');
            res.json({
                success: true,
                message: 'Teste de Driver Performance concluído',
                data: {
                    tableName: (performanceData === null || performanceData === void 0 ? void 0 : performanceData.name) || 'Driver Performance',
                    headers: (performanceData === null || performanceData === void 0 ? void 0 : performanceData.headers) || [],
                    totalRecords: (performanceData === null || performanceData === void 0 ? void 0 : performanceData.rows.length) || 0,
                    sampleRecords: (performanceData === null || performanceData === void 0 ? void 0 : performanceData.rows.slice(0, 3)) || [], // Primeiros 3 registros como exemplo
                    isEmpty: (performanceData === null || performanceData === void 0 ? void 0 : performanceData.isEmpty) || true
                },
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(500).json({
                success: false,
                message: result.message,
                sessionInfo: result.sessionInfo,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('❌ [API] Erro no teste de Driver Performance:', error.message);
        res.status(500).json({
            success: false,
            message: `Erro no teste: ${error.message}`,
            timestamp: new Date().toISOString()
        });
    }
}));
// 📋 Endpoint para listar páginas de drivers disponíveis
app.get('/api/drivers/pages', (req, res) => {
    const driversPages = [
        { name: 'Active Drivers', url: '#/app/active-drivers/' },
        { name: 'Deactive Drivers', url: '#/app/deactivated-drivers/' },
        { name: 'Drivers Enrollment', url: '#/app/selfEnrolled-driver/' },
        { name: 'Leaderboard', url: '#/app/driver-leaderboard/' },
        { name: 'Driver Performance', url: '#/app/high-cancellations/' }
    ];
    res.json({
        success: true,
        pages: driversPages,
        message: 'Lista de páginas de drivers disponíveis para scraping'
    });
});
// �🗂️ ENDPOINT - Gerenciar cache de dados
app.get('/api/cache/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield scraper.getCacheStats();
        res.json({
            success: true,
            cache: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao obter estatísticas do cache:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🗂️ ENDPOINT - Limpar cache
app.post('/api/cache/clear', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        scraper.clearCache();
        res.json({
            success: true,
            message: 'Cache limpo com sucesso',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao limpar cache:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🧪 ENDPOINT - Simular webhook (somente dados novos)
app.post('/api/rides/simulate-webhook', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🧪 Simulando webhook com dados novos...');
        const result = yield (0, ridesPersistentScraper_1.scrapeAllRidesDataPersistent)();
        if (result.success && result.hasChanges && result.differences) {
            const webhookPayload = {
                timestamp: new Date().toISOString(),
                source: 'rides-dashboard-persistent',
                mode: 'persistent-browser',
                sessionInfo: result.sessionInfo,
                onlyNewData: true,
                differences: result.differences,
                summary: {
                    totalNewRecords: result.differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0),
                    totalUpdatedRecords: result.differences.reduce((sum, diff) => sum + diff.updatedRecords.length, 0),
                    totalRemovedRecords: result.differences.reduce((sum, diff) => sum + diff.removedRecords.length, 0),
                    tablesWithChanges: result.differences.length
                }
            };
            res.json({
                success: true,
                message: 'Webhook simulado com dados novos',
                payload: webhookPayload,
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.json({
                success: true,
                message: 'Nenhuma mudança detectada - webhook não seria enviado',
                hasChanges: result.hasChanges,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('❌ Erro ao simular webhook:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🔐 ENDPOINT - Verificar status de login com captcha
app.get('/api/rides/login-status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const sessionStatus = yield scraper.getSessionStatus();
        res.json({
            success: true,
            status: sessionStatus,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao verificar status de login:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🔐 ENDPOINT - Aguardar login manual (para captcha)
app.post('/api/rides/wait-manual-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { timeout = 300000 } = req.body; // 5 minutos por padrão
        console.log('⏳ Aguardando login manual...');
        const result = yield scraper.waitForManualLogin(timeout);
        if (result) {
            res.json({
                success: true,
                message: 'Login manual detectado com sucesso!',
                timestamp: new Date().toISOString()
            });
        }
        else {
            res.status(408).json({
                success: false,
                message: 'Timeout aguardando login manual',
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('❌ Erro ao aguardar login manual:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🔐 ENDPOINT - Abrir navegador para login manual
app.post('/api/rides/open-browser-login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🌐 Abrindo navegador para login manual...');
        // Garantir que o browser está inicializado
        yield scraper.initializeBrowser();
        // Navegar para página de login
        const page = scraper.getPage();
        if (page) {
            const loginUrl = process.env.RIDES_LOGIN_URL || 'https://rides.ec2dashboard.com/#/page/login';
            yield page.goto(loginUrl, {
                waitUntil: 'domcontentloaded'
            });
        }
        const sessionStatus = yield scraper.getSessionStatus();
        res.json({
            success: true,
            message: 'Navegador aberto na página de login',
            status: sessionStatus,
            instructions: [
                '1. Faça login manualmente no navegador que foi aberto',
                '2. Resolva o captcha se necessário',
                '3. Aguarde até estar logado no dashboard',
                '4. Use o endpoint /api/rides/wait-manual-login para aguardar confirmação',
                '5. Ou use /api/rides/login-status para verificar o status'
            ],
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao abrir navegador:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🗄️ ENDPOINTS DO BANCO DE DADOS
// Estatísticas do PostgreSQL
app.get('/api/database/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!databaseManager.isConnectedToDatabase()) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não conectado'
            });
        }
        const stats = yield dataTransformer.getDatabaseStats();
        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao obter estatísticas do banco:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// Dados recentes (últimas 24h)
app.get('/api/database/recent', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!databaseManager.isConnectedToDatabase()) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não conectado'
            });
        }
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        const rides = yield databaseManager.getRidesByDateRange(startDate, endDate);
        res.json({
            success: true,
            data: rides,
            count: rides.length,
            period: 'last_24_hours',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao buscar dados recentes:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// Teste de conexão com PostgreSQL
app.get('/api/database/test-connection', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isConnected = databaseManager.isConnectedToDatabase();
        if (!isConnected) {
            // Tentar reconectar
            yield databaseManager.initialize();
        }
        const stats = yield databaseManager.getDatabaseStats();
        res.json({
            success: true,
            isConnected: true,
            stats,
            message: 'Conexão com PostgreSQL funcionando',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro na conexão com PostgreSQL:', error);
        res.status(500).json({
            success: false,
            isConnected: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// Dados para dashboard (agregados)
app.get('/api/database/dashboard', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!databaseManager.isConnectedToDatabase()) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não conectado'
            });
        }
        const stats = yield databaseManager.getDatabaseStats();
        // Buscar dados dos últimos 7 dias
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentRides = yield databaseManager.getRidesByDateRange(startDate, endDate);
        // Agrupar dados por tabela e dia
        const dataByTable = recentRides.reduce((acc, ride) => {
            var _a;
            const tableName = ride.table_name;
            const day = ride.scraped_at.toISOString().split('T')[0];
            if (!acc[tableName]) {
                acc[tableName] = {};
            }
            if (!acc[tableName][day]) {
                acc[tableName][day] = 0;
            }
            // Contar registros (assumindo que ride_data.rows existe)
            const rideData = typeof ride.ride_data === 'string'
                ? JSON.parse(ride.ride_data)
                : ride.ride_data;
            acc[tableName][day] += ((_a = rideData.rows) === null || _a === void 0 ? void 0 : _a.length) || 0;
            return acc;
        }, {});
        res.json({
            success: true,
            dashboardData: {
                overview: stats,
                last7Days: dataByTable,
                recentRides: recentRides.slice(0, 10), // Últimos 10 registros
                period: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                }
            },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao obter dados do dashboard:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// Buscar dados por período específico
app.post('/api/database/query', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!databaseManager.isConnectedToDatabase()) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não conectado'
            });
        }
        const { startDate, endDate, tableName } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate e endDate são obrigatórios'
            });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Datas inválidas'
            });
        }
        const rides = yield databaseManager.getRidesByDateRange(start, end, tableName);
        res.json({
            success: true,
            data: rides,
            count: rides.length,
            period: { startDate, endDate, tableName },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao buscar dados por período:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 📊 Endpoint para dados pessoais de motoristas
app.get('/api/database/driver-personal/:driverId?', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { driverId } = req.params;
        if (driverId) {
            // Buscar dados de um motorista específico
            const driverData = yield databaseManager.getDriverPersonalDetails(driverId);
            if (driverData) {
                res.json({
                    success: true,
                    driver: driverData,
                    timestamp: new Date().toISOString()
                });
            }
            else {
                res.status(404).json({
                    success: false,
                    message: `Dados pessoais do motorista ${driverId} não encontrados`,
                    timestamp: new Date().toISOString()
                });
            }
        }
        else {
            // Listar todos os drivers com dados pessoais
            const allDrivers = yield databaseManager.getAllDriversPersonalDetails();
            res.json({
                success: true,
                drivers: allDrivers,
                count: allDrivers.length,
                timestamp: new Date().toISOString()
            });
        }
    }
    catch (error) {
        console.error('❌ Erro ao buscar dados pessoais de motoristas:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 🤖 ============= ROTAS DO AI AGENT =============
// Inicializar AI Agent
app.post('/api/ai/initialize', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield aiController.initializeAI(req, res);
}));
// Executar comando em linguagem natural
app.post('/api/ai/execute', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield aiController.executeCommand(req, res);
}));
// Navegar para URL específica
app.post('/api/ai/navigate', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield aiController.navigateToUrl(req, res);
}));
// Extrair dados da página atual
app.post('/api/ai/extract', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield aiController.extractData(req, res);
}));
// Analisar página atual
app.post('/api/ai/analyze', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield aiController.analyzePage(req, res);
}));
// Automação complexa (workflows)
app.post('/api/ai/workflow', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield aiController.complexAutomation(req, res);
}));
// Status do AI Agent
app.get('/api/ai/status', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield aiController.getStatus(req, res);
}));
// Limpar histórico do AI
app.post('/api/ai/clear', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    yield aiController.clearHistory(req, res);
}));
// 🤖 ===============================================
// Inicializar servidor
// 🚀 NOVOS ENDPOINTS PARA SISTEMA HÍBRIDO
const hybridOperationServiceV2_1 = require("./services/hybridOperationServiceV2");
// 🔄 Instância do Sistema Híbrido
const hybridService = hybridOperationServiceV2_1.HybridOperationService.getInstance({
    extractionBatchSize: 1, // Alterado para 1 - processar apenas uma extração por ciclo
    rechargePauseThreshold: 1,
    maxConcurrentRecharges: 3,
    stateCheckInterval: 8000, // Aumentado de 5000 para 8000ms (8 segundos entre ciclos)
    recoveryOnStart: true,
    autoFeedInterval: 60000,
    citiesRefreshInterval: 300000
});
// 🚀 Iniciar Sistema Híbrido
app.post('/api/hybrid/start', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🚀 Iniciando Sistema Híbrido via API...');
        yield hybridService.start();
        res.json({
            success: true,
            message: 'Sistema híbrido iniciado com sucesso',
            status: hybridService.getStats(),
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao iniciar sistema híbrido:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// ⏹️ Parar Sistema Híbrido
app.post('/api/hybrid/stop', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('⏹️ Parando Sistema Híbrido via API...');
        yield hybridService.stop();
        res.json({
            success: true,
            message: 'Sistema híbrido parado com sucesso',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao parar sistema híbrido:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 📊 Status do Sistema Híbrido
app.get('/api/hybrid/status', (req, res) => {
    try {
        const status = hybridService.getStats();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// 🔋 Adicionar Solicitação de Recarga
app.post('/api/hybrid/recharge', (req, res) => {
    try {
        const { driverId, amount, priority = 'normal' } = req.body;
        if (!driverId || !amount) {
            return res.status(400).json({
                success: false,
                error: 'driverId e amount são obrigatórios',
                timestamp: new Date().toISOString()
            });
        }
        hybridService.addRechargeToQueue(driverId, amount, priority === 'urgent');
        res.json({
            success: true,
            message: `Recarga adicionada à fila: ${driverId} -> R$ ${amount}`,
            driverId,
            amount,
            priority,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// 📋 Adicionar IDs para Extração
app.post('/api/hybrid/add-drivers', (req, res) => {
    try {
        const { driverIds, priority = 'normal' } = req.body;
        if (!driverIds || !Array.isArray(driverIds)) {
            return res.status(400).json({
                success: false,
                error: 'driverIds deve ser um array',
                timestamp: new Date().toISOString()
            });
        }
        // Adicionar cada ID individualmente 
        driverIds.forEach((driverId) => {
            hybridService.addDriverToQueue(driverId, priority);
        });
        res.json({
            success: true,
            message: `${driverIds.length} IDs adicionados à fila de extração`,
            driverIds,
            priority,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});
// ⏸️ Pausar Sistema Híbrido (Nota: Funcionalidade controlada automaticamente)
app.post('/api/hybrid/pause', (req, res) => {
    res.json({
        success: true,
        message: 'Sistema híbrido controla pausas automaticamente durante recargas',
        note: 'Use /api/hybrid/stop para parar completamente',
        timestamp: new Date().toISOString()
    });
});
// ▶️ Resumir Sistema Híbrido (Nota: Funcionalidade controlada automaticamente)
app.post('/api/hybrid/resume', (req, res) => {
    res.json({
        success: true,
        message: 'Sistema híbrido resume automaticamente após recargas',
        note: 'Use /api/hybrid/start para iniciar se parado',
        timestamp: new Date().toISOString()
    });
});
// 🚨 Parada de Emergência (Use o método stop padrão)
app.post('/api/hybrid/emergency-stop', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🚨 PARADA DE EMERGÊNCIA ATIVADA VIA API - Usando stop()');
        yield hybridService.stop();
        res.json({
            success: true,
            message: 'Sistema híbrido parado (método padrão usado)',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 📊 Consultar Dados Pessoais Salvos
app.get('/api/personal-data/drivers', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const drivers = yield databaseManager.getAllDriversPersonalDetails();
        res.json({
            success: true,
            data: drivers,
            count: drivers.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// 📈 Estatísticas dos Dados Pessoais
app.get('/api/personal-data/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Usar o método existente
        const allDrivers = yield databaseManager.getAllDriversPersonalDetails();
        // Calcular estatísticas manualmente
        const stats = {
            total_drivers: allDrivers.length,
            by_city: allDrivers.reduce((acc, driver) => {
                const city = driver.city || 'Unknown';
                acc[city] = (acc[city] || 0) + 1;
                return acc;
            }, {}),
            extracted_today: allDrivers.filter((driver) => {
                var _a;
                const today = new Date().toISOString().split('T')[0];
                return (_a = driver.extracted_at) === null || _a === void 0 ? void 0 : _a.startsWith(today);
            }).length
        };
        res.json({
            success: true,
            data: stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
// Auto-inicialização (sem mudanças)
app.listen(PORT, () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('🎉' + '='.repeat(70));
    console.log(`🚀 SERVIDOR PERSISTENTE FUNCIONANDO NA PORTA ${PORT}`);
    console.log('🎉' + '='.repeat(70));
    console.log(`📋 ENDPOINTS DISPONÍVEIS:`);
    console.log(`- GET  /                        (status geral)`);
    console.log(`- GET  /api/status              (status detalhado)`);
    console.log(`- POST /api/rides/scrape        (🎯 SCRAPER PRINCIPAL)`);
    console.log(`- POST /api/rides/scrape-page   (scraping página específica)`);
    console.log(`- POST /api/auth/force-login    (forçar novo login)`);
    console.log(`- POST /api/system/cleanup      (limpeza completa)`);
    console.log(`- GET  /api/rides/pages         (listar páginas)`);
    console.log(`- POST /api/scheduler/start     (execução automática)`);
    console.log(`- POST /api/scheduler/stop      (parar execução automática)`);
    console.log(`- GET  /api/test                (teste rápido)`);
    console.log('🤖' + '='.repeat(70));
    console.log('🤖 NOVOS ENDPOINTS AI AGENT:');
    console.log(`- POST /api/ai/initialize       (inicializar AI Agent)`);
    console.log(`- POST /api/ai/execute          (comandos em linguagem natural)`);
    console.log(`- POST /api/ai/navigate         (navegar com AI)`);
    console.log(`- POST /api/ai/extract          (extrair dados via AI)`);
    console.log(`- POST /api/ai/analyze          (analisar página atual)`);
    console.log(`- POST /api/ai/workflow         (automação complexa)`);
    console.log(`- GET  /api/ai/status           (status do AI Agent)`);
    console.log(`- POST /api/ai/clear            (limpar histórico AI)`);
    console.log('🤖' + '='.repeat(70));
    console.log('🗄️  NOVOS ENDPOINTS POSTGRESQL:');
    console.log(`- GET  /api/database/stats           (estatísticas do banco)`);
    console.log(`- GET  /api/database/recent          (dados últimas 24h)`);
    console.log(`- GET  /api/database/test-connection (testar conexão)`);
    console.log(`- GET  /api/database/dashboard       (dados para dashboard)`);
    console.log(`- POST /api/database/query           (buscar por período)`);
    console.log('🎉' + '='.repeat(70));
    console.log(`🖥️  Modo: BROWSER PERSISTENTE`);
    console.log(`🖥️  Visual: ${!config_1.config.headlessMode ? 'HABILITADO ✅' : 'Desabilitado'}`);
    // 🔄 Verificar se scraping automático está habilitado
    const isAutoScrapingEnabled = process.env.ENABLE_AUTO_SCRAPING === 'true';
    console.log(`🔄  Auto-execução: ${isAutoScrapingEnabled ? 'ATIVANDO EM 30 SEGUNDOS...' : '⚠️ DESABILITADO'}`);
    console.log('🎉' + '='.repeat(70));
    // 🗄️ INICIALIZAR POSTGRESQL
    console.log('💾 Inicializando conexão com PostgreSQL...');
    try {
        yield databaseManager.initialize();
        console.log('✅ PostgreSQL conectado e pronto!');
    }
    catch (error) {
        console.error('❌ Erro ao conectar PostgreSQL:', error);
        console.log('⚠️ Sistema continuará funcionando sem banco de dados');
    }
    // 🚀 AUTO-INICIALIZAÇÃO (apenas se habilitada)
    if (isAutoScrapingEnabled) {
        const autoStartHybrid = process.env.AUTO_START_HYBRID === 'true';
        // Log detalhado para arquivo
        logger_1.logger.debug('AUTO', `Variáveis de ambiente: ENABLE_AUTO_SCRAPING=${process.env.ENABLE_AUTO_SCRAPING}, AUTO_START_HYBRID=${process.env.AUTO_START_HYBRID}`);
        logger_1.logger.debug('AUTO', `Flags calculadas: isAutoScrapingEnabled=${isAutoScrapingEnabled}, autoStartHybrid=${autoStartHybrid}`);
        // Log resumido para console
        logger_1.logger.info('AUTO', `Auto-start configurado - MonitoringService: SIM | HybridService: ${autoStartHybrid ? 'SIM' : 'NÃO'}`);
        logger_1.logger.info('AUTO', 'Aguardando 30 segundos para inicialização...');
        setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
            try {
                logger_1.logger.info('AUTO', 'Iniciando scrapers automáticos...');
                // Verificar se credenciais estão configuradas
                if (!process.env.RIDES_USERNAME || process.env.RIDES_USERNAME.includes('seu_email') ||
                    !process.env.RIDES_PASSWORD || process.env.RIDES_PASSWORD.includes('sua_senha')) {
                    logger_1.logger.warn('AUTO', 'Credenciais não configuradas - aguardando configuração manual');
                    return;
                }
                // ✅ MonitoringService e HybridOperationService em paralelo
                logger_1.logger.info('MONITORING', 'Iniciando MonitoringService...');
                // 🚀 Iniciar híbrido em paralelo (não aguardar MonitoringService)
                if (autoStartHybrid) {
                    logger_1.logger.info('HYBRID', 'Iniciando Sistema Híbrido...');
                    hybridService.start().then(() => {
                        logger_1.logger.success('HYBRID', 'Sistema Híbrido iniciado com sucesso');
                    }).catch(err => {
                        logger_1.logger.error('HYBRID', 'Erro ao iniciar Sistema Híbrido', err);
                    });
                }
                else {
                    logger_1.logger.info('HYBRID', 'Sistema Híbrido não será iniciado automaticamente (AUTO_START_HYBRID=false)');
                }
                try {
                    // Executar uma vez imediatamente
                    yield monitoringService.runOnce();
                    logger_1.logger.success('MONITORING', 'Execução inicial de Rides + Drivers concluída');
                    // 🔄 Iniciar monitoramento automático
                    monitoringService.startMonitoring();
                    logger_1.logger.success('MONITORING', 'Monitoramento automático iniciado (frequência: 2,5 min)');
                }
                catch (error) {
                    logger_1.logger.error('MONITORING', 'Erro na execução inicial', error);
                    logger_1.logger.info('MONITORING', 'Tentando fallback...');
                    try {
                        const result = yield (0, ridesPersistentScraper_1.scrapeAllRidesDataPersistent)();
                        if (result.success) {
                            logger_1.logger.success('MONITORING', 'Fallback concluído com sucesso');
                            yield processScrapingResult(result, 'initial-execution');
                        }
                        else {
                            logger_1.logger.error('MONITORING', `Falha no fallback: ${result.message}`);
                        }
                    }
                    catch (fallbackError) {
                        logger_1.logger.error('MONITORING', 'Erro no fallback', fallbackError);
                    }
                }
            }
            catch (error) {
                logger_1.logger.error('AUTO', 'Erro na auto-inicialização', error);
                logger_1.logger.info('AUTO', 'Use os endpoints /api/rides/scrape ou /api/hybrid/start para execução manual');
            }
        }), 30000);
    }
    else {
        logger_1.logger.info('AUTO', 'Auto-execução DESABILITADA (ENABLE_AUTO_SCRAPING=false)');
        logger_1.logger.info('AUTO', 'Use os endpoints para execução manual quando necessário');
    }
}));
// Limpeza na saída do processo
process.on('SIGINT', () => __awaiter(void 0, void 0, void 0, function* () {
    console.log('\n🔄 Recebido sinal de interrupção...');
    console.log('🧹 Executando limpeza final...');
    try {
        console.log('✅ Limpeza concluída');
    }
    catch (error) {
        console.error('❌ Erro na limpeza:', error);
    }
    console.log('👋 Servidor encerrado');
    process.exit(0);
}));
exports.default = app;
