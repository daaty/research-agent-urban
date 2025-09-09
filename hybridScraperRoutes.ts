/**
 * 🛣️ HYBRID SCRAPER ROUTES
 * 
 * Rotas específicas para o hybrid scraper
 * Integradas com o sistema de dashboard multi-scraper
 */

import { Router } from 'express';
import { HybridScraperController } from './hybridScraperController';

const router = Router();
const hybridController = new HybridScraperController();

// 🎯 Extração de dados
router.post('/extract', (req, res) => hybridController.extractDriversData(req, res));

// 💰 Processamento de recarga
router.post('/recharge', (req, res) => hybridController.processRecharge(req, res));

// 🆔 Gerenciamento de IDs de motoristas
router.get('/driver-ids', (req, res) => hybridController.getDriverIds(req, res));
router.post('/refresh-cache', (req, res) => hybridController.refreshDriverIdsCache(req, res));

// 📊 Status e monitoramento
router.get('/status', (req, res) => hybridController.getHybridStatus(req, res));

// 🎮 Operações em lote
router.post('/batch-operation', (req, res) => hybridController.batchOperation(req, res));

export { router as hybridScraperRoutes };
