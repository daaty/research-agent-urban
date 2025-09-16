"use strict";
/**
 * 🎛️ RateLimiter - Sistema de controle de taxa de requisições
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
exports.RateLimiter = void 0;
/**
 * 🎛️ RateLimiter - Token Bucket Algorithm com proteção por endpoint
 */
class RateLimiter {
    constructor(config) {
        this.endpointBuckets = new Map();
        this.config = Object.assign({ tokensPerSecond: 2, burstCapacity: 5, windowSizeMs: 60000, enableBurstProtection: true, enablePerEndpointLimiting: true, defaultEndpointLimit: 10, endpointLimits: new Map([
                ['webhook-n8n-delivery', 6], // N8N: 6/min
                ['webhook-discord', 30], // Discord: 30/min
                ['webhook-slack', 20], // Slack: 20/min
                ['webhook-telegram', 30] // Telegram: 30/min
            ]) }, config);
        this.globalBucket = {
            tokens: this.config.burstCapacity,
            lastRefill: Date.now(),
            capacity: this.config.burstCapacity,
            refillRate: this.config.tokensPerSecond
        };
        this.metrics = {
            totalRequests: 0,
            allowedRequests: 0,
            blockedRequests: 0,
            blockedPercentage: 0,
            currentTokens: this.config.burstCapacity,
            averageWaitTime: 0,
            endpointMetrics: new Map()
        };
        this.startTime = Date.now();
        console.log('🎛️ [RateLimiter] Inicializado com configuração:', {
            tokensPerSecond: this.config.tokensPerSecond,
            burstCapacity: this.config.burstCapacity,
            endpointLimits: Object.fromEntries(this.config.endpointLimits)
        });
    }
    /**
     * 🎯 Verificar se requisição é permitida
     */
    checkLimit() {
        return __awaiter(this, arguments, void 0, function* (endpoint = 'default') {
            const now = Date.now();
            this.metrics.totalRequests++;
            // Atualizar métricas do endpoint
            this.updateEndpointMetrics(endpoint);
            // 1. Verificar rate limit global
            const globalResult = this.checkGlobalLimit(now);
            if (!globalResult.allowed) {
                this.metrics.blockedRequests++;
                this.updateBlockedPercentage();
                return Object.assign(Object.assign({}, globalResult), { endpoint, reason: 'Global rate limit exceeded' });
            }
            // 2. Verificar rate limit por endpoint (se habilitado)
            if (this.config.enablePerEndpointLimiting) {
                const endpointResult = this.checkEndpointLimit(endpoint, now);
                if (!endpointResult.allowed) {
                    this.metrics.blockedRequests++;
                    this.updateBlockedPercentage();
                    return Object.assign(Object.assign({}, endpointResult), { endpoint, reason: 'Endpoint rate limit exceeded' });
                }
            }
            // 3. Consumir token do bucket global
            this.globalBucket.tokens--;
            this.metrics.currentTokens = this.globalBucket.tokens;
            this.metrics.allowedRequests++;
            // 4. Consumir token do bucket do endpoint
            if (this.config.enablePerEndpointLimiting) {
                const endpointBucket = this.getOrCreateEndpointBucket(endpoint);
                endpointBucket.tokens--;
            }
            console.log(`✅ [RateLimiter] Requisição permitida: ${endpoint} (${this.globalBucket.tokens} tokens restantes)`);
            return {
                allowed: true,
                tokensRemaining: this.globalBucket.tokens,
                resetTime: this.calculateResetTime(),
                endpoint
            };
        });
    }
    /**
     * 🌍 Verificar rate limit global
     */
    checkGlobalLimit(now) {
        this.refillGlobalBucket(now);
        if (this.globalBucket.tokens < 1) {
            const retryAfter = Math.ceil((1 - this.globalBucket.tokens) / this.config.tokensPerSecond * 1000);
            console.log(`🚫 [RateLimiter] Rate limit global atingido - retry após ${retryAfter}ms`);
            return {
                allowed: false,
                tokensRemaining: 0,
                resetTime: this.calculateResetTime(),
                retryAfter,
                endpoint: 'global'
            };
        }
        return {
            allowed: true,
            tokensRemaining: Math.floor(this.globalBucket.tokens),
            resetTime: this.calculateResetTime(),
            endpoint: 'global'
        };
    }
    /**
     * 🎯 Verificar rate limit por endpoint
     */
    checkEndpointLimit(endpoint, now) {
        const bucket = this.getOrCreateEndpointBucket(endpoint);
        this.refillEndpointBucket(bucket, now);
        if (bucket.tokens < 1) {
            const retryAfter = Math.ceil((1 - bucket.tokens) / bucket.refillRate * 1000);
            console.log(`🚫 [RateLimiter] Rate limit do endpoint ${endpoint} atingido - retry após ${retryAfter}ms`);
            return {
                allowed: false,
                tokensRemaining: 0,
                resetTime: now + retryAfter,
                retryAfter,
                endpoint
            };
        }
        return {
            allowed: true,
            tokensRemaining: Math.floor(bucket.tokens),
            resetTime: now + (bucket.capacity / bucket.refillRate * 1000),
            endpoint
        };
    }
    /**
     * 🪣 Reabastecer bucket global
     */
    refillGlobalBucket(now) {
        const timePassed = (now - this.globalBucket.lastRefill) / 1000;
        const tokensToAdd = timePassed * this.globalBucket.refillRate;
        this.globalBucket.tokens = Math.min(this.globalBucket.capacity, this.globalBucket.tokens + tokensToAdd);
        this.globalBucket.lastRefill = now;
        this.metrics.currentTokens = this.globalBucket.tokens;
    }
    /**
     * 🎯 Reabastecer bucket do endpoint
     */
    refillEndpointBucket(bucket, now) {
        const timePassed = (now - bucket.lastRefill) / 1000;
        const tokensToAdd = timePassed * bucket.refillRate;
        bucket.tokens = Math.min(bucket.capacity, bucket.tokens + tokensToAdd);
        bucket.lastRefill = now;
    }
    /**
     * 🏗️ Obter ou criar bucket do endpoint
     */
    getOrCreateEndpointBucket(endpoint) {
        if (!this.endpointBuckets.has(endpoint)) {
            const limit = this.config.endpointLimits.get(endpoint) || this.config.defaultEndpointLimit;
            const refillRate = limit / (this.config.windowSizeMs / 1000); // requests per second
            const bucket = {
                tokens: limit,
                lastRefill: Date.now(),
                capacity: limit,
                refillRate: refillRate
            };
            this.endpointBuckets.set(endpoint, bucket);
            console.log(`🎯 [RateLimiter] Bucket criado para ${endpoint}: ${limit} requests/${this.config.windowSizeMs}ms`);
        }
        return this.endpointBuckets.get(endpoint);
    }
    /**
     * 📊 Atualizar métricas do endpoint
     */
    updateEndpointMetrics(endpoint) {
        if (!this.metrics.endpointMetrics.has(endpoint)) {
            this.metrics.endpointMetrics.set(endpoint, {
                requests: 0,
                blocked: 0,
                lastRequest: Date.now()
            });
        }
        const endpointMetric = this.metrics.endpointMetrics.get(endpoint);
        endpointMetric.requests++;
        endpointMetric.lastRequest = Date.now();
    }
    /**
     * 📈 Calcular tempo de reset
     */
    calculateResetTime() {
        const tokenDeficit = this.globalBucket.capacity - this.globalBucket.tokens;
        const timeToFull = (tokenDeficit / this.globalBucket.refillRate) * 1000;
        return Date.now() + timeToFull;
    }
    /**
     * 📊 Atualizar percentual de bloqueios
     */
    updateBlockedPercentage() {
        if (this.metrics.totalRequests > 0) {
            this.metrics.blockedPercentage =
                (this.metrics.blockedRequests / this.metrics.totalRequests) * 100;
        }
    }
    /**
     * ⏳ Aguardar até que seja seguro fazer requisição
     */
    waitForToken() {
        return __awaiter(this, arguments, void 0, function* (endpoint = 'default') {
            const maxWaitTime = 30000; // Máximo 30 segundos
            const startWait = Date.now();
            while (Date.now() - startWait < maxWaitTime) {
                const result = yield this.checkLimit(endpoint);
                if (result.allowed) {
                    const waitTime = Date.now() - startWait;
                    this.updateAverageWaitTime(waitTime);
                    if (waitTime > 0) {
                        console.log(`⏳ [RateLimiter] Aguardou ${waitTime}ms para ${endpoint}`);
                    }
                    return result;
                }
                // Aguardar um pouco antes de tentar novamente
                const waitMs = Math.min(result.retryAfter || 1000, 5000);
                yield this.sleep(waitMs);
            }
            // Timeout - forçar bloqueio
            console.log(`⏰ [RateLimiter] Timeout aguardando token para ${endpoint}`);
            return {
                allowed: false,
                tokensRemaining: 0,
                resetTime: Date.now() + 60000,
                retryAfter: 60000,
                endpoint,
                reason: 'Wait timeout exceeded'
            };
        });
    }
    /**
     * 📊 Obter métricas atuais
     */
    getMetrics() {
        this.updateBlockedPercentage();
        return Object.assign(Object.assign({}, this.metrics), { endpointMetrics: new Map(this.metrics.endpointMetrics) });
    }
    /**
     * 📈 Obter status de saúde do rate limiter
     */
    getHealthStatus() {
        const blocked = this.metrics.blockedPercentage;
        const tokens = this.metrics.currentTokens;
        let status;
        let details;
        const recommendations = [];
        if (blocked < 5 && tokens > this.config.burstCapacity * 0.5) {
            status = 'healthy';
            details = 'Rate limiter funcionando normalmente';
        }
        else if (blocked < 20 && tokens > this.config.burstCapacity * 0.2) {
            status = 'degraded';
            details = 'Rate limiter sob pressão moderada';
            recommendations.push('⚠️ Considerar aumentar capacidade do bucket');
        }
        else {
            status = 'unhealthy';
            details = 'Rate limiter com alta pressão';
            recommendations.push('🚨 Urgente: Revisar configuração de rate limiting');
            recommendations.push('📈 Analisar padrões de tráfego');
        }
        if (tokens < 1) {
            recommendations.push('⏳ Sistema em rate limit - aguardando tokens');
        }
        if (blocked > 10) {
            recommendations.push('📊 Alta taxa de bloqueios - revisar limites');
        }
        return {
            status,
            details,
            tokensAvailable: Math.floor(tokens),
            blockedPercentage: Math.round(blocked * 100) / 100,
            recommendations
        };
    }
    /**
     * ⚙️ Atualizar configuração em runtime
     */
    updateConfig(newConfig) {
        const oldConfig = Object.assign({}, this.config);
        this.config = Object.assign(Object.assign({}, this.config), newConfig);
        // Atualizar bucket global se necessário
        if (newConfig.burstCapacity && newConfig.burstCapacity !== oldConfig.burstCapacity) {
            this.globalBucket.capacity = newConfig.burstCapacity;
            this.globalBucket.tokens = Math.min(this.globalBucket.tokens, newConfig.burstCapacity);
        }
        if (newConfig.tokensPerSecond && newConfig.tokensPerSecond !== oldConfig.tokensPerSecond) {
            this.globalBucket.refillRate = newConfig.tokensPerSecond;
        }
        // Limpar buckets de endpoint para recriar com nova configuração
        if (newConfig.endpointLimits || newConfig.defaultEndpointLimit || newConfig.windowSizeMs) {
            this.endpointBuckets.clear();
            console.log('🧹 [RateLimiter] Buckets de endpoint recriados com nova configuração');
        }
        console.log('⚙️ [RateLimiter] Configuração atualizada:', newConfig);
    }
    /**
     * 🔄 Reset completo do rate limiter
     */
    reset() {
        this.globalBucket.tokens = this.globalBucket.capacity;
        this.globalBucket.lastRefill = Date.now();
        this.endpointBuckets.clear();
        this.metrics = {
            totalRequests: 0,
            allowedRequests: 0,
            blockedRequests: 0,
            blockedPercentage: 0,
            currentTokens: this.globalBucket.tokens,
            averageWaitTime: 0,
            endpointMetrics: new Map()
        };
        this.startTime = Date.now();
        console.log('🔄 [RateLimiter] Reset completo realizado');
    }
    /**
     * 📊 Obter estatísticas detalhadas
     */
    getDetailedStats() {
        const uptime = Date.now() - this.startTime;
        const requestsPerSecond = this.metrics.totalRequests / (uptime / 1000);
        const endpointStats = Array.from(this.metrics.endpointMetrics.entries()).map(([endpoint, metrics]) => {
            const bucket = this.endpointBuckets.get(endpoint);
            return {
                endpoint,
                requests: metrics.requests,
                blocked: metrics.blocked,
                blockRate: metrics.requests > 0 ? (metrics.blocked / metrics.requests) * 100 : 0,
                tokensRemaining: bucket ? Math.floor(bucket.tokens) : 0
            };
        });
        return {
            uptime,
            requestsPerSecond: Math.round(requestsPerSecond * 100) / 100,
            globalBucket: {
                tokens: Math.floor(this.globalBucket.tokens),
                capacity: this.globalBucket.capacity,
                refillRate: this.globalBucket.refillRate,
                utilizationPercentage: Math.round((1 - this.globalBucket.tokens / this.globalBucket.capacity) * 100)
            },
            endpointStats
        };
    }
    /**
     * 🛠️ Métodos auxiliares
     */
    updateAverageWaitTime(waitTime) {
        if (this.metrics.averageWaitTime === 0) {
            this.metrics.averageWaitTime = waitTime;
        }
        else {
            // Moving average
            this.metrics.averageWaitTime = (this.metrics.averageWaitTime * 0.9) + (waitTime * 0.1);
        }
    }
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.RateLimiter = RateLimiter;
