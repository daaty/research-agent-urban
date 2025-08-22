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
exports.OperationStateManager = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Gerenciador de persistência de estado da operação híbrida
 */
class OperationStateManager {
    constructor() {
        this.stateFilePath = path.join(process.cwd(), 'hybrid-operation-state.json');
        this.state = this.loadState();
    }
    static getInstance() {
        if (!OperationStateManager.instance) {
            OperationStateManager.instance = new OperationStateManager();
        }
        return OperationStateManager.instance;
    }
    /**
     * Carrega estado do arquivo
     */
    loadState() {
        try {
            if (fs.existsSync(this.stateFilePath)) {
                const data = fs.readFileSync(this.stateFilePath, 'utf8');
                const loaded = JSON.parse(data);
                // Converter strings de data de volta para objetos Date
                loaded.lastSavedAt = new Date(loaded.lastSavedAt);
                loaded.sessionStarted = new Date(loaded.sessionStarted);
                console.log(`🔄 Estado carregado: processando ID ${loaded.currentDriverId || 'nenhum'}`);
                return loaded;
            }
        }
        catch (error) {
            console.log('⚠️ Erro ao carregar estado, criando novo estado');
        }
        return this.createInitialState();
    }
    /**
     * Cria estado inicial
     */
    createInitialState() {
        return {
            currentDriverId: null,
            extractionMode: true,
            rechargeMode: false,
            lastSavedAt: new Date(),
            totalProcessed: 0,
            sessionStarted: new Date(),
            queueSnapshot: {
                driverIds: [],
                rechargeCount: 0
            }
        };
    }
    /**
     * Salva estado no arquivo
     */
    saveState() {
        try {
            this.state.lastSavedAt = new Date();
            fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
            console.log(`💾 Estado salvo: processando ID ${this.state.currentDriverId || 'nenhum'}`);
        }
        catch (error) {
            console.error('❌ Erro ao salvar estado:', error);
        }
    }
    /**
     * Atualiza ID atual sendo processado
     */
    setCurrentDriverId(driverId) {
        this.state.currentDriverId = driverId;
        this.saveState();
    }
    /**
     * Define modo de operação
     */
    setMode(extraction, recharge) {
        this.state.extractionMode = extraction;
        this.state.rechargeMode = recharge;
        this.saveState();
    }
    /**
     * Incrementa contador de processados
     */
    incrementProcessed() {
        this.state.totalProcessed++;
        this.saveState();
    }
    /**
     * Define URL atual
     */
    setCurrentUrl(url) {
        this.state.currentUrl = url;
        this.saveState();
    }
    /**
     * Define último erro
     */
    setLastError(error) {
        this.state.lastError = error;
        this.saveState();
    }
    /**
     * Atualiza snapshot das filas
     */
    updateQueueSnapshot(driverIds, rechargeCount) {
        this.state.queueSnapshot = {
            driverIds,
            rechargeCount
        };
        this.saveState();
    }
    /**
     * Obtém estado atual
     */
    getState() {
        return Object.assign({}, this.state);
    }
    /**
     * Reseta estado para inicial
     */
    reset() {
        this.state = this.createInitialState();
        this.saveState();
        console.log('🔄 Estado resetado para inicial');
    }
    /**
     * Verifica se há estado para recuperar
     */
    hasRecoveryState() {
        return this.state.currentDriverId !== null ||
            this.state.totalProcessed > 0 ||
            this.state.queueSnapshot.driverIds.length > 0;
    }
    /**
     * Obtém informações de recuperação
     */
    getRecoveryInfo() {
        const now = new Date();
        const sessionDuration = now.getTime() - this.state.sessionStarted.getTime();
        const lastSavedMinutesAgo = (now.getTime() - this.state.lastSavedAt.getTime()) / (1000 * 60);
        return {
            shouldRecover: this.hasRecoveryState(),
            currentDriverId: this.state.currentDriverId,
            totalProcessed: this.state.totalProcessed,
            sessionDuration,
            lastSavedMinutesAgo
        };
    }
    /**
     * Remove arquivo de estado
     */
    clearStateFile() {
        try {
            if (fs.existsSync(this.stateFilePath)) {
                fs.unlinkSync(this.stateFilePath);
                console.log('🗑️ Arquivo de estado removido');
            }
        }
        catch (error) {
            console.error('❌ Erro ao remover arquivo de estado:', error);
        }
    }
}
exports.OperationStateManager = OperationStateManager;
