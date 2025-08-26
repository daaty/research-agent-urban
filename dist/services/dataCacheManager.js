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
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataCacheManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
class DataCacheManager {
    constructor() {
        this.cacheFilePath = path.join(process.cwd(), 'data', 'cache-data.json');
        this.previousDataPath = path.join(process.cwd(), 'data', 'previous-rides-data.json');
        // Garantir que o diretório existe
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }
    static getInstance() {
        if (!DataCacheManager.instance) {
            DataCacheManager.instance = new DataCacheManager();
        }
        return DataCacheManager.instance;
    }
    /**
     * Carrega dados anteriores do cache
     */
    loadPreviousData() {
        try {
            if (fs.existsSync(this.previousDataPath)) {
                const data = fs.readFileSync(this.previousDataPath, 'utf8');
                return JSON.parse(data);
            }
        }
        catch (error) {
            console.log('⚠️ Erro ao carregar dados anteriores:', error);
        }
        return null;
    }
    /**
     * Salva dados atuais no cache
     */
    savePreviousData(data) {
        try {
            const cachedData = {
                timestamp: Date.now(),
                data: data,
                dataHash: this.generateDataHash(data)
            };
            fs.writeFileSync(this.previousDataPath, JSON.stringify(cachedData, null, 2));
            console.log('✅ Dados salvos no cache');
        }
        catch (error) {
            console.error('❌ Erro ao salvar dados no cache:', error);
        }
    }
    /**
     * Gera hash único dos dados para comparação rápida (SEM timestamp)
     */
    generateDataHash(data) {
        const dataString = JSON.stringify(data.map(table => ({
            name: table.name,
            rowCount: table.rows.length,
            rows: table.rows.sort(), // Ordenar para hash consistente
            headers: table.headers.sort() // Incluir headers ordenados
        })).sort((a, b) => a.name.localeCompare(b.name))); // Ordenar tabelas por nome
        return (0, crypto_1.createHash)('md5').update(dataString).digest('hex');
    }
    /**
     * Gera hash único de uma linha de dados
     */
    generateRowHash(row) {
        return (0, crypto_1.createHash)('md5').update(JSON.stringify(row)).digest('hex');
    }
    /**
     * Compara dados atuais com dados anteriores e retorna apenas as diferenças
     */
    compareAndGetDifferences(currentData) {
        console.log('🔍 Comparando dados atuais com dados anteriores...');
        const previousData = this.loadPreviousData();
        const differences = [];
        if (!previousData) {
            console.log('📝 Primeira execução - todos os dados são novos');
            // Primeira execução - todos os dados são novos
            currentData.forEach(table => {
                if (!table.isEmpty && table.rows.length > 0) {
                    differences.push({
                        tableName: table.name,
                        newRecords: table.rows,
                        updatedRecords: [],
                        removedRecords: [],
                        totalNewRecords: table.rows.length
                    });
                }
            });
            // Salvar dados atuais
            this.savePreviousData(currentData);
            return {
                hasChanges: differences.length > 0,
                differences,
                webhookPayload: this.createWebhookPayload(differences, true)
            };
        }
        // Comparar hash geral primeiro
        const currentHash = this.generateDataHash(currentData);
        if (currentHash === previousData.dataHash) {
            console.log('✅ Nenhuma mudança detectada (hash igual)');
            return {
                hasChanges: false,
                differences: [],
                webhookPayload: this.createWebhookPayload([], false)
            };
        }
        console.log('📊 Mudanças detectadas, analisando detalhes...');
        // Comparar cada tabela (verificar se previousData.data existe)
        const previousDataArray = previousData.data || [];
        currentData.forEach(currentTable => {
            const previousTable = previousDataArray.find(t => t.name === currentTable.name);
            if (!previousTable) {
                // Tabela nova
                console.log(`📝 Tabela nova encontrada: ${currentTable.name}`);
                if (!currentTable.isEmpty && currentTable.rows.length > 0) {
                    differences.push({
                        tableName: currentTable.name,
                        newRecords: currentTable.rows,
                        updatedRecords: [],
                        removedRecords: [],
                        totalNewRecords: currentTable.rows.length
                    });
                }
                return;
            }
            // Comparar linhas da tabela
            const tableDiff = this.compareTableRows(previousTable, currentTable);
            if (tableDiff.totalNewRecords > 0 || tableDiff.updatedRecords.length > 0 || tableDiff.removedRecords.length > 0) {
                console.log(`📊 ${currentTable.name}: ${tableDiff.totalNewRecords} novos, ${tableDiff.updatedRecords.length} atualizados, ${tableDiff.removedRecords.length} removidos`);
                differences.push(tableDiff);
            }
        });
        // Salvar dados atuais
        this.savePreviousData(currentData);
        const hasChanges = differences.length > 0;
        console.log(`🔄 Resultado: ${hasChanges ? 'Mudanças detectadas' : 'Nenhuma mudança'}`);
        return {
            hasChanges,
            differences,
            webhookPayload: this.createWebhookPayload(differences, hasChanges)
        };
    }
    /**
     * Compara linhas de uma tabela específica
     */
    compareTableRows(previousTable, currentTable) {
        const newRecords = [];
        const updatedRecords = [];
        const removedRecords = [];
        // Criar mapas de hash para comparação eficiente
        const previousRowHashes = new Set(previousTable.rows.map(row => this.generateRowHash(row)));
        const currentRowHashes = new Set(currentTable.rows.map(row => this.generateRowHash(row)));
        // Encontrar registros novos
        currentTable.rows.forEach(row => {
            const rowHash = this.generateRowHash(row);
            if (!previousRowHashes.has(rowHash)) {
                newRecords.push(row);
            }
        });
        // Encontrar registros removidos
        previousTable.rows.forEach(row => {
            const rowHash = this.generateRowHash(row);
            if (!currentRowHashes.has(rowHash)) {
                removedRecords.push(row);
            }
        });
        // Para esta implementação, não estamos detectando atualizações
        // pois seria necessário uma chave primária para identificar registros únicos
        return {
            tableName: currentTable.name,
            newRecords,
            updatedRecords,
            removedRecords,
            totalNewRecords: newRecords.length
        };
    }
    /**
     * Cria payload para webhook com apenas dados novos
     */
    createWebhookPayload(differences, hasChanges) {
        const summary = {
            totalNewRecords: differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0),
            totalUpdatedRecords: differences.reduce((sum, diff) => sum + diff.updatedRecords.length, 0),
            totalRemovedRecords: differences.reduce((sum, diff) => sum + diff.removedRecords.length, 0),
            tablesWithChanges: differences.length
        };
        return {
            timestamp: new Date().toISOString(),
            source: 'rides-dashboard-persistent',
            mode: 'persistent-browser',
            sessionInfo: {}, // Será preenchido pelo chamador
            onlyNewData: true,
            differences,
            summary
        };
    }
    /**
     * Limpa cache (útil para testes)
     */
    clearCache() {
        try {
            if (fs.existsSync(this.previousDataPath)) {
                fs.unlinkSync(this.previousDataPath);
                console.log('✅ Cache limpo');
            }
        }
        catch (error) {
            console.error('❌ Erro ao limpar cache:', error);
        }
    }
    /**
     * Obter estatísticas do cache
     */
    getCacheStats() {
        const previousData = this.loadPreviousData();
        if (!previousData) {
            return {
                hasCache: false,
                lastUpdate: null,
                totalTables: 0,
                totalRecords: 0
            };
        }
        return {
            hasCache: true,
            lastUpdate: new Date(previousData.timestamp).toISOString(),
            totalTables: previousData.data.length,
            totalRecords: previousData.data.reduce((sum, table) => sum + table.rows.length, 0)
        };
    }
}
exports.DataCacheManager = DataCacheManager;
