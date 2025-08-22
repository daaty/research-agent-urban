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
exports.DriverExtractionQueue = void 0;
const events_1 = require("events");
class DriverExtractionQueue extends events_1.EventEmitter {
    constructor(config) {
        super();
        this.queue = [];
        this.processing = new Map();
        this.completed = new Map();
        this.failed = new Map();
        this.config = {
            maxConcurrent: 3, // Máximo 3 extrações simultâneas
            retryDelay: 5000, // 5 segundos entre tentativas
            maxRetries: 3, // Máximo 3 tentativas por item
            processingTimeout: 60000, // Timeout de 60 segundos por extração
            rateLimitDelay: 2000 // 2 segundos entre cada nova extração
        };
        this.isRunning = false;
        this.processCount = 0;
        this.lastProcessTime = 0;
        if (config) {
            this.config = Object.assign(Object.assign({}, this.config), config);
        }
        console.log('🔄 DriverExtractionQueue inicializada com configurações:', this.config);
    }
    /**
     * Adiciona uma lista de driver IDs à fila
     */
    addDriverIds(driverIds, priority = 1) {
        console.log(`📋 Adicionando ${driverIds.length} motoristas à fila com prioridade ${priority}`);
        for (const driverId of driverIds) {
            // Verificar se já existe na fila ou foi processado
            if (this.isDriverInQueue(driverId) || this.completed.has(driverId)) {
                console.log(`⚠️ Motorista ${driverId} já está na fila ou foi processado, pulando...`);
                continue;
            }
            const queueItem = {
                id: `item_${Date.now()}_${driverId}`,
                driverId,
                priority,
                retryCount: 0,
                maxRetries: this.config.maxRetries,
                createdAt: new Date(),
                status: 'pending'
            };
            this.queue.push(queueItem);
            console.log(`✅ Motorista ${driverId} adicionado à fila (ID: ${queueItem.id})`);
        }
        // Ordenar por prioridade (maior prioridade primeiro)
        this.queue.sort((a, b) => b.priority - a.priority);
        console.log(`📊 Fila atualizada: ${this.queue.length} itens pendentes`);
        this.emit('queueUpdated', this.getQueueStats());
    }
    /**
     * Verifica se um motorista já está na fila
     */
    isDriverInQueue(driverId) {
        return this.queue.some(item => item.driverId === driverId) ||
            this.processing.has(driverId) ||
            Array.from(this.processing.values()).some(item => item.driverId === driverId);
    }
    /**
     * Inicia o processamento da fila
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                console.log('⚠️ Fila já está em execução');
                return;
            }
            this.isRunning = true;
            console.log('🚀 Iniciando processamento da fila...');
            this.emit('queueStarted');
            while (this.isRunning && (this.queue.length > 0 || this.processing.size > 0)) {
                yield this.processNextBatch();
                yield this.sleep(100); // Pequena pausa para evitar loop intensivo
            }
            console.log('✅ Processamento da fila concluído');
            this.isRunning = false;
            this.emit('queueCompleted', this.getQueueStats());
        });
    }
    /**
     * Para o processamento da fila
     */
    stop() {
        console.log('🛑 Parando processamento da fila...');
        this.isRunning = false;
        this.emit('queueStopped');
    }
    /**
     * Processa o próximo lote de itens
     */
    processNextBatch() {
        return __awaiter(this, void 0, void 0, function* () {
            // Verificar se podemos iniciar novos processamentos
            const availableSlots = this.config.maxConcurrent - this.processing.size;
            if (availableSlots <= 0 || this.queue.length === 0) {
                return;
            }
            // Aplicar rate limiting
            const now = Date.now();
            const timeSinceLastProcess = now - this.lastProcessTime;
            if (timeSinceLastProcess < this.config.rateLimitDelay) {
                yield this.sleep(this.config.rateLimitDelay - timeSinceLastProcess);
            }
            // Processar itens disponíveis
            const itemsToProcess = Math.min(availableSlots, this.queue.length);
            for (let i = 0; i < itemsToProcess; i++) {
                const item = this.queue.shift();
                if (item) {
                    this.startProcessingItem(item);
                    this.lastProcessTime = Date.now();
                }
            }
        });
    }
    /**
     * Inicia o processamento de um item específico
     */
    startProcessingItem(item) {
        return __awaiter(this, void 0, void 0, function* () {
            item.status = 'processing';
            item.lastAttempt = new Date();
            this.processing.set(item.driverId, item);
            console.log(`🔄 Iniciando processamento do motorista ${item.driverId} (tentativa ${item.retryCount + 1})`);
            this.emit('itemStarted', item);
            // Configurar timeout
            const timeoutId = setTimeout(() => {
                this.handleItemTimeout(item);
            }, this.config.processingTimeout);
            try {
                // Emitir evento para processamento externo
                this.emit('processItem', item, (error, data) => {
                    clearTimeout(timeoutId);
                    this.handleItemCompletion(item, error, data);
                });
            }
            catch (error) {
                clearTimeout(timeoutId);
                this.handleItemCompletion(item, error);
            }
        });
    }
    /**
     * Handles item timeout
     */
    handleItemTimeout(item) {
        console.log(`⏰ Timeout no processamento do motorista ${item.driverId}`);
        const timeoutError = new Error(`Timeout após ${this.config.processingTimeout}ms`);
        this.handleItemCompletion(item, timeoutError);
    }
    /**
     * Handles item completion (success or failure)
     */
    handleItemCompletion(item, error, data) {
        this.processing.delete(item.driverId);
        if (error) {
            item.error = error.message;
            item.retryCount++;
            console.log(`❌ Erro no processamento do motorista ${item.driverId}: ${error.message}`);
            // Verificar se deve tentar novamente
            if (item.retryCount < item.maxRetries) {
                item.status = 'retrying';
                console.log(`🔄 Reagendando motorista ${item.driverId} para nova tentativa (${item.retryCount}/${item.maxRetries})`);
                // Reagendar com delay
                setTimeout(() => {
                    if (this.isRunning) {
                        this.queue.unshift(item); // Adicionar no início da fila
                        this.queue.sort((a, b) => b.priority - a.priority);
                    }
                }, this.config.retryDelay);
                this.emit('itemRetried', item);
            }
            else {
                // Falha definitiva
                item.status = 'failed';
                this.failed.set(item.driverId, item);
                console.log(`💀 Motorista ${item.driverId} falhou definitivamente após ${item.retryCount} tentativas`);
                this.emit('itemFailed', item);
            }
        }
        else {
            // Sucesso
            item.status = 'completed';
            item.data = data;
            this.completed.set(item.driverId, item);
            console.log(`✅ Motorista ${item.driverId} processado com sucesso`);
            this.emit('itemCompleted', item);
        }
        this.emit('queueUpdated', this.getQueueStats());
    }
    /**
     * Retorna estatísticas da fila
     */
    getQueueStats() {
        return {
            pending: this.queue.length,
            processing: this.processing.size,
            completed: this.completed.size,
            failed: this.failed.size,
            total: this.queue.length + this.processing.size + this.completed.size + this.failed.size,
            isRunning: this.isRunning
        };
    }
    /**
     * Retorna todos os itens completados
     */
    getCompletedItems() {
        return Array.from(this.completed.values());
    }
    /**
     * Retorna todos os itens que falharam
     */
    getFailedItems() {
        return Array.from(this.failed.values());
    }
    /**
     * Retorna itens atualmente sendo processados
     */
    getProcessingItems() {
        return Array.from(this.processing.values());
    }
    /**
     * Retorna itens pendentes na fila
     */
    getPendingItems() {
        return [...this.queue];
    }
    /**
     * Limpa todos os itens completados e falhados
     */
    clearCompleted() {
        const completedCount = this.completed.size;
        const failedCount = this.failed.size;
        this.completed.clear();
        this.failed.clear();
        console.log(`🧹 Limpeza concluída: ${completedCount} completados e ${failedCount} falhados removidos`);
        this.emit('queueCleaned', { completedCount, failedCount });
    }
    /**
     * Reprocessa itens que falharam
     */
    retryFailedItems() {
        const failedItems = Array.from(this.failed.values());
        this.failed.clear();
        for (const item of failedItems) {
            item.retryCount = 0;
            item.status = 'pending';
            item.error = undefined;
            this.queue.push(item);
        }
        this.queue.sort((a, b) => b.priority - a.priority);
        console.log(`🔄 ${failedItems.length} itens falhados readicionados à fila`);
        this.emit('queueUpdated', this.getQueueStats());
    }
    /**
     * Utility sleep function
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.DriverExtractionQueue = DriverExtractionQueue;
