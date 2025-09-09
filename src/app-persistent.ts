import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express, { Request, Response } from 'express';
import { logger, LogLevel } from './utils/logger';

// 🔧 Configurar logging
logger.setConsoleLevel(LogLevel.INFO); // Apenas INFO, WARN, ERROR no console
logger.setFileLevel(LogLevel.DEBUG);   // Tudo nos arquivos
logger.info('STARTUP', '🚀 Iniciando Research Agent Urban AI - Sistema Híbrido');

// [REMOVIDO] Imports de scrapers persistentes e MonitoringService
import { config } from './config';
import axios from 'axios';
import { DatabaseManager } from './services/databaseManager';
import { DataTransformer } from './services/dataTransformer';
import { AIAgentController } from './api/aiAgentController';
import apiRoutes from './api';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔄 API Routes - Controle de Recargas e Sistema Híbrido
app.use('/api', apiRoutes);

// [REMOVIDO] Instância do scraper persistente

// 🗄️ Instâncias do banco de dados
const databaseManager = DatabaseManager.getInstance();
const dataTransformer = DataTransformer.getInstance();

// [REMOVIDO] MonitoringService

// 🤖 Instância do AI Agent Controller
const aiController = new AIAgentController();

// 🔄 Função para processar resultado e enviar webhook
async function processScrapingResult(result: any, source: string = 'manual') {
  if (result.success) {
    console.log('✅ Scraping concluído com sucesso!');
    
    // 🗄️ NOVO: Armazenar dados no PostgreSQL
    try {
      if (databaseManager.isConnectedToDatabase()) {
        
        if (result.hasChanges && result.differences && result.differences.length > 0) {
          // Armazenar dados diferenciais (apenas mudanças)
          console.log('💾 Salvando dados novos no PostgreSQL...');
          await dataTransformer.processDifferentialData(result.differences, source);
          console.log('✅ Dados diferenciais salvos no PostgreSQL!');
        } else if (source === 'initial-execution') {
          // ✅ Exceção: Na primeira execução sempre salvar dados completos
          console.log('💾 Primeira execução - salvando dados completos no PostgreSQL...');
          await dataTransformer.processFullScrapingData(result.data, source);
          console.log('✅ Dados iniciais salvos no PostgreSQL!');
        } else {
          // ✅ NÃO salvar se não há mudanças - evitar duplicação
          console.log('ℹ️ Nenhuma mudança detectada - dados não salvos no PostgreSQL');
        }
      } else {
        console.log('⚠️ PostgreSQL não conectado - dados não salvos no banco');
      }
    } catch (dbError) {
      console.error('❌ Erro ao salvar no PostgreSQL:', dbError);
      // Não interromper o fluxo se o banco falhar
    }
    
    // ⭐ LÓGICA: Enviar apenas dados novos para n8n
    if (config.n8nWebhookUrl && !config.n8nWebhookUrl.includes('seu-n8n.com')) {
      if (result.hasChanges && result.differences && result.differences.length > 0) {
        try {
          console.log('📤 Enviando APENAS dados novos para n8n...');
          
          // Criar payload com apenas dados novos
          const webhookPayload = {
            timestamp: new Date().toISOString(),
            source: `rides-dashboard-persistent-${source}`,
            mode: 'persistent-browser',
            sessionInfo: result.sessionInfo,
            onlyNewData: true,
            differences: result.differences,
            summary: {
              totalNewRecords: result.differences.reduce((sum: number, diff: any) => sum + diff.totalNewRecords, 0),
              totalUpdatedRecords: result.differences.reduce((sum: number, diff: any) => sum + diff.updatedRecords.length, 0),
              totalRemovedRecords: result.differences.reduce((sum: number, diff: any) => sum + diff.removedRecords.length, 0),
              tablesWithChanges: result.differences.length
            }
          };
          
          await axios.post(config.n8nWebhookUrl, webhookPayload);
          
          const newRecords = webhookPayload.summary.totalNewRecords;
          console.log(`✅ ${newRecords} novos registros enviados para n8n!`);
          
        } catch (error) {
          console.error('❌ Erro ao enviar para n8n:', error);
        }
      } else {
        console.log('ℹ️ Nenhuma mudança detectada - webhook não enviado');
      }
    } else {
      console.log('⚠️ Webhook N8N não configurado ou URL inválida');
    }
  }
  
  return result;
}

