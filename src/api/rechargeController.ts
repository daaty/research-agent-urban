import { Router, Request, Response } from 'express';
import { HybridOperationService } from '../services/hybridOperationServiceV2';
import { validateApiToken, simpleRateLimit, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// 🛡️ Aplicar rate limiting a todas as rotas (100 requests por 15 min)
router.use(simpleRateLimit(100, 15 * 60 * 1000));

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
router.post('/request', validateApiToken, async (req: AuthenticatedRequest, res: Response) => {
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
    const hybridService = HybridOperationService.getInstance({
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
    
    console.log(`✅ Recarga solicitada: ${driverId} - R$ ${amount/100}`);
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
    
  } catch (error: any) {
    console.error('❌ Erro ao processar pedido de recarga:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: error.message
    });
  }
});

/**
 * GET /api/recharge/track/:id
 * Rastreia o resultado específico de uma recarga
 * 🔐 PROTEGIDO: Requer token de acesso
 */
router.get('/track/:id', validateApiToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    const hybridService = HybridOperationService.getInstance({
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
    
  } catch (error: any) {
    console.error('❌ Erro ao rastrear recarga:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao rastrear recarga',
      details: error.message
    });
  }
});

/**
 * GET /api/recharge/status
 * Verifica status das recargas e do sistema híbrido
 * 🔐 PROTEGIDO: Requer token de acesso
 */
router.get('/status', validateApiToken, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const hybridService = HybridOperationService.getInstance({
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
    
  } catch (error: any) {
    console.error('❌ Erro ao obter status:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao obter status',
      details: error.message
    });
  }
});

/**
 * POST /api/recharge/stop
 * Para o sistema híbrido
 */
router.post('/stop', async (req: Request, res: Response) => {
  try {
    const hybridService = HybridOperationService.getInstance({
      extractionBatchSize: 5,
      rechargePauseThreshold: 1,
      maxConcurrentRecharges: 3,
      stateCheckInterval: 10000,
      recoveryOnStart: true,
      autoFeedInterval: 30000,
      citiesRefreshInterval: 60000
    });
    
    await hybridService.stop();
    
    res.json({
      success: true,
      message: 'Sistema parado com sucesso'
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao parar sistema:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao parar sistema',
      details: error.message
    });
  }
});

/**
 * POST /api/recharge/start
 * Reinicia o sistema híbrido
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const hybridService = HybridOperationService.getInstance({
      extractionBatchSize: 5,
      rechargePauseThreshold: 1,
      maxConcurrentRecharges: 3,
      stateCheckInterval: 10000,
      recoveryOnStart: true,
      autoFeedInterval: 30000,
      citiesRefreshInterval: 60000
    });
    
    await hybridService.start();
    
    res.json({
      success: true,
      message: 'Sistema reiniciado com sucesso'
    });
    
  } catch (error: any) {
    console.error('❌ Erro ao reiniciar sistema:', error);
    
    res.status(500).json({
      success: false,
      error: 'Erro ao reiniciar sistema',
      details: error.message
    });
  }
});

export default router;
