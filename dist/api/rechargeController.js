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
const express_1 = require("express");
const hybridOperationServiceV2_1 = require("../services/hybridOperationServiceV2");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// 🛡️ Aplicar rate limiting a todas as rotas (100 requests por 15 min)
router.use((0, auth_1.simpleRateLimit)(100, 15 * 60 * 1000));
/**
 * Controller para operações de recarga
 * Endpoints protegidos por token de acesso
 */
/**
 * POST /api/recharge/request
 * Endpoint para solicitar recarga de um motorista
 * PARA o scraper automaticamente e processa a recarga
 * 🔐 PROTEGIDO: Requer token de acesso
 */
router.post('/request', auth_1.validateApiToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('💰 Recebido pedido de recarga:', req.body);
        const { driverId, amount, priority = 'normal' } = req.body;
        // Validações
        if (!driverId) {
            return res.status(400).json({
                success: false,
                error: 'driver_id é obrigatório'
            });
        }
        if (!amount || amount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'amount deve ser maior que zero (em centavos)'
            });
        }
        // Obter instância do serviço híbrido
        const hybridService = hybridOperationServiceV2_1.HybridOperationService.getInstance({
            extractionBatchSize: 5,
            rechargePauseThreshold: 1,
            maxConcurrentRecharges: 3,
            stateCheckInterval: 10000,
            recoveryOnStart: true,
            autoFeedInterval: 30000,
            citiesRefreshInterval: 60000
        });
        // Solicitar recarga (automaticamente PARA o scraper)
        const rechargeId = hybridService.addRechargeToQueue(driverId, amount, priority === 'urgent');
        console.log(`✅ Recarga solicitada: ${driverId} - R$ ${amount / 100}`);
        console.log(`🔄 Sistema híbrido irá PAUSAR extração e processar recarga`);
        res.json({
            success: true,
            message: 'Recarga solicitada com sucesso',
            data: {
                rechargeId, // ID único para rastreamento
                driverId,
                amount,
                priority,
                status: 'queued',
                timestamp: new Date().toISOString(),
                trackingUrl: `/api/recharge/track/${rechargeId}`
            }
        });
    }
    catch (error) {
        console.error('❌ Erro ao processar pedido de recarga:', error);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            details: error.message
        });
    }
}));
/**
 * GET /api/recharge/track/:id
 * Rastreia o resultado específico de uma recarga
 * 🔐 PROTEGIDO: Requer token de acesso
 */
router.get('/track/:id', auth_1.validateApiToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const hybridService = hybridOperationServiceV2_1.HybridOperationService.getInstance({
            extractionBatchSize: 5,
            rechargePauseThreshold: 1,
            maxConcurrentRecharges: 3,
            stateCheckInterval: 10000,
            recoveryOnStart: true,
            autoFeedInterval: 30000,
            citiesRefreshInterval: 60000
        });
        const rechargeResult = hybridService.getRechargeResult(id);
        if (!rechargeResult) {
            return res.status(404).json({
                success: false,
                error: 'Recarga não encontrada',
                message: `ID ${id} não existe ou já foi removido`
            });
        }
        res.json({
            success: true,
            data: rechargeResult
        });
    }
    catch (error) {
        console.error('❌ Erro ao rastrear recarga:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao rastrear recarga',
            details: error.message
        });
    }
}));
/**
 * GET /api/recharge/status
 * Verifica status das recargas e do sistema híbrido
 * 🔐 PROTEGIDO: Requer token de acesso
 */
router.get('/status', auth_1.validateApiToken, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hybridService = hybridOperationServiceV2_1.HybridOperationService.getInstance({
            extractionBatchSize: 5,
            rechargePauseThreshold: 1,
            maxConcurrentRecharges: 3,
            stateCheckInterval: 10000,
            recoveryOnStart: true,
            autoFeedInterval: 30000,
            citiesRefreshInterval: 60000
        });
        const stats = hybridService.getStats();
        const queueStatus = hybridService.getQueueStatus();
        res.json({
            success: true,
            data: {
                systemStats: stats,
                queueStatus,
                timestamp: new Date().toISOString()
            }
        });
    }
    catch (error) {
        console.error('❌ Erro ao obter status:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao obter status',
            details: error.message
        });
    }
}));
/**
 * POST /api/recharge/stop
 * Para o sistema híbrido
 */
router.post('/stop', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hybridService = hybridOperationServiceV2_1.HybridOperationService.getInstance({
            extractionBatchSize: 5,
            rechargePauseThreshold: 1,
            maxConcurrentRecharges: 3,
            stateCheckInterval: 10000,
            recoveryOnStart: true,
            autoFeedInterval: 30000,
            citiesRefreshInterval: 60000
        });
        yield hybridService.stop();
        res.json({
            success: true,
            message: 'Sistema parado com sucesso'
        });
    }
    catch (error) {
        console.error('❌ Erro ao parar sistema:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao parar sistema',
            details: error.message
        });
    }
}));
/**
 * POST /api/recharge/start
 * Reinicia o sistema híbrido
 */
router.post('/start', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const hybridService = hybridOperationServiceV2_1.HybridOperationService.getInstance({
            extractionBatchSize: 5,
            rechargePauseThreshold: 1,
            maxConcurrentRecharges: 3,
            stateCheckInterval: 10000,
            recoveryOnStart: true,
            autoFeedInterval: 30000,
            citiesRefreshInterval: 60000
        });
        yield hybridService.start();
        res.json({
            success: true,
            message: 'Sistema reiniciado com sucesso'
        });
    }
    catch (error) {
        console.error('❌ Erro ao reiniciar sistema:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao reiniciar sistema',
            details: error.message
        });
    }
}));
exports.default = router;
