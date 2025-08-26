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
exports.DriverCacheManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
class DriverCacheManager {
    constructor() {
        this.cacheFilePath = path.join(process.cwd(), 'data', 'cache-drivers-data.json');
        this.previousDataPath = path.join(process.cwd(), 'data', 'previous-drivers-data.json');
        // Garantir que o diretório existe
        const dataDir = path.join(process.cwd(), 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
    }
    static getInstance() {
        if (!DriverCacheManager.instance) {
            DriverCacheManager.instance = new DriverCacheManager();
        }
        return DriverCacheManager.instance;
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
            console.log('⚠️ Erro ao carregar dados anteriores de drivers:', error);
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
            console.log('✅ Dados de drivers salvos no cache');
        }
        catch (error) {
            console.error('❌ Erro ao salvar dados de drivers no cache:', error);
        }
    }
    /**
     * Gera hash único dos dados para comparação rápida (SEM timestamp)
     */
    generateDataHash(data) {
        const dataString = JSON.stringify(data.map(table => ({
            name: table.name,
            rowCount: table.rows.length,
            rows: table.rows, // NÃO ORDENAR rows - manter ordem original!
            headers: table.headers // NÃO ORDENAR headers - manter ordem original!
        })).sort((a, b) => a.name.localeCompare(b.name))); // Ordenar tabelas por nome
        return (0, crypto_1.createHash)('md5').update(dataString).digest('hex');
    }
    /**
     * Compara dados atuais com dados anteriores e retorna apenas as diferenças
     */
    compareAndGetDifferences(currentData) {
        console.log('🔍 Comparando dados atuais de drivers com dados anteriores...');
        const previousData = this.loadPreviousData();
        const differences = [];
        if (!previousData) {
            console.log('📝 Primeira execução de drivers - todos os dados são novos');
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
                webhookPayload: this.createWebhookPayload(differences, 'first-run')
            };
        }
        // Verificação rápida de hash
        const currentHash = this.generateDataHash(currentData);
        if (currentHash === previousData.dataHash) {
            console.log('📊 Dados de drivers inalterados (hash igual)');
            return {
                hasChanges: false,
                differences: [],
                webhookPayload: this.createWebhookPayload([], 'no-changes')
            };
        }
        console.log('🔄 Detectadas mudanças nos dados de drivers - analisando diferenças...');
        // Comparação detalhada tabela por tabela
        const previousTablesByName = new Map(previousData.data.map(table => [table.name, table]));
        currentData.forEach(currentTable => {
            const previousTable = previousTablesByName.get(currentTable.name);
            if (!previousTable) {
                // Nova tabela
                if (!currentTable.isEmpty && currentTable.rows.length > 0) {
                    differences.push({
                        tableName: currentTable.name,
                        newRecords: currentTable.rows,
                        updatedRecords: [],
                        removedRecords: [],
                        totalNewRecords: currentTable.rows.length
                    });
                }
            }
            else {
                // Comparar registros existentes
                const diff = this.compareTableRecords(previousTable, currentTable);
                if (diff.totalNewRecords > 0 || diff.updatedRecords.length > 0 || diff.removedRecords.length > 0) {
                    differences.push(diff);
                }
            }
        });
        // Salvar dados atuais
        this.savePreviousData(currentData);
        const hasChanges = differences.length > 0;
        console.log(`🎯 Resultado da comparação de drivers: ${hasChanges ? 'MUDANÇAS DETECTADAS' : 'SEM MUDANÇAS'}`);
        return {
            hasChanges,
            differences,
            webhookPayload: this.createWebhookPayload(differences, hasChanges ? 'changes-detected' : 'no-changes')
        };
    }
    /**
     * Compara registros entre duas tabelas
     */
    compareTableRecords(previousTable, currentTable) {
        const previousRowsSet = new Set(previousTable.rows.map(row => JSON.stringify(row)));
        const currentRowsSet = new Set(currentTable.rows.map(row => JSON.stringify(row)));
        const newRecords = [];
        const removedRecords = [];
        // Encontrar novos registros
        currentTable.rows.forEach(row => {
            const rowKey = JSON.stringify(row);
            if (!previousRowsSet.has(rowKey)) {
                newRecords.push(row);
            }
        });
        // Encontrar registros removidos
        previousTable.rows.forEach(row => {
            const rowKey = JSON.stringify(row);
            if (!currentRowsSet.has(rowKey)) {
                removedRecords.push(row);
            }
        });
        return {
            tableName: currentTable.name,
            newRecords,
            updatedRecords: [], // Para simplificar, não detectamos updates individuais
            removedRecords,
            totalNewRecords: newRecords.length
        };
    }
    /**
     * Cria payload para webhook
     */
    createWebhookPayload(differences, mode) {
        const summary = {
            totalNewRecords: differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0),
            totalUpdatedRecords: differences.reduce((sum, diff) => sum + diff.updatedRecords.length, 0),
            totalRemovedRecords: differences.reduce((sum, diff) => sum + diff.removedRecords.length, 0),
            tablesWithChanges: differences.length
        };
        return {
            timestamp: new Date().toISOString(),
            source: 'drivers-persistent-scraper',
            mode,
            sessionInfo: {},
            differences,
            summary
        };
    }
    /**
     * Força limpeza do cache (útil para testes)
     */
    clearCache() {
        try {
            if (fs.existsSync(this.previousDataPath)) {
                fs.unlinkSync(this.previousDataPath);
                console.log('🧹 Cache de drivers limpo');
            }
        }
        catch (error) {
            console.error('❌ Erro ao limpar cache de drivers:', error);
        }
    }
}
exports.DriverCacheManager = DriverCacheManager;
