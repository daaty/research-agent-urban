"use strict";
/**
 * 🚨 AlertSystem - Sistema de alertas inteligente para monitoramento
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
exports.AlertSystem = void 0;
/**
 * 🚨 AlertSystem - Sistema inteligente de alertas para scrapers
 */
class AlertSystem {
    constructor(config) {
        this.alertHistory = [];
        this.cooldownTracker = new Map();
        this.lastHeartbeat = 0;
        this.config = Object.assign({ enabled: true, webhookUrl: process.env.N8N_WEBHOOK_URL || '', alertTypes: ['SCRAPER_DOWN', 'LOGIN_FAILED', 'SCRAPER_STARTED', 'SCRAPER_STOPPED'], cooldownMs: 300000, maxRetries: 3, enableHeartbeat: true, heartbeatIntervalMs: 300000, scraperIdentifier: process.env.RIDES_USERNAME || 'unknown' }, config);
        this.scraperStartTime = Date.now();
        this.lastActivity = Date.now();
        console.log('🚨 [AlertSystem] Inicializado para scraper:', this.config.scraperIdentifier);
        console.log('🚨 [AlertSystem] Alertas habilitados:', this.config.alertTypes);
        if (this.config.enableHeartbeat) {
            this.startHeartbeat();
        }
        // Enviar alerta de inicialização
        this.sendAlert('SCRAPER_STARTED', 'LOW', 'Scraper Iniciado', 'Sistema de scraping iniciado com sucesso');
    }
    /**
     * 🚨 Enviar alerta principal
     */
    sendAlert(type_1, severity_1, title_1, message_1) {
        return __awaiter(this, arguments, void 0, function* (type, severity, title, message, metadata = {}) {
            if (!this.config.enabled) {
                console.log('🚨 [AlertSystem] Alertas desabilitados - ignorando');
                return { success: false, alertId: '', error: 'Alerts disabled' };
            }
            if (!this.config.alertTypes.includes(type)) {
                console.log(`🚨 [AlertSystem] Tipo de alerta não habilitado: ${type}`);
                return { success: false, alertId: '', error: 'Alert type not enabled' };
            }
            // Verificar cooldown
            if (this.isInCooldown(type)) {
                const remainingCooldown = this.getRemainingCooldown(type);
                console.log(`🚨 [AlertSystem] Alerta em cooldown: ${type} (${Math.round(remainingCooldown / 1000)}s restantes)`);
                return { success: false, alertId: '', error: 'In cooldown' };
            }
            const alert = {
                id: this.generateAlertId(),
                type,
                severity,
                title,
                message,
                scraperIdentifier: this.config.scraperIdentifier,
                timestamp: Date.now(),
                metadata: Object.assign({ username: this.config.scraperIdentifier, lastActivity: new Date(this.lastActivity).toISOString(), systemMetrics: this.getSystemMetrics() }, metadata),
                resolved: false
            };
            console.log(`🚨 [AlertSystem] Enviando alerta: ${type} - ${severity} - ${title}`);
            try {
                const webhookResult = yield this.sendToWebhook(alert);
                if (webhookResult.success) {
                    this.alertHistory.push(alert);
                    this.setCooldown(type);
                    console.log(`✅ [AlertSystem] Alerta enviado com sucesso: ${alert.id}`);
                    return {
                        success: true,
                        alertId: alert.id,
                        webhookResponse: webhookResult.response
                    };
                }
                else {
                    console.error(`❌ [AlertSystem] Falha ao enviar alerta: ${webhookResult.error}`);
                    return {
                        success: false,
                        alertId: alert.id,
                        error: webhookResult.error
                    };
                }
            }
            catch (error) {
                console.error('❌ [AlertSystem] Erro crítico ao enviar alerta:', error);
                return {
                    success: false,
                    alertId: alert.id,
                    error: error instanceof Error ? error.message : String(error)
                };
            }
        });
    }
    /**
     * 🔥 Alertas específicos para problemas críticos
     */
    alertScraperDown(errorDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.sendAlert('SCRAPER_DOWN', 'CRITICAL', '🔥 SCRAPER PAROU DE FUNCIONAR', `Scraper ${this.config.scraperIdentifier} parou de responder`, {
                errorDetails,
                actionRequired: 'Verificar logs e reiniciar scraper',
                uptime: this.getUptime()
            });
        });
    }
    alertLoginFailed(errorDetails) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.sendAlert('LOGIN_FAILED', 'CRITICAL', '🚫 FALHA DE LOGIN DETECTADA', `Scraper ${this.config.scraperIdentifier} não conseguiu fazer login`, {
                errorDetails,
                actionRequired: 'Verificar credenciais e status da conta',
                loginAttempts: 'multiple_failures'
            });
        });
    }
    alertPerformanceDegraded(metrics) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.sendAlert('PERFORMANCE_DEGRADED', 'MEDIUM', '⚠️ PERFORMANCE DEGRADADA', `Scraper ${this.config.scraperIdentifier} com performance abaixo do normal`, {
                performanceMetrics: metrics,
                actionRequired: 'Monitorar sistema e recursos'
            });
        });
    }
    alertHighErrorRate(errorRate) {
        return __awaiter(this, void 0, void 0, function* () {
            return this.sendAlert('HIGH_ERROR_RATE', 'HIGH', '🚨 ALTA TAXA DE ERROS', `Scraper ${this.config.scraperIdentifier} com ${errorRate}% de taxa de erro`, {
                errorRate,
                actionRequired: 'Investigar causa dos erros'
            });
        });
    }
    /**
     * 📡 Sistema de Heartbeat
     */
    /**
     * 🛑 Para o sistema de heartbeat
     */
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = undefined;
            console.log('💓 Sistema de heartbeat parado');
        }
    }
    startHeartbeat() {
        this.heartbeatInterval = setInterval(() => __awaiter(this, void 0, void 0, function* () {
            yield this.sendHeartbeat();
        }), this.config.heartbeatIntervalMs);
        console.log(`💓 [AlertSystem] Heartbeat iniciado: ${this.config.heartbeatIntervalMs}ms`);
    }
    sendHeartbeat() {
        return __awaiter(this, void 0, void 0, function* () {
            this.lastHeartbeat = Date.now();
            const heartbeatAlert = yield this.sendAlert('HEARTBEAT', 'LOW', '💓 Scraper Ativo', `Heartbeat do scraper ${this.config.scraperIdentifier}`, {
                uptime: this.getUptime(),
                lastActivity: new Date(this.lastActivity).toISOString(),
                systemHealth: 'operational'
            });
            if (heartbeatAlert.success) {
                console.log(`💓 [AlertSystem] Heartbeat enviado: ${this.config.scraperIdentifier}`);
            }
        });
    }
    /**
     * 📡 Enviar para webhook N8N
     */
    sendToWebhook(alert) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.config.webhookUrl) {
                return { success: false, error: 'Webhook URL not configured' };
            }
            const payload = {
                alert_type: 'SCRAPER_ALERT',
                alert: {
                    id: alert.id,
                    type: alert.type,
                    severity: alert.severity,
                    title: alert.title,
                    message: alert.message,
                    scraper_identifier: alert.scraperIdentifier,
                    timestamp: new Date(alert.timestamp).toISOString(),
                    metadata: alert.metadata
                },
                scraper_info: {
                    username: this.config.scraperIdentifier,
                    uptime: this.getUptime(),
                    last_activity: new Date(this.lastActivity).toISOString(),
                    alert_history_count: this.alertHistory.length
                },
                system_info: {
                    environment: process.env.NODE_ENV || 'development',
                    version: '3.0.0',
                    timestamp: new Date().toISOString()
                }
            };
            try {
                const axios = require('axios');
                const response = yield axios.post(this.config.webhookUrl, payload, {
                    headers: {
                        'Content-Type': 'application/json',
                        'User-Agent': 'Scraper-Alert-System/3.0.0'
                    },
                    timeout: 30000
                });
                return { success: true, response: response.data };
            }
            catch (error) {
                return {
                    success: false,
                    error: ((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message || 'Unknown webhook error'
                };
            }
        });
    }
    /**
     * ⏰ Gestão de cooldown
     */
    isInCooldown(type) {
        const lastSent = this.cooldownTracker.get(type);
        if (!lastSent)
            return false;
        return (Date.now() - lastSent) < this.config.cooldownMs;
    }
    getRemainingCooldown(type) {
        const lastSent = this.cooldownTracker.get(type) || 0;
        const elapsed = Date.now() - lastSent;
        return Math.max(0, this.config.cooldownMs - elapsed);
    }
    setCooldown(type) {
        this.cooldownTracker.set(type, Date.now());
    }
    /**
     * 🔧 Métodos utilitários
     */
    updateActivity() {
        this.lastActivity = Date.now();
    }
    getUptime() {
        const uptimeMs = Date.now() - this.scraperStartTime;
        const hours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const minutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m`;
    }
    getSystemMetrics() {
        return {
            uptime: this.getUptime(),
            memory_usage: process.memoryUsage(),
            last_heartbeat: this.lastHeartbeat ? new Date(this.lastHeartbeat).toISOString() : null,
            alert_count: this.alertHistory.length
        };
    }
    generateAlertId() {
        return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * 📊 Métodos de gestão e monitoramento
     */
    getAlertHistory() {
        return [...this.alertHistory];
    }
    getUnresolvedAlerts() {
        return this.alertHistory.filter(alert => !alert.resolved);
    }
    resolveAlert(alertId) {
        const alert = this.alertHistory.find(a => a.id === alertId);
        if (alert && !alert.resolved) {
            alert.resolved = true;
            alert.resolvedAt = Date.now();
            console.log(`✅ [AlertSystem] Alerta resolvido: ${alertId}`);
            return true;
        }
        return false;
    }
    getAlertStats() {
        const byType = {};
        const bySeverity = {};
        this.alertHistory.forEach(alert => {
            byType[alert.type] = (byType[alert.type] || 0) + 1;
            bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
        });
        const lastAlert = this.alertHistory.length > 0
            ? new Date(this.alertHistory[this.alertHistory.length - 1].timestamp)
            : undefined;
        return {
            total: this.alertHistory.length,
            byType,
            bySeverity,
            unresolved: this.getUnresolvedAlerts().length,
            lastAlert
        };
    }
    updateConfig(newConfig) {
        this.config = Object.assign(Object.assign({}, this.config), newConfig);
        console.log('⚙️ [AlertSystem] Configuração atualizada:', newConfig);
    }
    testAlert() {
        return __awaiter(this, void 0, void 0, function* () {
            return this.sendAlert('HEARTBEAT', 'LOW', '🧪 TESTE DE ALERTA', `Teste do sistema de alertas para ${this.config.scraperIdentifier}`, {
                test: true,
                timestamp: new Date().toISOString()
            });
        });
    }
    /**
     * 🛑 Shutdown graceful
     */
    shutdown() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        // Enviar alerta de parada
        this.sendAlert('SCRAPER_STOPPED', 'MEDIUM', '🛑 Scraper Finalizado', `Scraper ${this.config.scraperIdentifier} foi finalizado`, {
            uptime: this.getUptime(),
            final_alert_count: this.alertHistory.length
        }).catch(console.error);
        console.log('🛑 [AlertSystem] Sistema de alertas finalizado');
    }
}
exports.AlertSystem = AlertSystem;
