/**
 * 🚀 HYBRID SCRAPER STANDALONE API
 * 
 * Servidor Express standalone para o hybrid scraper
 * Pode rodar independentemente ou ser integrado ao sistema multi-scraper
 */

import express from 'express';
import { hybridScraperRoutes } from './hybridScraperRoutes';
import { getHybridScraperIntegration, destroyHybridScraperIntegration } from './hybridScraperIntegration';

const app = express();
const PORT = process.env.HYBRID_PORT || 3001;

// 🛡️ Basic CORS and security middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 📝 Parsing JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 📊 Logging básico
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// 🛣️ Rotas do hybrid scraper
app.use('/api/hybrid', hybridScraperRoutes);

// 🏠 Health check
app.get('/health', (req, res) => {
  const integration = getHybridScraperIntegration();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    scraper: {
      id: integration.getScraperId(),
      name: integration.getScraperName(),
      metrics: integration.getMetrics()
    },
    environment: {
      nodeEnv: process.env.NODE_ENV || 'development',
      ridesUsername: process.env.RIDES_USERNAME,
      dashboardUrl: process.env.DASHBOARD_URL,
      headlessMode: process.env.HEADLESS_MODE
    }
  });
});

// 📋 Lista de endpoints disponíveis
app.get('/api', (req, res) => {
  res.json({
    name: 'Hybrid Scraper API',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      status: 'GET /api/hybrid/status',
      extract: 'POST /api/hybrid/extract',
      recharge: 'POST /api/hybrid/recharge',
      driverIds: 'GET /api/hybrid/driver-ids',
      refreshCache: 'POST /api/hybrid/refresh-cache',
      batchOperation: 'POST /api/hybrid/batch-operation'
    },
    documentation: {
      extract: {
        method: 'POST',
        body: { driverIds: ['id1', 'id2'], useCache: true },
        description: 'Extract driver data for specified IDs'
      },
      recharge: {
        method: 'POST',
        body: { driverId: 'string', amount: 'number' },
        description: 'Process credit recharge for a driver'
      },
      batchOperation: {
        method: 'POST',
        body: { 
          operation: 'extract|recharge|both',
          driverIds: ['id1', 'id2'],
          rechargeAmount: 100,
          batchSize: 10
        },
        description: 'Perform batch operations on multiple drivers'
      }
    }
  });
});

// 🚫 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: '/api',
    timestamp: new Date().toISOString()
  });
});

// ❌ Error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('❌ [HybridAPI] Unhandled error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: error.message,
    timestamp: new Date().toISOString()
  });
});

// 🚀 Start server function
export function startHybridScraperAPI(): Promise<void> {
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 [HybridAPI] Server running on port ${PORT}`);
      console.log(`📊 [HybridAPI] Health check: http://localhost:${PORT}/health`);
      console.log(`📋 [HybridAPI] API docs: http://localhost:${PORT}/api`);
      
      // Initialize hybrid scraper integration
      const integration = getHybridScraperIntegration();
      console.log(`🔗 [HybridAPI] Scraper integration: ${integration.getScraperId()}`);
      
      resolve();
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      console.log('🛑 [HybridAPI] Received SIGTERM, shutting down gracefully...');
      destroyHybridScraperIntegration();
      server.close(() => {
        console.log('✅ [HybridAPI] Server closed');
        process.exit(0);
      });
    });

    process.on('SIGINT', () => {
      console.log('🛑 [HybridAPI] Received SIGINT, shutting down gracefully...');
      destroyHybridScraperIntegration();
      server.close(() => {
        console.log('✅ [HybridAPI] Server closed');
        process.exit(0);
      });
    });
  });
}

// 🎯 Run standalone if called directly
if (require.main === module) {
  console.log('🚀 [HybridAPI] Starting Hybrid Scraper API in standalone mode...');
  startHybridScraperAPI().catch(error => {
    console.error('❌ [HybridAPI] Failed to start server:', error);
    process.exit(1);
  });
}

export default app;
