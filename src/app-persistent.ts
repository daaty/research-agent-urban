import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import { getPersistentScraper, scrapeAllRidesDataPersistent } from './scraper/ridesPersistentScraper';
import { config } from './config';
import axios from 'axios';
import { DatabaseManager } from './services/databaseManager';
import { DataTransformer } from './services/dataTransformer';
import { AIAgentController } from './api/aiAgentController';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Instância do scraper persistente
const scraper = getPersistentScraper();

// 🗄️ Instâncias do banco de dados
const databaseManager = DatabaseManager.getInstance();
const dataTransformer = DataTransformer.getInstance();

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

// 🏥 Health check
app.get('/', (req: any, res: any) => {
  res.json({ 
    status: 'online', 
    message: '🚀 Scraper Persistente funcionando!',
    mode: 'persistent-browser',
    headlessMode: config.headlessMode,
    timestamp: new Date().toISOString() 
  });
});

// 📊 Status detalhado do sistema
app.get('/api/status', async (req: any, res: any) => {
  try {
    const sessionStatus = await scraper.getSessionStatus();
    
    res.json({
      status: 'online',
      mode: 'persistent',
      browser: {
        active: sessionStatus.browserActive,
        sessionValid: sessionStatus.sessionValid,
        message: sessionStatus.message
      },
      config: {
        headlessMode: config.headlessMode,
        n8nConfigured: config.n8nWebhookUrl && !config.n8nWebhookUrl.includes('seu-n8n.com')
      },
      availablePages: sessionStatus.availablePages,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 ENDPOINT PRINCIPAL - Scraping com sessão persistente
app.post('/api/rides/scrape', async (req: any, res: any) => {
  try {
    console.log('🚀 Iniciando scraping persistente...');
    
    const result = await scrapeAllRidesDataPersistent();
    
    // Processar resultado e enviar webhook se necessário
    await processScrapingResult(result, 'api');
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        mode: 'persistent',
        sessionInfo: result.sessionInfo,
        hasChanges: result.hasChanges,
        onlyNewData: result.onlyNewData,
        differences: result.differences,
        data: result.data, // Dados completos para referência
        summary: {
          totalTables: result.data.length,
          tablesWithData: result.data.filter(table => !table.isEmpty).length,
          tablesEmpty: result.data.filter(table => table.isEmpty).length,
          totalRecords: result.data.reduce((sum, table) => sum + table.rows.length, 0),
          newRecords: result.differences ? result.differences.reduce((sum: any, diff: any) => sum + diff.totalNewRecords, 0) : 0,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Erro no scraping persistente:', result.message);
      res.status(500).json({
        success: false,
        message: result.message,
        mode: 'persistent',
        sessionInfo: result.sessionInfo,
        data: []
      });
    }
    
  } catch (error: any) {
    console.error('❌ Erro crítico no scraping persistente:', error);
    res.status(500).json({
      success: false,
      message: `Erro crítico durante scraping persistente: ${error.message}`,
      mode: 'persistent',
      data: []
    });
  }
});

// 📄 Scraping de página específica
app.post('/api/rides/scrape-page', async (req: any, res: any) => {
  try {
    const { pageName } = req.body;
    
    if (!pageName) {
      return res.status(400).json({
        success: false,
        message: 'Nome da página é obrigatório',
        availablePages: scraper.getAvailablePages()
      });
    }
    
    console.log(`🎯 Scraping da página: ${pageName}`);
    const result = await scraper.scrapeSinglePage(pageName);
    
    res.json(result);
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro ao processar página: ${error.message}`,
      data: []
    });
  }
});

// 🔄 Forçar novo login
app.post('/api/auth/force-login', async (req: any, res: any) => {
  try {
    console.log('🔄 Forçando novo login...');
    const result = await scraper.forceNewLogin();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro ao forçar login: ${error.message}`
    });
  }
});

// 🧹 Limpeza completa
app.post('/api/system/cleanup', async (req: any, res: any) => {
  try {
    console.log('🧹 Executando limpeza completa...');
    const result = await scraper.cleanup();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante limpeza: ${error.message}`
    });
  }
});

// 📋 Listar páginas disponíveis
app.get('/api/rides/pages', (req: any, res: any) => {
  res.json({
    success: true,
    pages: scraper.getAvailablePages(),
    message: 'Lista de páginas disponíveis para scraping'
  });
});

// 🔄 Endpoint de teste rápido
app.get('/api/test', async (req: any, res: any) => {
  try {
    const status = await scraper.getSessionStatus();
    res.json({
      success: true,
      message: 'Teste executado com sucesso',
      browserStatus: status,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro no teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// 🗂️ ENDPOINT - Gerenciar cache de dados
app.get('/api/cache/stats', async (req: any, res: any) => {
  try {
    const stats = await scraper.getCacheStats();
    
    res.json({
      success: true,
      cache: stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao obter estatísticas do cache:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🗂️ ENDPOINT - Limpar cache
app.post('/api/cache/clear', async (req: any, res: any) => {
  try {
    scraper.clearCache();
    
    res.json({
      success: true,
      message: 'Cache limpo com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao limpar cache:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🧪 ENDPOINT - Simular webhook (somente dados novos)
app.post('/api/rides/simulate-webhook', async (req: any, res: any) => {
  try {
    console.log('🧪 Simulando webhook com dados novos...');
    
    const result = await scrapeAllRidesDataPersistent();
    
    if (result.success && result.hasChanges && result.differences) {
      const webhookPayload = {
        timestamp: new Date().toISOString(),
        source: 'rides-dashboard-persistent',
        mode: 'persistent-browser',
        sessionInfo: result.sessionInfo,
        onlyNewData: true,
        differences: result.differences,
        summary: {
          totalNewRecords: result.differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0),
          totalUpdatedRecords: result.differences.reduce((sum, diff) => sum + diff.updatedRecords.length, 0),
          totalRemovedRecords: result.differences.reduce((sum, diff) => sum + diff.removedRecords.length, 0),
          tablesWithChanges: result.differences.length
        }
      };
      
      res.json({
        success: true,
        message: 'Webhook simulado com dados novos',
        payload: webhookPayload,
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        message: 'Nenhuma mudança detectada - webhook não seria enviado',
        hasChanges: result.hasChanges,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('❌ Erro ao simular webhook:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🔐 ENDPOINT - Verificar status de login com captcha
app.get('/api/rides/login-status', async (req: any, res: any) => {
  try {
    const sessionStatus = await scraper.getSessionStatus();
    
    res.json({
      success: true,
      status: sessionStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao verificar status de login:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🔐 ENDPOINT - Aguardar login manual (para captcha)
app.post('/api/rides/wait-manual-login', async (req: any, res: any) => {
  try {
    const { timeout = 300000 } = req.body; // 5 minutos por padrão
    
    console.log('⏳ Aguardando login manual...');
    
    const result = await scraper.waitForManualLogin(timeout);
    
    if (result) {
      res.json({
        success: true,
        message: 'Login manual detectado com sucesso!',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(408).json({
        success: false,
        message: 'Timeout aguardando login manual',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('❌ Erro ao aguardar login manual:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🔐 ENDPOINT - Abrir navegador para login manual
app.post('/api/rides/open-browser-login', async (req: any, res: any) => {
  try {
    console.log('🌐 Abrindo navegador para login manual...');
    
    // Garantir que o browser está inicializado
    await scraper.initializeBrowser();
    
    // Navegar para página de login
    const page = scraper.getPage();
    if (page) {
      const loginUrl = process.env.RIDES_LOGIN_URL || 'https://rides.ec2dashboard.com/#/page/login';
      await page.goto(loginUrl, {
        waitUntil: 'domcontentloaded'
      });
    }
    
    const sessionStatus = await scraper.getSessionStatus();
    
    res.json({
      success: true,
      message: 'Navegador aberto na página de login',
      status: sessionStatus,
      instructions: [
        '1. Faça login manualmente no navegador que foi aberto',
        '2. Resolva o captcha se necessário',
        '3. Aguarde até estar logado no dashboard',
        '4. Use o endpoint /api/rides/wait-manual-login para aguardar confirmação',
        '5. Ou use /api/rides/login-status para verificar o status'
      ],
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao abrir navegador:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

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
app.listen(PORT, async () => {
  console.log('🎉' + '='.repeat(70));
  console.log(`🚀 SERVIDOR PERSISTENTE FUNCIONANDO NA PORTA ${PORT}`);
  console.log('🎉' + '='.repeat(70));
  console.log(`📋 ENDPOINTS DISPONÍVEIS:`);
  console.log(`- GET  /                        (status geral)`);
  console.log(`- GET  /api/status              (status detalhado)`);
  console.log(`- POST /api/rides/scrape        (🎯 SCRAPER PRINCIPAL)`);
  console.log(`- POST /api/rides/scrape-page   (scraping página específica)`);
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
  console.log(`🔄  Auto-execução: ATIVANDO EM 30 SEGUNDOS...`);
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
  
  // 🚀 AUTO-INICIALIZAÇÃO
  console.log('⏳ Aguardando 30 segundos para auto-inicialização...');
  setTimeout(async () => {
    try {
      console.log('🚀 Iniciando auto-execução do scraper...');
      
      // Verificar se credenciais estão configuradas
      if (!process.env.RIDES_USERNAME || process.env.RIDES_USERNAME.includes('seu_email') || 
          !process.env.RIDES_PASSWORD || process.env.RIDES_PASSWORD.includes('sua_senha')) {
        console.log('⚠️ Credenciais não configuradas - aguardando configuração manual');
        return;
      }
      
      // Executar primeiro scraping
      const result = await scrapeAllRidesDataPersistent();
      
      if (result.success) {
        console.log('✅ Auto-execução inicial concluída com sucesso!');
        
        // ⭐ PROCESSAR WEBHOOK TAMBÉM NA PRIMEIRA EXECUÇÃO!
        await processScrapingResult(result, 'initial-execution');
        
        // 🔄 Programar execução periódica a cada 15 minutos
        const intervalMinutes = parseInt(process.env.SCRAPE_INTERVAL || '15');
        console.log(`🔄 Programando execução automática a cada ${intervalMinutes} minutos...`);
        
        setInterval(async () => {
          try {
            console.log('🔄 Executando scraping automático...');
            const autoResult = await scrapeAllRidesDataPersistent();
            
            // ⭐ AGORA PROCESSA WEBHOOK TAMBÉM NO SCHEDULER!
            await processScrapingResult(autoResult, 'scheduler');
            
            if (autoResult.success) {
              console.log('✅ Scraping automático concluído');
              if (autoResult.hasChanges) {
                console.log(`📊 ${autoResult.differences?.reduce((sum: any, diff: any) => sum + diff.totalNewRecords, 0) || 0} novos registros encontrados`);
              } else {
                console.log('ℹ️ Nenhuma mudança detectada');
              }
            } else {
              console.log('❌ Erro no scraping automático:', autoResult.message);
            }
          } catch (error) {
            console.error('❌ Erro na execução automática:', error);
          }
        }, intervalMinutes * 60 * 1000);
        
      } else {
        console.log('❌ Falha na auto-execução inicial:', result.message);
        console.log('💡 Use o VNC para resolver problemas manualmente');
      }
      
    } catch (error) {
      console.error('❌ Erro na auto-inicialização:', error);
      console.log('💡 Use o endpoint /api/rides/scrape para execução manual');
    }
  }, 30000);
});

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

export default app;
