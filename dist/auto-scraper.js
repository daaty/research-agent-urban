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
dotenv_1.default.config();
// ...removido scraping persistente...
const config_1 = require("./config");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto = __importStar(require("crypto"));
const express_1 = __importDefault(require("express"));
class AutoScraper {
    constructor() {
        this.intervalId = null;
        this.isRunning = false;
        this.lastExecution = null;
        this.executionCount = 0;
        this.cacheFilePath = path.join(process.cwd(), 'data', 'previous-rides-data.json');
        this.app = (0, express_1.default)();
        this.setupHealthCheck();
    }
    setupHealthCheck() {
        this.app.use(express_1.default.json());
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            var _a;
            res.json({
                status: 'ok',
                service: 'Research Agent Urban',
                version: '2.0.0',
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                isRunning: this.isRunning,
                lastExecution: ((_a = this.lastExecution) === null || _a === void 0 ? void 0 : _a.toISOString()) || null,
                executionCount: this.executionCount,
                cacheFile: this.cacheFilePath,
                webhookConfigured: !!config_1.config.n8nWebhookUrl
            });
        });
        // Status endpoint
        this.app.get('/status', (req, res) => {
            var _a;
            const cacheExists = fs.existsSync(this.cacheFilePath);
            let cacheData = null;
            if (cacheExists) {
                try {
                    cacheData = JSON.parse(fs.readFileSync(this.cacheFilePath, 'utf8'));
                }
                catch (error) {
                    cacheData = { error: 'Unable to read cache' };
                }
            }
            res.json({
                service: 'Research Agent Urban Auto Scraper',
                status: this.isRunning ? 'running' : 'stopped',
                interval: '2.5 minutes',
                cache: {
                    exists: cacheExists,
                    path: this.cacheFilePath,
                    data: cacheData
                },
                stats: {
                    lastExecution: ((_a = this.lastExecution) === null || _a === void 0 ? void 0 : _a.toISOString()) || null,
                    executionCount: this.executionCount,
                    uptime: process.uptime()
                }
            });
        });
        // Start HTTP server
        const port = process.env.PORT || 3000;
        this.server = this.app.listen(port, () => {
            console.log(`🌐 Health check server running on port ${port}`);
            console.log(`📋 Health: http://localhost:${port}/health`);
            console.log(`📊 Status: http://localhost:${port}/status`);
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🤖 INICIANDO SISTEMA AUTOMÁTICO DE SCRAPING COM CACHE');
            console.log('⏰ Executará a cada 2,5 minutos');
            console.log('🔄 Só enviará dados quando houver MUDANÇAS');
            console.log(`📡 Webhook: ${config_1.config.n8nWebhookUrl ? 'Configurado ✅' : 'Não configurado ❌'}`);
            console.log(`💾 Cache: ${this.cacheFilePath}`);
            console.log('='.repeat(60));
            this.isRunning = true;
            // Verificar se existe cache antigo e mostrar info
            this.showCacheInfo();
            // Reset do cache para garantir funcionamento correto
            yield this.resetCache();
            // Primeira execução
            yield this.doScraping();
            // Agendar execuções a cada 2,5 minutos
            this.intervalId = setInterval(() => {
                this.doScraping();
            }, 2.5 * 60 * 1000);
        });
    }
    doScraping() {
        return __awaiter(this, void 0, void 0, function* () {
            const now = new Date().toLocaleString('pt-BR');
            this.lastExecution = new Date();
            this.executionCount++;
            console.log(`\n🔄 [${now}] Iniciando scraping... (Execução #${this.executionCount})`);
            try {
                // ...removido scraping persistente...
                // [REMOVIDO] Bloco órfão de result (persistente)
            }
            catch (error) {
                console.error(`💥 [${now}] Erro crítico:`, error.message);
            }
            console.log(`⏳ Próxima execução em 2,5 minutos...`);
        });
    }
    /**
   * Verifica se houve mudanças nos dados comparando com a execução anterior
   */
    checkForChanges(currentData, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Criar hash dos dados atuais
                const currentHash = this.createDataHash(currentData);
                const currentRecordCount = currentData.reduce((sum, table) => sum + table.rows.length, 0);
                console.log(`🔍 [${timestamp}] Verificando mudanças...`);
                console.log(`   Hash atual: ${currentHash.substring(0, 12)}...`);
                console.log(`   Registros atuais: ${currentRecordCount}`);
                // Verificar se existe cache anterior
                if (!fs.existsSync(this.cacheFilePath)) {
                    console.log(`🆕 [${timestamp}] Cache não encontrado - primeira execução`);
                    console.log(`   Arquivo esperado: ${this.cacheFilePath}`);
                    return true; // Primeira execução, considerar como mudança
                }
                // Carregar dados anteriores
                let previousData;
                try {
                    const fileContent = fs.readFileSync(this.cacheFilePath, 'utf8');
                    // Verificar se é o formato antigo (array) ou novo (objeto com hash)
                    const parsedContent = JSON.parse(fileContent);
                    if (Array.isArray(parsedContent)) {
                        console.log(`🔄 [${timestamp}] Detectado formato antigo de cache - convertendo...`);
                        // Formato antigo, criar hash dos dados antigos
                        const oldDataFormatted = [{
                                name: 'Legacy Data',
                                headers: [],
                                rows: parsedContent,
                                isEmpty: parsedContent.length === 0
                            }];
                        previousData = {
                            timestamp: 'Legacy format',
                            data: oldDataFormatted,
                            hash: this.createDataHash(oldDataFormatted),
                            recordCount: parsedContent.length
                        };
                    }
                    else {
                        // Formato novo
                        previousData = parsedContent;
                    }
                }
                catch (parseError) {
                    console.log(`❌ [${timestamp}] Erro ao ler cache anterior:`, parseError.message);
                    return true; // Se não conseguir ler, assumir mudança
                }
                // Comparar hashes
                const hashChanged = currentHash !== previousData.hash;
                const countChanged = currentRecordCount !== previousData.recordCount;
                console.log(`   Hash anterior: ${previousData.hash.substring(0, 12)}...`);
                console.log(`   Registros anteriores: ${previousData.recordCount}`);
                console.log(`   Hash mudou: ${hashChanged ? '✅ SIM' : '❌ NÃO'}`);
                console.log(`   Quantidade mudou: ${countChanged ? '✅ SIM' : '❌ NÃO'}`);
                if (hashChanged || countChanged) {
                    console.log(`📊 [${timestamp}] MUDANÇAS DETECTADAS!`);
                    return true;
                }
                console.log(`📊 [${timestamp}] Nenhuma mudança detectada`);
                return false;
            }
            catch (error) {
                console.error(`❌ [${timestamp}] Erro ao verificar mudanças:`, error.message);
                return true; // Em caso de erro, assumir que há mudanças
            }
        });
    }
    /**
   * Cria um hash dos dados para comparação
   */
    createDataHash(data) {
        // Criar uma representação string dos dados importantes, ordenada para consistência
        const normalizedData = data.map(table => ({
            name: table.name || 'unnamed',
            isEmpty: table.isEmpty || false,
            rowCount: (table.rows || []).length,
            headers: (table.headers || []).sort(), // Ordenar headers
            rows: (table.rows || []).map((row) => {
                // Normalizar cada linha, removendo campos vazios e ordenando chaves
                const normalizedRow = {};
                Object.keys(row).sort().forEach(key => {
                    if (row[key] !== '' && row[key] !== null && row[key] !== undefined) {
                        normalizedRow[key] = row[key];
                    }
                });
                return normalizedRow;
            })
        })).sort((a, b) => a.name.localeCompare(b.name)); // Ordenar tabelas por nome
        const dataString = JSON.stringify(normalizedData);
        const hash = crypto.createHash('md5').update(dataString).digest('hex');
        // Debug: mostrar tamanho dos dados e primeira parte do hash
        console.log(`📊 Hash calculado: ${hash.substring(0, 12)}... (dados: ${dataString.length} chars)`);
        return hash;
    }
    /**
     * Salva os dados atuais como cache para próxima comparação
     */
    saveCache(data, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const cacheData = {
                    timestamp,
                    data,
                    hash: this.createDataHash(data),
                    recordCount: data.reduce((sum, table) => sum + table.rows.length, 0)
                };
                fs.writeFileSync(this.cacheFilePath, JSON.stringify(cacheData, null, 2));
                console.log(`💾 [${timestamp}] Cache salvo com ${cacheData.recordCount} registros`);
            }
            catch (error) {
                console.error(`❌ [${timestamp}] Erro ao salvar cache:`, error.message);
            }
        });
    }
    hasWebhook() {
        return !!(config_1.config.n8nWebhookUrl && !config_1.config.n8nWebhookUrl.includes('seu-n8n.com'));
    }
    sendWebhook(data, timestamp) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`📤 [${timestamp}] Enviando DADOS NOVOS para webhook...`);
                const payload = {
                    timestamp: new Date().toISOString(),
                    localTime: timestamp,
                    source: 'rides-auto-scraper-with-changes',
                    hasChanges: true,
                    data: data,
                    summary: {
                        totalRecords: data.reduce((sum, table) => sum + table.rows.length, 0),
                        tablesWithData: data.filter(table => !table.isEmpty).length,
                        changeDetected: true,
                        cacheSystem: 'active'
                    }
                };
                yield axios_1.default.post(config_1.config.n8nWebhookUrl, payload, {
                    timeout: 10000,
                    headers: { 'Content-Type': 'application/json' }
                });
                console.log(`✅ [${timestamp}] Webhook com DADOS NOVOS enviado com sucesso!`);
            }
            catch (error) {
                console.error(`❌ [${timestamp}] Erro webhook:`, error.message);
            }
        });
    }
    /**
   * Limpa o cache forçando envio na próxima execução
   */
    clearCache() {
        if (fs.existsSync(this.cacheFilePath)) {
            fs.unlinkSync(this.cacheFilePath);
            console.log('🗑️ Cache limpo - próxima execução enviará dados');
        }
        else {
            console.log('🗑️ Nenhum cache para limpar');
        }
    }
    /**
     * Força limpeza do cache antigo se necessário
     */
    resetCache() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 Resetando cache para garantir funcionamento correto...');
            this.clearCache();
            // Criar diretório data se não existir
            const dataDir = path.dirname(this.cacheFilePath);
            if (!fs.existsSync(dataDir)) {
                fs.mkdirSync(dataDir, { recursive: true });
                console.log(`📁 Diretório criado: ${dataDir}`);
            }
        });
    }
    /**
   * Mostra informações do cache atual
   */
    showCacheInfo() {
        if (fs.existsSync(this.cacheFilePath)) {
            try {
                const fileContent = fs.readFileSync(this.cacheFilePath, 'utf8');
                const parsedContent = JSON.parse(fileContent);
                if (Array.isArray(parsedContent)) {
                    console.log('📋 Cache atual (formato antigo):');
                    console.log(`   Arquivo: ${this.cacheFilePath}`);
                    console.log(`   Registros antigos: ${parsedContent.length}`);
                    console.log(`   Formato: Array legacy (será convertido)`);
                }
                else {
                    const cache = parsedContent;
                    console.log('📋 Cache atual (formato novo):');
                    console.log(`   Arquivo: ${this.cacheFilePath}`);
                    console.log(`   Última execução: ${cache.timestamp}`);
                    console.log(`   Registros salvos: ${cache.recordCount}`);
                    console.log(`   Hash: ${cache.hash.substring(0, 16)}...`);
                }
            }
            catch (error) {
                console.log('📋 Erro ao ler cache:', error.message);
            }
        }
        else {
            console.log('📋 Nenhum cache encontrado - primeira execução');
            console.log(`   Arquivo esperado: ${this.cacheFilePath}`);
        }
    }
    stop() {
        console.log('⏹️ Parando sistema automático...');
        this.isRunning = false;
        if (this.intervalId) {
            clearInterval(this.intervalId);
            console.log('✅ Timer parado');
        }
        if (this.server) {
            this.server.close(() => {
                console.log('✅ Servidor HTTP encerrado');
            });
        }
        console.log('🔄 Shutdown completo');
    }
}
// Iniciar sistema
const scraper = new AutoScraper();
scraper.start();
// Graceful shutdown
const gracefulShutdown = () => {
    console.log('\n� Recebido sinal de parada...');
    scraper.stop();
    setTimeout(() => {
        console.log('🚪 Forçando encerramento...');
        process.exit(0);
    }, 5000);
};
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGQUIT', gracefulShutdown);