// 🏥 Health check (ajustado para híbrido)
app.get('/', (req: any, res: any) => {
  res.json({ 
    status: 'online', 
    message: '🚀 Sistema Híbrido funcionando!',
    mode: 'hybrid',
    headlessMode: config.headlessMode,
    timestamp: new Date().toISOString() 
  });
});

// 📊 Status detalhado do sistema (ajustado para híbrido)
app.get('/api/status', (req: any, res: any) => {
  res.json({
    status: 'online',
    mode: 'hybrid',
    headlessMode: config.headlessMode,
    n8nConfigured: config.n8nWebhookUrl && !config.n8nWebhookUrl.includes('seu-n8n.com'),
    timestamp: new Date().toISOString()
  });
});

// [REMOVIDO] Endpoint de scraping de página específica (persistente)

// [REMOVIDO] Endpoint de forçar novo login (persistente)

// [REMOVIDO] Endpoint de limpeza completa (persistente)

// [REMOVIDO] Endpoint de listar páginas disponíveis (persistente)

// [REMOVIDO] Endpoint de teste rápido (persistente)

// � ================== ENDPOINTS DE DRIVERS ==================

// [REMOVIDO] Endpoint de scraping de drivers (persistente)

// [REMOVIDO] Endpoint de teste de Active Drivers (persistente)

// [REMOVIDO] Endpoint de teste de Deactive Drivers (persistente)

// [REMOVIDO] Endpoint de teste de Drivers Enrollment (persistente)

// [REMOVIDO] Endpoint de teste de Leaderboard (persistente)

// [REMOVIDO] Endpoint de teste de Driver Performance (persistente)

// [REMOVIDO] Endpoint de listar páginas de drivers disponíveis (persistente)

// [REMOVIDO] Endpoint de stats do cache (persistente)

// [REMOVIDO] Endpoint de limpar cache (persistente)

// [REMOVIDO] Endpoint de simulação de webhook (persistente)

// [REMOVIDO] Endpoint de status de login (persistente)

// [REMOVIDO] Endpoint de aguardar login manual (persistente)

// [REMOVIDO] Endpoint de abrir navegador para login manual (persistente)

// 🗄️ ENDPOINTS DO BANCO DE DADOS

