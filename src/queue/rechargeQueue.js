"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RechargeQueue = void 0;
class RechargeQueue {
    constructor() {
        this.queue = [];
        this.processing = false;
        this.currentRequest = null;
        this.maxRetries = 3;
    }
    static getInstance() {
        if (!RechargeQueue.instance) {
            RechargeQueue.instance = new RechargeQueue();
        }
        return RechargeQueue.instance;
    }
    /**
     * Adiciona nova solicitação de recarga
     */
    addRechargeRequest(driverId, amount, priority = 'normal', requestId) {
        const id = this.generateRequestId();
        const request = {
            id,
            driverId,
            amount,
            priority,
            requestedAt: new Date(),
            attempts: 0,
            status: 'pending',
            requestId
        };
        // Adicionar à fila respeitando prioridade
        if (priority === 'urgent') {
            this.queue.unshift(request);
        }
        else {
            this.queue.push(request);
        }
        console.log(`🔋 Nova recarga adicionada: ${driverId} -> ${amount} créditos (prioridade: ${priority})`);
        console.log(`📊 Total de recargas na fila: ${this.queue.length}`);
        return id;
    }
    /**
     * Verifica se há recargas pendentes
     */
    hasPending() {
        return this.queue.some(req => req.status === 'pending');
    }
    /**
     * Obtém próxima recarga da fila
     */
    getNext() {
        // Filtrar apenas pendentes e que não excederam tentativas
        const pendingRequests = this.queue.filter(req => req.status === 'pending' && req.attempts < this.maxRetries);
        if (pendingRequests.length === 0) {
            return null;
        }
        // Priorizar por urgência e depois por ordem de chegada
        pendingRequests.sort((a, b) => {
            if (a.priority === 'urgent' && b.priority === 'normal')
                return -1;
            if (a.priority === 'normal' && b.priority === 'urgent')
                return 1;
            return a.requestedAt.getTime() - b.requestedAt.getTime();
        });
        const request = pendingRequests[0];
        request.status = 'processing';
        this.currentRequest = request;
        return request;
    }
    /**
     * Marca recarga como concluída
     */
    markAsCompleted(requestId) {
        const request = this.queue.find(req => req.id === requestId);
        if (request) {
            request.status = 'completed';
            this.currentRequest = null;
            console.log(`✅ Recarga concluída: ${request.driverId} -> ${request.amount} créditos`);
        }
    }
    /**
     * Marca recarga como falhou
     */
    markAsFailed(requestId, error) {
        const request = this.queue.find(req => req.id === requestId);
        if (request) {
            request.attempts++;
            request.lastAttempt = new Date();
            if (request.attempts < this.maxRetries) {
                request.status = 'pending'; // Recolocar na fila
                console.log(`⚠️ Recarga falhou (tentativa ${request.attempts}/${this.maxRetries}): ${request.driverId} -> ${error}`);
            }
            else {
                request.status = 'failed';
                console.log(`❌ Recarga removida após ${this.maxRetries} tentativas: ${request.driverId} -> ${error}`);
            }
            this.currentRequest = null;
        }
    }
    /**
     * Obtém estatísticas da fila
     */
    getStats() {
        const pending = this.queue.filter(req => req.status === 'pending').length;
        const processing = this.queue.filter(req => req.status === 'processing').length;
        const completed = this.queue.filter(req => req.status === 'completed').length;
        const failed = this.queue.filter(req => req.status === 'failed').length;
        const urgent = this.queue.filter(req => req.priority === 'urgent').length;
        const normal = this.queue.filter(req => req.priority === 'normal').length;
        return {
            total: this.queue.length,
            pending,
            processing,
            completed,
            failed,
            urgent,
            normal,
            currentRequest: this.currentRequest
        };
    }
    /**
     * Limpa recargas concluídas/falhas antigas
     */
    cleanup(olderThanHours = 24) {
        const cutoff = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
        const initialCount = this.queue.length;
        this.queue = this.queue.filter(req => {
            if (req.status === 'pending' || req.status === 'processing') {
                return true; // Manter pendentes e em processamento
            }
            return req.requestedAt > cutoff; // Remover antigas concluídas/falhas
        });
        const removed = initialCount - this.queue.length;
        if (removed > 0) {
            console.log(`🧹 Removidas ${removed} recargas antigas da fila`);
        }
    }
    /**
     * Gera ID único para requisição
     */
    generateRequestId() {
        return `recharge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Verifica se está processando
     */
    isProcessing() {
        return this.processing;
    }
    /**
     * Define estado de processamento
     */
    setProcessing(processing) {
        this.processing = processing;
    }
    /**
     * Obtém recarga por ID
     */
    getRequestById(id) {
        return this.queue.find(req => req.id === id) || null;
    }
    /**
     * Obtém todas as requisições
     */
    getAllRequests() {
        return [...this.queue];
    }
    /**
     * Obtém próxima requisição para processamento
     */
    getNextRequest() {
        const pendingRequests = this.queue.filter(req => req.status === 'pending');
        if (pendingRequests.length === 0) {
            return null;
        }
        // Ordenar por prioridade
        pendingRequests.sort((a, b) => {
            if (a.priority === 'urgent' && b.priority !== 'urgent')
                return -1;
            if (a.priority !== 'urgent' && b.priority === 'urgent')
                return 1;
            return a.requestedAt.getTime() - b.requestedAt.getTime();
        });
        const request = pendingRequests[0];
        request.status = 'processing';
        this.currentRequest = request;
        return request;
    }
}
exports.RechargeQueue = RechargeQueue;
