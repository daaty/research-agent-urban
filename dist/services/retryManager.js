"use strict";
/**
 * 🔄 RetryManager - Sistema robusto de retry para webhooks
 */
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
exports.RetryManager = void 0;
/**
 * 🔄 RetryManager - Gerencia tentativas de retry com circuit breaker
 */
class RetryManager {
    constructor(config) {
        this.deadLetterQueue = [];
        this.config = Object.assign({ maxRetries: 3, baseDelay: 1000, maxDelay: 30000, backoffMultiplier: 2, jitterEnabled: true, circuitBreakerEnabled: true, circuitBreakerThreshold: 5, circuitBreakerTimeout: 60000, deadLetterQueueEnabled: true, deadLetterQueueMaxSize: 100 }, config);
        this.circuitBreaker = {
            state: 'CLOSED',
            failureCount: 0,
            lastFailureTime: 0,
            nextAttemptTime: 0
        };
        this.metrics = {
            totalAttempts: 0,
            totalSuccesses: 0,
            totalFailures: 0,
            circuitBreakerTrips: 0,
            deadLetterQueueItems: 0
        };
        console.log('🔄 [RetryManager] Inicializado com configuração:', this.config);
    }
    /**
     * 🚀 Executa operação com retry automático
     */
    executeWithRetry(operation_1) {
        return __awaiter(this, arguments, void 0, function* (operation, context = 'operation', payload) {
            const startTime = Date.now();
            const attempts = [];
            let lastError;
            console.log(`🔄 [RetryManager] Iniciando execução: ${context}`);
            // Verificar circuit breaker
            if (this.config.circuitBreakerEnabled && !this.isCircuitBreakerClosed()) {
                const cbResult = this.handleCircuitBreakerOpen(payload, context);
                if (cbResult)
                    return cbResult;
            }
            // Tentar execução com retry
            for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
                const attemptStart = Date.now();
                this.metrics.totalAttempts++;
                try {
                    // Delay antes da tentativa (exceto primeira)
                    if (attempt > 0) {
                        const delay = this.calculateDelay(attempt);
                        console.log(`⏳ [RetryManager] Aguardando ${delay}ms antes da tentativa ${attempt + 1}/${this.config.maxRetries + 1}`);
                        yield this.sleep(delay);
                        attempts.push({
                            attemptNumber: attempt,
                            timestamp: attemptStart,
                            delay: delay,
                            error: lastError
                        });
                    }
                    // Executar operação
                    console.log(`🎯 [RetryManager] Tentativa ${attempt + 1}/${this.config.maxRetries + 1}: ${context}`);
                    const result = yield operation();
                    // Sucesso!
                    const totalTime = Date.now() - startTime;
                    this.metrics.totalSuccesses++;
                    this.onSuccess();
                    console.log(`✅ [RetryManager] Sucesso em ${attempt + 1} tentativa(s) - ${totalTime}ms`);
                    return {
                        success: true,
                        result,
                        attempts: attempt + 1,
                        totalTime,
                        circuitBreakerTriggered: false,
                        sentToDeadLetterQueue: false
                    };
                }
                catch (error) {
                    lastError = error instanceof Error ? error : new Error(String(error));
                    this.metrics.totalFailures++;
                    console.log(`❌ [RetryManager] Tentativa ${attempt + 1} falhou: ${lastError.message}`);
                    // Verificar se deve continuar tentando
                    if (attempt === this.config.maxRetries) {
                        console.log(`🚫 [RetryManager] Máximo de tentativas atingido para: ${context}`);
                        break;
                    }
                    // Verificar se erro é retryable
                    if (!this.isRetryableError(lastError)) {
                        console.log(`🚫 [RetryManager] Erro não-retryable detectado: ${lastError.message}`);
                        break;
                    }
                    this.onFailure(lastError);
                }
            }
            // Todas as tentativas falharam
            const totalTime = Date.now() - startTime;
            const dlqSent = this.handleDeadLetterQueue(payload, lastError, attempts, context);
            return {
                success: false,
                error: lastError,
                attempts: attempts.length + 1,
                totalTime,
                circuitBreakerTriggered: this.circuitBreaker.state === 'OPEN',
                sentToDeadLetterQueue: dlqSent
            };
        });
    }
    /**
     * ⏱️ Calcular delay com exponential backoff e jitter
     */
    calculateDelay(attempt) {
        // Exponential backoff: delay = baseDelay * (multiplier ^ attempt)
        const exponentialDelay = this.config.baseDelay * Math.pow(this.config.backoffMultiplier, attempt - 1);
        // Aplicar limite máximo
        const clampedDelay = Math.min(exponentialDelay, this.config.maxDelay);
        // Adicionar jitter para evitar thundering herd
        if (this.config.jitterEnabled) {
            const jitter = Math.random() * 0.3; // ±30% de variação
            return Math.round(clampedDelay * (1 + jitter));
        }
        return clampedDelay;
    }
    /**
     * 🔒 Verificar se circuit breaker está fechado
     */
    isCircuitBreakerClosed() {
        if (!this.config.circuitBreakerEnabled)
            return true;
        const now = Date.now();
        switch (this.circuitBreaker.state) {
            case 'CLOSED':
                return true;
            case 'OPEN':
                if (now >= this.circuitBreaker.nextAttemptTime) {
                    console.log('🔄 [RetryManager] Circuit breaker mudando para HALF_OPEN');
                    this.circuitBreaker.state = 'HALF_OPEN';
                    return true;
                }
                return false;
            case 'HALF_OPEN':
                return true;
            default:
                return true;
        }
    }
    /**
     * 🚫 Lidar com circuit breaker aberto
     */
    handleCircuitBreakerOpen(payload, context) {
        if (this.circuitBreaker.state === 'OPEN') {
            console.log(`🚫 [RetryManager] Circuit breaker OPEN - rejeitando: ${context}`);
            const dlqSent = this.handleDeadLetterQueue(payload, new Error('Circuit breaker is OPEN'), [], context);
            return {
                success: false,
                error: new Error('Circuit breaker is OPEN'),
                attempts: 0,
                totalTime: 0,
                circuitBreakerTriggered: true,
                sentToDeadLetterQueue: dlqSent
            };
        }
        return null;
    }
    /**
     * ✅ Lidar com sucesso
     */
    onSuccess() {
        if (this.config.circuitBreakerEnabled) {
            if (this.circuitBreaker.state === 'HALF_OPEN') {
                console.log('✅ [RetryManager] Circuit breaker mudando para CLOSED');
                this.circuitBreaker.state = 'CLOSED';
                this.circuitBreaker.failureCount = 0;
            }
        }
    }
    /**
     * ❌ Lidar com falha
     */
    onFailure(error) {
        if (!this.config.circuitBreakerEnabled)
            return;
        this.circuitBreaker.failureCount++;
        this.circuitBreaker.lastFailureTime = Date.now();
        if (this.circuitBreaker.failureCount >= this.config.circuitBreakerThreshold) {
            console.log(`🚫 [RetryManager] Circuit breaker ABERTO após ${this.circuitBreaker.failureCount} falhas`);
            this.circuitBreaker.state = 'OPEN';
            this.circuitBreaker.nextAttemptTime = Date.now() + this.config.circuitBreakerTimeout;
            this.metrics.circuitBreakerTrips++;
        }
    }
    /**
     * 💀 Lidar com Dead Letter Queue
     */
    handleDeadLetterQueue(payload, error, attempts, context) {
        if (!this.config.deadLetterQueueEnabled || !payload) {
            return false;
        }
        // Verificar limite da DLQ
        if (this.deadLetterQueue.length >= this.config.deadLetterQueueMaxSize) {
            console.log('⚠️ [RetryManager] Dead Letter Queue cheia - removendo item mais antigo');
            this.deadLetterQueue.shift();
        }
        const dlqItem = {
            id: this.generateId(),
            payload,
            originalError: error,
            attempts,
            timestamp: Date.now(),
            retryAfter: Date.now() + (this.config.circuitBreakerTimeout * 2) // Retry depois de 2x o timeout do CB
        };
        this.deadLetterQueue.push(dlqItem);
        this.metrics.deadLetterQueueItems++;
        console.log(`💀 [RetryManager] Item adicionado à Dead Letter Queue: ${context} (${this.deadLetterQueue.length}/${this.config.deadLetterQueueMaxSize})`);
        return true;
    }
    /**
     * 🔍 Verificar se erro é retryable
     */
    isRetryableError(error) {
        const retryablePatterns = [
            /timeout/i,
            /ECONNRESET/i,
            /ENOTFOUND/i,
            /ECONNREFUSED/i,
            /socket hang up/i,
            /network error/i,
            /502/i, // Bad Gateway
            /503/i, // Service Unavailable
            /504/i // Gateway Timeout
        ];
        const nonRetryablePatterns = [
            /400/i, // Bad Request
            /401/i, // Unauthorized
            /403/i, // Forbidden
            /404/i, // Not Found
            /422/i // Unprocessable Entity
        ];
        // Verificar erros não-retryables primeiro
        for (const pattern of nonRetryablePatterns) {
            if (pattern.test(error.message)) {
                return false;
            }
        }
        // Verificar erros retryables
        for (const pattern of retryablePatterns) {
            if (pattern.test(error.message)) {
                return true;
            }
        }
        // Por padrão, considerar retryable se não houver match
        return true;
    }
    /**
     * 🔄 Processar items da Dead Letter Queue
     */
    processDLQ() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.config.deadLetterQueueEnabled || this.deadLetterQueue.length === 0) {
                return;
            }
            const now = Date.now();
            const itemsToRetry = this.deadLetterQueue.filter(item => item.retryAfter && now >= item.retryAfter);
            if (itemsToRetry.length === 0) {
                return;
            }
            console.log(`🔄 [RetryManager] Processando ${itemsToRetry.length} items da Dead Letter Queue`);
            for (const item of itemsToRetry) {
                // Remover da DLQ
                const index = this.deadLetterQueue.indexOf(item);
                if (index > -1) {
                    this.deadLetterQueue.splice(index, 1);
                }
                // Tentar reprocessar seria implementado pela aplicação
                console.log(`🔄 [RetryManager] Item DLQ ${item.id} pronto para reprocessamento`);
            }
        });
    }
    /**
     * 📊 Obter métricas
     */
    getMetrics() {
        const successRate = this.metrics.totalAttempts > 0
            ? (this.metrics.totalSuccesses / this.metrics.totalAttempts) * 100
            : 0;
        return Object.assign(Object.assign({}, this.metrics), { successRate: Math.round(successRate * 100) / 100, circuitBreakerState: this.circuitBreaker.state, deadLetterQueueSize: this.deadLetterQueue.length });
    }
    /**
     * 🔧 Obter Dead Letter Queue
     */
    getDeadLetterQueue() {
        return [...this.deadLetterQueue];
    }
    /**
     * 🧹 Limpar Dead Letter Queue
     */
    clearDeadLetterQueue() {
        const count = this.deadLetterQueue.length;
        this.deadLetterQueue = [];
        console.log(`🧹 [RetryManager] Dead Letter Queue limpa: ${count} items removidos`);
        return count;
    }
    /**
     * ⚙️ Atualizar configuração
     */
    updateConfig(newConfig) {
        this.config = Object.assign(Object.assign({}, this.config), newConfig);
        console.log('⚙️ [RetryManager] Configuração atualizada:', newConfig);
    }
    /**
     * 🔄 Reset circuit breaker
     */
    resetCircuitBreaker() {
        this.circuitBreaker = {
            state: 'CLOSED',
            failureCount: 0,
            lastFailureTime: 0,
            nextAttemptTime: 0
        };
        console.log('🔄 [RetryManager] Circuit breaker resetado');
    }
    /**
     * 🔧 Métodos auxiliares
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
}
exports.RetryManager = RetryManager;
