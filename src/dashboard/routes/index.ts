/**
 * 🛣️ DASHBOARD API ROUTES
 * 
 * Rotas da API do dashboard integrado
 */

import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';

const router = Router();
const dashboardController = new DashboardController();

// 📊 Dashboard Status Routes
router.get('/dashboard/status', (req, res) => 
  dashboardController.getDashboardStatus(req, res)
);

// 🎯 Scraper Management Routes
router.get('/scrapers', (req, res) => 
  dashboardController.getScrapers(req, res)
);

router.get('/scrapers/:id', (req, res) => 
  dashboardController.getScraper(req, res)
);

router.post('/scrapers/start', (req, res) => 
  dashboardController.startScraper(req, res)
);

router.post('/scrapers/stop', (req, res) => 
  dashboardController.stopScraper(req, res)
);

router.post('/scrapers/run-once', (req, res) => 
  dashboardController.runOnce(req, res)
);

router.post('/scrapers/heartbeat', (req, res) => 
  dashboardController.updateHeartbeat(req, res)
);

// 📊 Metrics Routes
router.get('/metrics', (req, res) => 
  dashboardController.getMetrics(req, res)
);

// 🔧 System Management Routes
router.post('/system/reset-circuit-breaker', (req, res) => 
  dashboardController.resetCircuitBreaker(req, res)
);

router.post('/system/process-dlq', (req, res) => 
  dashboardController.processDLQ(req, res)
);

router.post('/system/clear-dlq', (req, res) => 
  dashboardController.clearDLQ(req, res)
);

// 🏥 Health Check
router.get('/health', (req, res) => 
  dashboardController.healthCheck(req, res)
);

// 🔧 Debug Routes
router.post('/debug/reset-singleton', (req, res) => 
  dashboardController.resetSingleton(req, res)
);

export { router as dashboardRoutes };