// Estatísticas do PostgreSQL
app.get('/api/database/stats', async (req: any, res: any) => {
  try {
    if (!databaseManager.isConnectedToDatabase()) {
      return res.status(503).json({
        success: false,
        message: 'Banco de dados não conectado'
      });
    }

    const stats = await dataTransformer.getDatabaseStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao obter estatísticas do banco:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Dados recentes (últimas 24h)
app.get('/api/database/recent', async (req: any, res: any) => {
  try {
    if (!databaseManager.isConnectedToDatabase()) {
      return res.status(503).json({
        success: false,
        message: 'Banco de dados não conectado'
      });
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    
    const rides = await databaseManager.getRidesByDateRange(startDate, endDate);
    
    res.json({
      success: true,
      data: rides,
      count: rides.length,
      period: 'last_24_hours',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar dados recentes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Teste de conexão com PostgreSQL
app.get('/api/database/test-connection', async (req: any, res: any) => {
  try {
    const isConnected = databaseManager.isConnectedToDatabase();
    
    if (!isConnected) {
      // Tentar reconectar
      await databaseManager.initialize();
    }
    
    const stats = await databaseManager.getDatabaseStats();
    
    res.json({
      success: true,
      isConnected: true,
      stats,
      message: 'Conexão com PostgreSQL funcionando',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro na conexão com PostgreSQL:', error);
    res.status(500).json({
      success: false,
      isConnected: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Dados para dashboard (agregados)
app.get('/api/database/dashboard', async (req: any, res: any) => {
  try {
    if (!databaseManager.isConnectedToDatabase()) {
      return res.status(503).json({
        success: false,
        message: 'Banco de dados não conectado'
      });
    }

    const stats = await databaseManager.getDatabaseStats();
    
    // Buscar dados dos últimos 7 dias
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentRides = await databaseManager.getRidesByDateRange(startDate, endDate);
    
    // Agrupar dados por tabela e dia
    const dataByTable = recentRides.reduce((acc: any, ride: any) => {
      const tableName = ride.table_name;
      const day = ride.scraped_at.toISOString().split('T')[0];
      
      if (!acc[tableName]) {
        acc[tableName] = {};
      }
      
      if (!acc[tableName][day]) {
        acc[tableName][day] = 0;
      }
      
      // Contar registros (assumindo que ride_data.rows existe)
      const rideData = typeof ride.ride_data === 'string' 
        ? JSON.parse(ride.ride_data) 
        : ride.ride_data;
        
      acc[tableName][day] += rideData.rows?.length || 0;
      
      return acc;
    }, {});
    
    res.json({
      success: true,
      dashboardData: {
        overview: stats,
        last7Days: dataByTable,
        recentRides: recentRides.slice(0, 10), // Últimos 10 registros
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao obter dados do dashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Buscar dados por período específico
app.post('/api/database/query', async (req: any, res: any) => {
  try {
    if (!databaseManager.isConnectedToDatabase()) {
      return res.status(503).json({
        success: false,
        message: 'Banco de dados não conectado'
      });
    }

    const { startDate, endDate, tableName } = req.body;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate e endDate são obrigatórios'
      });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Datas inválidas'
      });
    }

    const rides = await databaseManager.getRidesByDateRange(
      start, 
      end, 
      tableName
    );
    
    res.json({
      success: true,
      data: rides,
      count: rides.length,
      period: { startDate, endDate, tableName },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar dados por período:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 Endpoint para dados pessoais de motoristas
app.get('/api/database/driver-personal/:driverId?', async (req: any, res: any) => {
  try {
    const { driverId } = req.params;
    
    if (driverId) {
      // Buscar dados de um motorista específico
      const driverData = await databaseManager.getDriverPersonalDetails(driverId);
      
      if (driverData) {
        res.json({
          success: true,
          driver: driverData,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(404).json({
          success: false,
          message: `Dados pessoais do motorista ${driverId} não encontrados`,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      // Listar todos os drivers com dados pessoais
      const allDrivers = await databaseManager.getAllDriversPersonalDetails();
      
      res.json({
        success: true,
        drivers: allDrivers,
        count: allDrivers.length,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('❌ Erro ao buscar dados pessoais de motoristas:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🤖 ============= ROTAS DO AI AGENT =============

// Inicializar AI Agent
app.post('/api/ai/initialize', async (req: any, res: any) => {
  await aiController.initializeAI(req, res);
});

// Executar comando em linguagem natural
app.post('/api/ai/execute', async (req: any, res: any) => {
  await aiController.executeCommand(req, res);
});

// Navegar para URL específica
app.post('/api/ai/navigate', async (req: any, res: any) => {
  await aiController.navigateToUrl(req, res);
});

// Extrair dados da página atual
app.post('/api/ai/extract', async (req: any, res: any) => {
  await aiController.extractData(req, res);
});

// Analisar página atual
app.post('/api/ai/analyze', async (req: any, res: any) => {
  await aiController.analyzePage(req, res);
});

// Automação complexa (workflows)
app.post('/api/ai/workflow', async (req: any, res: any) => {
  await aiController.complexAutomation(req, res);
});

// Status do AI Agent
app.get('/api/ai/status', async (req: any, res: any) => {
  await aiController.getStatus(req, res);
});

// Limpar histórico do AI
app.post('/api/ai/clear', async (req: any, res: any) => {
  await aiController.clearHistory(req, res);
});

// 🤖 ===============================================

// Inicializar servidor
// 🚀 NOVOS ENDPOINTS PARA SISTEMA HÍBRIDO

import { HybridOperationService } from './services/hybridOperationServiceV2';

// 🔄 Instância do Sistema Híbrido
const hybridService = HybridOperationService.getInstance({
  extractionBatchSize: 1, // Alterado para 1 - processar apenas uma extração por ciclo
  rechargePauseThreshold: 1,
  maxConcurrentRecharges: 3,
  stateCheckInterval: 8000, // Aumentado de 5000 para 8000ms (8 segundos entre ciclos)
  recoveryOnStart: true,
  autoFeedInterval: 60000,
  citiesRefreshInterval: 300000
});

// 🚀 Iniciar Sistema Híbrido

app.post('/api/hybrid/start', async (req: Request, res: Response) => {
  try {
    console.log('🚀 Iniciando Sistema Híbrido via API...');
    await hybridService.start();
    res.json({
      success: true,
      message: 'Sistema híbrido iniciado com sucesso',
      status: hybridService.getStats(),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao iniciar sistema híbrido:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});


// 🪟 Organizar Janelas em Split-Screen (Endpoint Manual)


// ⏹️ Parar Sistema Híbrido
app.post('/api/hybrid/stop', async (req: Request, res: Response) => {
  try {
    console.log('⏹️ Parando Sistema Híbrido via API...');
    await hybridService.stop();
    res.json({
      success: true,
      message: 'Sistema híbrido parado com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao parar sistema híbrido:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 Status do Sistema Híbrido
app.get('/api/hybrid/status', (req: Request, res: Response) => {
  try {
    const status = hybridService.getStats();
    
    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🔋 Adicionar Solicitação de Recarga
app.post('/api/hybrid/recharge', (req: Request, res: Response) => {
  try {
    const { driverId, amount, priority = 'normal' } = req.body;
    if (!driverId || !amount) {
      return res.status(400).json({
        success: false,
        error: 'driverId e amount são obrigatórios',
        timestamp: new Date().toISOString()
      });
    }
    hybridService.addRechargeToQueue(driverId, amount, priority === 'urgent');
    res.json({
      success: true,
      message: `Recarga adicionada à fila: ${driverId} -> R$ ${amount}`,
      driverId,
      amount,
      priority,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao adicionar recarga:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 📋 Adicionar IDs para Extração
app.post('/api/hybrid/add-drivers', (req: Request, res: Response) => {
  try {
    const { driverIds, priority = 'normal' } = req.body;
    
    if (!driverIds || !Array.isArray(driverIds)) {
      return res.status(400).json({
        success: false,
        error: 'driverIds deve ser um array',
        timestamp: new Date().toISOString()
      });
    }

    // Adicionar cada ID individualmente 
    driverIds.forEach((driverId: string) => {
      hybridService.addDriverToQueue(driverId, priority);
    });
    
    res.json({
      success: true,
      message: `${driverIds.length} IDs adicionados à fila de extração`,
      driverIds,
      priority,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ⏸️ Pausar Sistema Híbrido (Nota: Funcionalidade controlada automaticamente)
app.post('/api/hybrid/pause', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Sistema híbrido controla pausas automaticamente durante recargas',
    note: 'Use /api/hybrid/stop para parar completamente',
    timestamp: new Date().toISOString()
  });
});

// ▶️ Resumir Sistema Híbrido (Nota: Funcionalidade controlada automaticamente)
app.post('/api/hybrid/resume', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Sistema híbrido resume automaticamente após recargas',
    note: 'Use /api/hybrid/start para iniciar se parado',
    timestamp: new Date().toISOString()
  });
});

// 🚨 Parada de Emergência (Use o método stop padrão)
app.post('/api/hybrid/emergency-stop', async (req: Request, res: Response) => {
  try {
    console.log('🚨 PARADA DE EMERGÊNCIA ATIVADA VIA API - Usando stop()');
    await hybridService.stop();
    
    res.json({
      success: true,
      message: 'Sistema híbrido parado (método padrão usado)',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 📊 Consultar Dados Pessoais Salvos
app.get('/api/personal-data/drivers', async (req: Request, res: Response) => {
  try {
    const drivers = await databaseManager.getAllDriversPersonalDetails();
    
    res.json({
      success: true,
      data: drivers,
      count: drivers.length,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 📈 Estatísticas dos Dados Pessoais
app.get('/api/personal-data/stats', async (req: Request, res: Response) => {
  try {
    // Usar o método existente
    const allDrivers = await databaseManager.getAllDriversPersonalDetails();
    
    // Calcular estatísticas manualmente
    const stats = {
      total_drivers: allDrivers.length,
      by_city: allDrivers.reduce((acc: any, driver: any) => {
        const city = driver.city || 'Unknown';
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {}),
      extracted_today: allDrivers.filter((driver: any) => {
        const today = new Date().toISOString().split('T')[0];
        return driver.extracted_at?.startsWith(today);
      }).length
    };
    
    res.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auto-inicialização do Sistema Híbrido
app.listen(PORT, async () => {
  console.log('🎉' + '='.repeat(70));
  console.log(`🚀 SISTEMA HÍBRIDO FUNCIONANDO NA PORTA ${PORT}`);
  console.log('🎉' + '='.repeat(70));
  console.log(`📋 ENDPOINTS DISPONÍVEIS:`);
  console.log(`- GET  /                        (status geral)`);
  console.log(`- GET  /api/status              (status detalhado)`);
  console.log(`- POST /api/hybrid/start        (🎯 SISTEMA HÍBRIDO)`);
  console.log(`- POST /api/hybrid/stop         (parar híbrido)`);
  console.log(`- GET  /api/hybrid/status       (status híbrido)`);
  console.log(`- POST /api/ai-agent/query      (consultas AI)`);
  console.log(`🎉 SISTEMA HÍBRIDO CONFIGURADO PARA INICIALIZAÇÃO AUTOMÁTICA`);
  console.log(`- POST /api/auth/force-login    (forçar novo login)`);
  console.log(`- POST /api/system/cleanup      (limpeza completa)`);
  console.log(`- GET  /api/rides/pages         (listar páginas)`);
  console.log(`- POST /api/scheduler/start     (execução automática)`);
  console.log(`- POST /api/scheduler/stop      (parar execução automática)`);
  console.log(`- GET  /api/test                (teste rápido)`);
  console.log('🤖' + '='.repeat(70));
  console.log('🤖 NOVOS ENDPOINTS AI AGENT:');
  console.log(`- POST /api/ai/initialize       (inicializar AI Agent)`);
  console.log(`- POST /api/ai/execute          (comandos em linguagem natural)`);
  console.log(`- POST /api/ai/navigate         (navegar com AI)`);
  console.log(`- POST /api/ai/extract          (extrair dados via AI)`);
  console.log(`- POST /api/ai/analyze          (analisar página atual)`);
  console.log(`- POST /api/ai/workflow         (automação complexa)`);
  console.log(`- GET  /api/ai/status           (status do AI Agent)`);
  console.log(`- POST /api/ai/clear            (limpar histórico AI)`);
  console.log('🤖' + '='.repeat(70));
  console.log('🗄️  NOVOS ENDPOINTS POSTGRESQL:');
  console.log(`- GET  /api/database/stats           (estatísticas do banco)`);
  console.log(`- GET  /api/database/recent          (dados últimas 24h)`);
  console.log(`- GET  /api/database/test-connection (testar conexão)`);
  console.log(`- GET  /api/database/dashboard       (dados para dashboard)`);
  console.log(`- POST /api/database/query           (buscar por período)`);
  console.log('🎉' + '='.repeat(70));
  console.log(`🖥️  Modo: BROWSER PERSISTENTE`);
  console.log(`🖥️  Visual: ${!config.headlessMode ? 'HABILITADO ✅' : 'Desabilitado'}`);
  
  // 🔄 Verificar se scraping automático está habilitado
  const isAutoScrapingEnabled = process.env.ENABLE_AUTO_SCRAPING === 'true';
  console.log(`🔄  Auto-execução: ${isAutoScrapingEnabled ? 'ATIVANDO EM 30 SEGUNDOS...' : '⚠️ DESABILITADO'}`);
  
  console.log('🎉' + '='.repeat(70));

  // 🗄️ INICIALIZAR POSTGRESQL
  console.log('💾 Inicializando conexão com PostgreSQL...');
  try {
    await databaseManager.initialize();
    console.log('✅ PostgreSQL conectado e pronto!');
  } catch (error) {
    console.error('❌ Erro ao conectar PostgreSQL:', error);
    console.log('⚠️ Sistema continuará funcionando sem banco de dados');
  }
  
  // 🚀 AUTO-INICIALIZAÇÃO DO SISTEMA HÍBRIDO (sempre ativo)
  logger.info('AUTO', 'Auto-start configurado - HybridService: SIM (sempre ativo)');
  logger.info('AUTO', 'Aguardando 10 segundos para inicialização...');
  
  setTimeout(async () => {
    try {
      logger.info('AUTO', 'Iniciando Sistema Híbrido...');

      // Verificar se credenciais estão configuradas
      if (!process.env.RIDES_USERNAME || process.env.RIDES_USERNAME.includes('seu_email') ||
          !process.env.RIDES_PASSWORD || process.env.RIDES_PASSWORD.includes('sua_senha')) {
        logger.warn('AUTO', 'Credenciais não configuradas - aguardando configuração manual');
        return;
      }

      // 🚀 Iniciar Sistema Híbrido automaticamente
      logger.info('HYBRID', 'Iniciando Sistema Híbrido...');
      hybridService.start().then(() => {
        logger.success('HYBRID', 'Sistema Híbrido iniciado com sucesso');
      }).catch(err => {
        logger.error('HYBRID', 'Erro ao iniciar Sistema Híbrido', err);
      });
        
    } catch (error) {
      logger.error('AUTO', 'Erro na auto-inicialização', error);
      logger.info('AUTO', 'Use os endpoints /api/hybrid/start para execução manual');
    }
  }, 10000);

  // Limpeza na saída do processo
  process.on('SIGINT', async () => {
    console.log('\n🔄 Recebido sinal de interrupção...');
    
    console.log('🧹 Executando limpeza final...');
    try {
      console.log('✅ Limpeza concluída');
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
    }
    
    console.log('👋 Servidor encerrado');
    process.exit(0);
  });
});

export default app;
