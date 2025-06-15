import express from 'express';
import dotenv from 'dotenv';
import { MonitoringService } from './services/monitoringService';

// Carregar variáveis de ambiente
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Instanciar serviço de monitoramento
const monitoring = new MonitoringService();

// Rotas
app.get('/', (req, res) => {
  res.json({
    message: 'Rides Monitoring Service',
    status: 'running',
    timestamp: new Date().toISOString(),
    config: {
      headlessMode: process.env.HEADLESS_MODE === 'true',
      webhookConfigured: !!process.env.N8N_WEBHOOK_URL,
      environment: process.env.NODE_ENV || 'development'
    }
  });
});

// Endpoint para executar scraping único
app.post('/api/scrape-now', async (req, res) => {
  try {
    console.log('🚀 Scraping manual solicitado via API');
    await monitoring.runOnce();
    res.json({
      success: true,
      message: 'Scraping executado com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no scraping manual:', error);
    res.status(500).json({
      success: false,
      message: 'Erro ao executar scraping',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Endpoint para parar monitoramento
app.post('/api/stop-monitoring', (req, res) => {
  try {
    monitoring.stopMonitoring();
    res.json({
      success: true,
      message: 'Monitoramento parado',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Erro ao parar monitoramento',
      error: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Iniciar servidor e monitoramento
const server = app.listen(port, () => {
  console.log('🎯 ===================================');
  console.log('🚀 RIDES MONITORING SERVICE INICIADO');
  console.log('🎯 ===================================');
  console.log(`📡 Servidor rodando na porta ${port}`);
  console.log(`🌐 http://localhost:${port}`);
  console.log(`⏰ Monitoramento: A cada 2,5 minutos`);
  console.log(`👀 Modo headless: ${process.env.HEADLESS_MODE}`);
  console.log(`🔗 Webhook n8n: ${process.env.N8N_WEBHOOK_URL}`);
  console.log('🎯 ===================================');
  
  // Iniciar monitoramento automático
  monitoring.startMonitoring();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, parando servidor...');
  monitoring.stopMonitoring();
  server.close(() => {
    console.log('✅ Servidor fechado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, parando servidor...');
  monitoring.stopMonitoring();
  server.close(() => {
    console.log('✅ Servidor fechado');
    process.exit(0);
  });
});

export default app;
