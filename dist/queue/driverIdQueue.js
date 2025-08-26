"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DriverIdQueue = void 0;
class DriverIdQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.currentPosition = 0;
        this.maxRetries = 3;
    }
    static getInstance() {
        if (!DriverIdQueue.instance) {
            DriverIdQueue.instance = new DriverIdQueue();
        }
        return DriverIdQueue.instance;
    }
    /**
     * Adiciona IDs de motoristas à fila
     */
    addDriverIds(ids, priority = 'normal') {
        const items = ids.map(id => ({
            id,
            priority,
            addedAt: new Date(),
            attempts: 0
        }));
        // Adicionar à fila respeitando prioridade
        if (priority === 'high') {
            this.queue.unshift(...items);
        }
        else {
            this.queue.push(...items);
        }
        console.log(`📋 Adicionados ${ids.length} IDs à fila (prioridade: ${priority})`);
        console.log(`📊 Total na fila: ${this.queue.length}`);
    }
    /**
     * Obtém próximo ID da fila
     */
    getNextId() {
        if (this.queue.length === 0) {
            return null;
        }
        // Remover IDs que excederam tentativas
        this.queue = this.queue.filter(item => item.attempts < this.maxRetries);
        if (this.queue.length === 0) {
            return null;
        }
        // Priorizar por prioridade e depois por ordem de chegada
        this.queue.sort((a, b) => {
            if (a.priority === 'high' && b.priority === 'normal')
                return -1;
            if (a.priority === 'normal' && b.priority === 'high')
                return 1;
            return a.addedAt.getTime() - b.addedAt.getTime();
        });
        return this.queue.shift() || null;
    }
    /**
     * Marca ID como processado com sucesso
     */
    markAsCompleted(id) {
        console.log(`✅ ID ${id} processado com sucesso`);
    }
    /**
     * Marca ID como falhou e recoloca na fila se não excedeu tentativas
     */
    markAsFailed(id, error) {
        const item = this.queue.find(item => item.id === id);
        if (item) {
            item.attempts++;
            item.lastAttempt = new Date();
            if (item.attempts < this.maxRetries) {
                console.log(`⚠️ ID ${id} falhou (tentativa ${item.attempts}/${this.maxRetries}): ${error}`);
                // Recolocar no final da fila
                this.queue.push(item);
            }
            else {
                console.log(`❌ ID ${id} removido após ${this.maxRetries} tentativas: ${error}`);
            }
        }
    }
    /**
     * Obtém estatísticas da fila
     */
    getStats() {
        const highPriority = this.queue.filter(item => item.priority === 'high').length;
        const normalPriority = this.queue.filter(item => item.priority === 'normal').length;
        return {
            total: this.queue.length,
            highPriority,
            normalPriority,
            processing: this.processing,
            currentPosition: this.currentPosition
        };
    }
    /**
     * Limpa a fila
     */
    clear() {
        this.queue = [];
        this.currentPosition = 0;
        console.log('🧹 Fila de IDs de motoristas limpa');
    }
    /**
     * Define se está processando
     */
    setProcessing(processing) {
        this.processing = processing;
    }
    /**
     * Obtém todos os IDs na fila
     */
    getAllIds() {
        return this.queue.map(item => item.id);
    }
    /**
     * Verifica se fila está vazia
     */
    isEmpty() {
        return this.queue.length === 0;
    }
}
exports.DriverIdQueue = DriverIdQueue;
