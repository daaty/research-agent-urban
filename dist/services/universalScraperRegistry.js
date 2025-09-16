"use strict";
/**
 * 📊 UNIVERSAL SCRAPER REGISTRY
 *
 * Sistema universal que registra scrapers no banco PostgreSQL
 * independentemente da configuração ENABLE_DASHBOARD.
 *
 * - ENABLE_DASHBOARD=true: Dashboard completo + API + WebSocket
 * - ENABLE_DASHBOARD=false: Apenas registro passivo no banco
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
exports.UniversalScraperRegistry = void 0;
const monitoringService_1 = require("../services/monitoringService");
class UniversalScraperRegistry {
    constructor() {
        this.monitoring = monitoringService_1.MonitoringService.getInstance();
        this.scraperId = this.getCurrentScraperId();
        this.scraperName = process.env.RIDES_USERNAME || 'default-scraper';
    }
    static getInstance() {
        if (!UniversalScraperRegistry.instance) {
            UniversalScraperRegistry.instance = new UniversalScraperRegistry();
        }
        return UniversalScraperRegistry.instance;
    }
    /**
     * 🆔 Obter ID do scraper atual
     */
    getCurrentScraperId() {
        // Usar RIDES_USERNAME como base para ID único
        const username = process.env.RIDES_USERNAME || 'default';
        return `scraper-${Buffer.from(username).toString('base64').slice(0, 8)}`;
    }
    /**
     * 📝 Registrar scraper no sistema universal
     * Salva no banco independentemente de ENABLE_DASHBOARD
     */
    registerScraper() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Salvar no banco através do MonitoringService
                yield this.monitoring.saveScraperStatusToDatabase(this.scraperId, this.scraperName, 'STARTING', Date.now(), 0, // lastActivity
                {
                    successRate: 0,
                    ridesScraped: 0,
                    driversScraped: 0,
                    errorsCount: 0,
                    responseTimeMs: 0
                });
                console.log(`📊 [UniversalRegistry] Scraper registrado: ${this.scraperId} (${this.scraperName})`);
            }
            catch (error) {
                console.error('❌ [UniversalRegistry] Erro ao registrar scraper:', error);
            }
        });
    }
    /**
     * 💓 Atualizar heartbeat no banco
     */
    updateHeartbeat() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.monitoring.saveScraperStatusToDatabase(this.scraperId, this.scraperName, 'ACTIVE', Date.now(), Date.now());
            }
            catch (error) {
                console.error('❌ [UniversalRegistry] Erro ao atualizar heartbeat:', error);
            }
        });
    }
    /**
     * 📊 Atualizar métricas no banco
     */
    updateMetrics(metrics) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.monitoring.saveScraperStatusToDatabase(this.scraperId, this.scraperName, 'ACTIVE', Date.now(), Date.now(), {
                    successRate: metrics.successRate || 0,
                    ridesScraped: metrics.ridesScraped || 0,
                    driversScraped: metrics.driversScraped || 0,
                    errorsCount: metrics.errorsCount || 0,
                    responseTimeMs: 0
                });
            }
            catch (error) {
                console.error('❌ [UniversalRegistry] Erro ao atualizar métricas:', error);
            }
        });
    }
    /**
     * 🏁 Finalizar scraper
     */
    finalizeScraper() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.monitoring.saveScraperStatusToDatabase(this.scraperId, this.scraperName, 'OFFLINE', Date.now(), Date.now());
            }
            catch (error) {
                console.error('❌ [UniversalRegistry] Erro ao finalizar scraper:', error);
            }
        });
    }
    /**
     * 📋 Getters para informações do scraper
     */
    getScraperId() {
        return this.scraperId;
    }
    getScraperName() {
        return this.scraperName;
    }
}
exports.UniversalScraperRegistry = UniversalScraperRegistry;
UniversalScraperRegistry.instance = null;
