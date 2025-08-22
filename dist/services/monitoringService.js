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
exports.MonitoringService = void 0;
const cron = __importStar(require("node-cron"));
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = require("crypto");
const ridesPersistentScraper_1 = require("../scraper/ridesPersistentScraper");
const driversPersistentScraper_1 = require("../scraper/driversPersistentScraper");
const driversDataTransformer_1 = require("./driversDataTransformer");
const dataCacheManager_1 = require("./dataCacheManager"); // ⭐ INTEGRAR SISTEMA DE CACHE SOFISTICADO
const databaseManager_1 = require("./databaseManager"); // ⭐ INTEGRAR SALVAMENTO NO BANCO
const logger_1 = require("../utils/logger");
class MonitoringService {
    constructor() {
        this.previousData = [];
        this.isRunning = false;
        this.cronTasks = [];
        this.lastRawData = []; // ⭐ ARMAZENAR ÚLTIMOS DADOS PARA WEBHOOK
        this.dataFilePath = path_1.default.join(__dirname, '../../data/previous-rides-data.json');
        this.cacheManager = dataCacheManager_1.DataCacheManager.getInstance(); // ⭐ INICIALIZAR CACHE MANAGER
        this.logger = logger_1.Logger.getInstance(); // ⭐ INICIALIZAR LOGGER
        this.databaseManager = databaseManager_1.DatabaseManager.getInstance(); // ⭐ INICIALIZAR DATABASE MANAGER
        this.loadPreviousData();
        this.initializeDatabase(); // ⭐ INICIALIZAR CONEXÃO COM BANCO
    }
    initializeDatabase() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.databaseManager.initialize();
                console.log('✅ DatabaseManager inicializado no MonitoringService');
            }
            catch (error) {
                console.error('❌ Erro ao inicializar DatabaseManager no MonitoringService:', error);
            }
        });
    }
    loadPreviousData() {
        // ⭐ MÉTODO MANTIDO POR COMPATIBILIDADE - CACHE REAL É GERENCIADO PELO DataCacheManager
        try {
            if (fs_1.default.existsSync(this.dataFilePath)) {
                const data = fs_1.default.readFileSync(this.dataFilePath, 'utf-8');
                this.previousData = JSON.parse(data);
                console.log(`✅ Dados anteriores carregados: ${this.previousData.length} registros (compatibilidade)`);
            }
            else {
                console.log('📁 Sistema de cache sofisticado ativo - DataCacheManager em uso');
                // Criar diretório se não existir
                const dir = path_1.default.dirname(this.dataFilePath);
                if (!fs_1.default.existsSync(dir)) {
                    fs_1.default.mkdirSync(dir, { recursive: true });
                }
            }
        }
        catch (error) {
            console.error('❌ Erro ao carregar dados anteriores:', error);
            this.previousData = [];
        }
    }
    savePreviousData(data) {
        // ⭐ MÉTODO MANTIDO POR COMPATIBILIDADE - CACHE REAL É GERENCIADO PELO DataCacheManager
        try {
            fs_1.default.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2));
            console.log(`💾 Dados salvos: ${data.length} registros (compatibilidade)`);
        }
        catch (error) {
            console.error('❌ Erro ao salvar dados:', error);
        }
    }
    generateRideId(ride) {
        // Gera um ID único baseado nos dados da corrida
        const key = `${ride.driver || ''}_${ride.passenger || ''}_${ride.date || ''}_${ride.time || ''}_${ride.route || ''}`;
        return Buffer.from(key).toString('base64').substring(0, 16);
    }
    // ⭐ NOVO MÉTODO: Extrair ID único como o DataTransformer
    extractRideId(ride) {
        // Se o ride já tem um formato estruturado (com campos separados)
        if (ride.driver || ride.passenger || ride.date) {
            const idComponents = [];
            if (ride.driver)
                idComponents.push(`driver:${ride.driver}`);
            if (ride.passenger)
                idComponents.push(`passenger:${ride.passenger}`);
            if (ride.date)
                idComponents.push(`date:${ride.date}`);
            if (ride.time)
                idComponents.push(`time:${ride.time}`);
            if (ride.route)
                idComponents.push(`route:${ride.route}`);
            if (idComponents.length >= 2) {
                const combinedKey = idComponents.join('|');
                return (0, crypto_1.createHash)('md5').update(combinedKey).digest('hex').substring(0, 16);
            }
        }
        // Fallback: usar hash do objeto inteiro (excluindo timestamp)
        const cleanRide = Object.assign({}, ride);
        delete cleanRide.scraped_at;
        delete cleanRide.timestamp;
        const fallbackKey = JSON.stringify(cleanRide);
        return (0, crypto_1.createHash)('md5').update(fallbackKey).digest('hex').substring(0, 16);
    }
    generateDataHash(rideData) {
        // Gerar hash baseado APENAS nos dados da corrida (SEM timestamp para evitar duplicação)
        const hashData = {
            table_name: rideData.table_name || 'unknown',
            data: JSON.stringify(rideData)
            // ⭐ REMOVIDO TIMESTAMP - estava causando duplicações na DB
        };
        const dataString = JSON.stringify(hashData);
        return (0, crypto_1.createHash)('md5').update(dataString).digest('hex');
    }
    normalizeRideData(rawData) {
        return rawData.map(ride => (Object.assign({ id: this.generateRideId(ride), driver: ride.driver || ride.motorista || '', passenger: ride.passenger || ride.passageiro || '', status: ride.status || ride.situacao || '', date: ride.date || ride.data || '', time: ride.time || ride.hora || '', route: ride.route || ride.rota || ride.origem_destino || '', price: ride.price || ride.preco || ride.valor || '' }, ride)));
    }
    detectChanges(scrapingData) {
        const timestamp = new Date().toISOString();
        // ⭐ USAR SISTEMA DE CACHE SOFISTICADO PARA DETECTAR MUDANÇAS
        const cacheResult = this.cacheManager.compareAndGetDifferences(scrapingData);
        // Converter para formato compatível com MonitoringResult
        const newRecords = [];
        const updatedRecords = [];
        const cancelledRecords = [];
        const completedRecords = [];
        // Processar diferenças do cache manager
        cacheResult.differences.forEach(diff => {
            diff.newRecords.forEach(row => {
                const ride = this.convertRowToRideData(row, diff.tableName);
                newRecords.push(ride);
                // Verificar se é cancelamento ou conclusão baseado no status
                if (ride.status.toLowerCase().includes('cancel')) {
                    cancelledRecords.push(ride);
                }
                else if (ride.status.toLowerCase().includes('concluí') ||
                    ride.status.toLowerCase().includes('finaliz')) {
                    completedRecords.push(ride);
                }
            });
            diff.updatedRecords.forEach(row => {
                const ride = this.convertRowToRideData(row, diff.tableName);
                updatedRecords.push(ride);
            });
        });
        // Calcular total de registros atuais
        const totalRecords = scrapingData.reduce((sum, table) => sum + table.rows.length, 0);
        return {
            timestamp,
            totalRecords,
            newRecords,
            updatedRecords,
            cancelledRecords,
            completedRecords,
            summary: {
                newCount: newRecords.length,
                updatedCount: updatedRecords.length,
                cancelledCount: cancelledRecords.length,
                completedCount: completedRecords.length
            }
        };
    }
    // ⭐ NOVO MÉTODO: Converter linha de tabela para RideData
    convertRowToRideData(row, tableName) {
        // Mapear colunas baseado no nome da tabela ou assumir formato padrão
        const rideData = {
            table_name: tableName
        };
        // Assumir formato padrão das colunas (ajustar conforme necessário)
        if (row.length >= 4) {
            rideData.driver = row[0] || '';
            rideData.passenger = row[1] || '';
            rideData.route = row[2] || '';
            rideData.status = row[3] || '';
            rideData.date = row[4] || '';
            rideData.time = row[5] || '';
            rideData.price = row[6] || '';
        }
        return Object.assign({ id: this.generateRideId(rideData), driver: rideData.driver || rideData.motorista || '', passenger: rideData.passenger || rideData.passageiro || '', status: rideData.status || rideData.situacao || '', date: rideData.date || rideData.data || '', time: rideData.time || rideData.hora || '', route: rideData.route || rideData.rota || rideData.origem_destino || '', price: rideData.price || rideData.preco || rideData.valor || '' }, rideData);
    }
    sendToN8n(result) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a;
            try {
                const webhookUrl = process.env.N8N_WEBHOOK_URL;
                if (!webhookUrl) {
                    console.log('⚠️ N8N_WEBHOOK_URL não configurado no .env');
                    return;
                }
                const payload = Object.assign(Object.assign({}, result), { hasChanges: result.summary.newCount > 0 ||
                        result.summary.updatedCount > 0 ||
                        result.summary.cancelledCount > 0 ||
                        result.summary.completedCount > 0, metadata: {
                        scraperVersion: '3.0.0', // ⭐ ATUALIZAR VERSÃO
                        source: 'rides-dashboard-monitoring-v3',
                        environment: process.env.NODE_ENV || 'development',
                        cacheSystemEnabled: true // ⭐ INDICAR QUE USA SISTEMA DE CACHE
                    } });
                // ⭐ LÓGICA CORRETA: Enviar sempre se há dados, ou se há mudanças detectadas
                if (!payload.hasChanges && this.lastRawData.length === 0) {
                    this.logger.info('MONITORING', 'Pulando envio para n8n (sem mudanças detectadas pelo sistema de cache)');
                    return;
                }
                // ⭐ FORÇAR ENVIO se há dados mas cache não detectou mudanças (primeira execução)
                if (!payload.hasChanges && this.lastRawData.length > 0) {
                    this.logger.info('MONITORING', 'Forçando envio para n8n (primeira execução com dados)');
                    payload.hasChanges = true;
                }
                this.logger.success('MONITORING', `Enviando para n8n: ${JSON.stringify(result.summary)}`);
                const response = yield axios_1.default.post(webhookUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Rides-Scraper-Bot/3.0.0'
                    },
                    timeout: 30000
                });
                this.logger.success('MONITORING', `Dados enviados para n8n: ${response.status}`);
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error) && ((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 404) {
                    console.log('⚠️ n8n webhook não encontrado (404) - Verifique se o workflow está ativo');
                }
                else {
                    console.error('❌ Erro ao enviar para n8n:', error instanceof Error ? error.message : error);
                }
            }
        });
    }
    performScraping() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                this.logger.warn('MONITORING', 'Scraping já em execução, pulando...');
                return;
            }
            this.isRunning = true;
            this.logger.info('MONITORING', `Iniciando scraping (rides + drivers)...`);
            try {
                // ⭐ VERIFICAR SE O BANCO ESTÁ CONECTADO
                if (!this.databaseManager.isConnectedToDatabase()) {
                    this.logger.warn('MONITORING', 'Banco de dados não conectado, tentando reconectar...');
                    yield this.databaseManager.initialize();
                }
                // 1. EXECUTAR SCRAPING DE RIDES
                this.logger.info('MONITORING', 'Executando scraping de rides...');
                const scrapingResult = yield (0, ridesPersistentScraper_1.scrapeAllRidesDataPersistent)();
                if (!scrapingResult.success || !scrapingResult.data || scrapingResult.data.length === 0) {
                    this.logger.warn('MONITORING', `Nenhum dado de rides extraído: ${scrapingResult.message}`);
                    return;
                }
                // 🔧 ADAPTAÇÃO PARA ESTRUTURA ATUAL DO BANCO
                // Processar dados para formato compatível: {tableName, newRecords}
                const adaptedData = [];
                const rawData = []; // Para compatibilidade com cache/webhook
                this.logger.info('MONITORING', `Processando ${scrapingResult.data.length} tabelas de dados para estrutura compatível...`);
                scrapingResult.data.forEach((table) => {
                    var _a;
                    this.logger.debug('MONITORING', `Tabela: ${table.name}, Rows: ${((_a = table.rows) === null || _a === void 0 ? void 0 : _a.length) || 0}, isEmpty: ${table.isEmpty}`);
                    // ⭐ ADAPTAÇÃO: Ignorar isEmpty - só verificar se há rows
                    if (table.rows && table.rows.length > 0) {
                        this.logger.info('MONITORING', `Processando ${table.rows.length} registros da tabela ${table.name}`);
                        // 🔧 NOVO FORMATO: Estrutura compatível com dados existentes
                        const adaptedTableData = {
                            tableName: table.name, // Nome da página/aba
                            newRecords: table.rows.map((row) => {
                                // 🚫 FILTRAR VALORES INVÁLIDOS (NaN, null, undefined)
                                return row.map(cell => {
                                    if (cell === null || cell === undefined ||
                                        (typeof cell === 'number' && Number.isNaN(cell))) {
                                        return ''; // Substituir por string vazia
                                    }
                                    return cell;
                                });
                            })
                        };
                        adaptedData.push(adaptedTableData);
                        // Converter para formato plano para compatibilidade com cache/webhook
                        table.rows.forEach((row) => {
                            const rowData = {};
                            table.headers.forEach((header, index) => {
                                rowData[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
                            });
                            rowData.table_name = table.name;
                            rawData.push(rowData);
                        });
                    }
                    else {
                        console.log(`⚠️ Tabela ${table.name} vazia ou sem rows`);
                    }
                });
                console.log(`📊 Total de registros convertidos: ${rawData.length}`);
                console.log(`📊 Total de tabelas adaptadas: ${adaptedData.length}`);
                // ⭐ ARMAZENAR DADOS PARA WEBHOOK
                this.lastRawData = rawData;
                // ⭐ USAR SISTEMA DE CACHE SOFISTICADO - detectar mudanças nos dados de tabela originais
                const changes = this.detectChanges(scrapingResult.data);
                // 🔧 SALVAR DADOS ADAPTADOS NO BANCO DE DADOS
                console.log(`🔍 Debug - adaptedData.length: ${adaptedData.length}, rawData.length: ${rawData.length}, changes: ${JSON.stringify(changes.summary)}`);
                if (adaptedData.length > 0) {
                    console.log(`💾 Salvando ${adaptedData.length} tabelas de dados no banco...`);
                    try {
                        // 🔧 SALVAR CADA TABELA COM ESTRUTURA ADAPTADA
                        for (const tableData of adaptedData) {
                            const rideId = this.extractRideId(tableData);
                            // Hash baseado em table_name + rideId
                            const uniqueHash = (0, crypto_1.createHash)('md5')
                                .update(`${tableData.tableName || 'unknown'}|${rideId}`)
                                .digest('hex');
                            const rideRecord = {
                                table_name: tableData.tableName, // Nome da página como table_name
                                data_hash: uniqueHash,
                                ride_data: tableData, // Estrutura completa {tableName, newRecords}
                                session_info: scrapingResult.sessionInfo || {},
                                source: 'monitoring-service-adapted'
                            };
                            console.log(`� Salvando tabela: ${tableData.tableName} com ${tableData.newRecords.length} registros`);
                            yield this.databaseManager.insertRideData([rideRecord]);
                        }
                        console.log(`✅ Dados adaptados salvos no banco de dados`);
                        // ⭐ FORÇAR hasChanges se há dados para salvar na primeira execução
                        if (changes.summary.newCount === 0 && changes.summary.updatedCount === 0) {
                            console.log(`🔄 Primeira execução detectada - forçando mudanças para webhook`);
                            changes.summary.newCount = rawData.length;
                            changes.newRecords = this.normalizeRideData(rawData);
                        }
                    }
                    catch (ridesError) {
                        console.error('❌ Erro ao salvar dados adaptados:', ridesError);
                        console.error('❌ Stack trace:', ridesError.stack);
                        // Continuar execução mesmo se rides falharem
                    }
                }
                else {
                    console.log('⚠️ Nenhum dado adaptado para salvar no banco');
                    console.log(`⚠️ Debug - scrapingResult.data: ${JSON.stringify(scrapingResult.data.map(t => { var _a; return ({ name: t.name, rows: (_a = t.rows) === null || _a === void 0 ? void 0 : _a.length, isEmpty: t.isEmpty }); }))}`);
                }
                // 2. EXECUTAR SCRAPING DE DRIVERS (usando a mesma sessão do browser)
                console.log('👥 Executando scraping de drivers...');
                const driversResult = yield (0, driversPersistentScraper_1.scrapeAllDriversDataPersistent)();
                let driversTransformed = null;
                if (driversResult.success && driversResult.data && driversResult.data.length > 0) {
                    console.log(`📊 Dados de drivers extraídos: ${driversResult.data.reduce((sum, table) => sum + table.rows.length, 0)} registros`);
                    try {
                        // Transformar e salvar dados de drivers (usando sessionInfo das rides)
                        const driversTransformer = driversDataTransformer_1.DriversDataTransformer.getInstance();
                        driversTransformed = yield driversTransformer.transformAndSave(driversResult.data, scrapingResult.sessionInfo || driversResult.sessionInfo, // Usar sessionInfo das rides preferencialmente
                        'drivers-monitoring-service', driversResult.hasChanges || false);
                        console.log(`✅ Dados de drivers processados com sucesso`);
                        // 🎯 PROCESSAMENTO ESPECÍFICO PARA DRIVER PERFORMANCE
                        const performanceData = driversResult.data.find(table => table.name === 'Driver Performance');
                        if (performanceData && !performanceData.isEmpty) {
                            console.log('🏆 Processando dados específicos de Driver Performance...');
                            try {
                                const scraper = new driversPersistentScraper_1.DriversPersistentScraper();
                                const processedPerformance = scraper.processDriverPerformanceData(performanceData);
                                if (processedPerformance.length > 0) {
                                    yield this.databaseManager.saveDriverPerformanceData(processedPerformance);
                                    console.log(`✅ ${processedPerformance.length} registros de Driver Performance salvos`);
                                }
                                else {
                                    console.log('⚠️ Nenhum dado de Driver Performance válido para salvar');
                                }
                            }
                            catch (performanceError) {
                                console.error('❌ Erro ao processar Driver Performance:', performanceError);
                            }
                        }
                        else {
                            console.log('ℹ️ Dados de Driver Performance não encontrados nesta execução');
                        }
                    }
                    catch (driversError) {
                        console.error('❌ Erro ao processar dados de drivers:', driversError);
                        // Continuar execução mesmo se drivers falharem
                    }
                }
                else {
                    console.log('⚠️ Nenhum dado de drivers extraído:', driversResult.message);
                }
                // Log das mudanças (rides)
                if (changes.summary.newCount > 0) {
                    console.log(`🆕 Novos registros de rides: ${changes.summary.newCount}`);
                }
                if (changes.summary.updatedCount > 0) {
                    console.log(`🔄 Registros de rides atualizados: ${changes.summary.updatedCount}`);
                }
                if (changes.summary.cancelledCount > 0) {
                    console.log(`❌ Registros de rides cancelados: ${changes.summary.cancelledCount}`);
                }
                if (changes.summary.completedCount > 0) {
                    console.log(`✅ Registros de rides concluídos: ${changes.summary.completedCount}`);
                }
                // Log dados de drivers
                if (driversTransformed) {
                    console.log(`👥 Drivers processados: ${driversTransformed.totalRecords} registros`);
                    if (driversTransformed.newRecords > 0) {
                        console.log(`🆕 Novos registros de drivers: ${driversTransformed.newRecords}`);
                    }
                }
                // Enviar para n8n (apenas quando há mudanças - evita spam)
                yield this.sendToN8n(changes);
                console.log(`✅ [${new Date().toLocaleString()}] Scraping concluído (rides + drivers)`);
            }
            catch (error) {
                console.error('❌ Erro durante scraping:', error);
            }
            finally {
                this.isRunning = false;
            }
        });
    }
    startMonitoring() {
        // Obter intervalo da variável de ambiente (padrão 5 minutos - intervalo seguro testado)
        const scrapeIntervalMinutes = parseFloat(process.env.SCRAPE_INTERVAL || '5');
        const scrapeIntervalCron = Math.round(scrapeIntervalMinutes); // Arredondar para cron
        console.log('🚀 Iniciando monitoramento automático (Rides + Drivers)...');
        console.log(`⏰ Frequência: A cada ${scrapeIntervalMinutes} minutos (configurável via SCRAPE_INTERVAL)`);
        console.log('🚗 Scrapers: Rides + Drivers integrados');
        console.log(`🌐 Webhook n8n: ${process.env.N8N_WEBHOOK_URL}`);
        console.log(`👀 Modo headless: ${process.env.HEADLESS_MODE}`);
        // Executar uma vez imediatamente
        setTimeout(() => {
            this.performScraping();
        }, 5000); // 5 segundos de delay inicial
        // Agendar execução usando variável SCRAPE_INTERVAL
        const cronExpression = `*/${scrapeIntervalCron} * * * *`;
        console.log(`⏰ Cron configurado: ${cronExpression} (a cada ${scrapeIntervalCron} minutos)`);
        const task1 = cron.schedule(cronExpression, () => {
            this.performScraping();
        });
        this.cronTasks = [task1];
        console.log('✅ Monitoramento iniciado!');
    }
    stopMonitoring() {
        console.log('🛑 Parando monitoramento...');
        this.cronTasks.forEach(task => {
            if (task && task.stop) {
                task.stop();
            }
        });
        this.cronTasks = [];
    }
    runOnce() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Executando scraping único...');
            yield this.performScraping();
        });
    }
}
exports.MonitoringService = MonitoringService;
