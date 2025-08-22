import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import express, { Request, Response } from 'express';
import { logger, LogLevel } from './utils/logger';

// 🔧 Configurar logging
logger.setConsoleLevel(LogLevel.INFO); // Apenas INFO, WARN, ERROR no console
logger.setFileLevel(LogLevel.DEBUG);   // Tudo nos arquivos
logger.info('STARTUP', '🚀 Iniciando Research Agent Urban AI - Sistema Híbrido');

import { getPersistentScraper, scrapeAllRidesDataPersistent } from './scraper/ridesPersistentScraper';
import { scrapeAllDriversDataPersistent } from './scraper/driversPersistentScraper';
import { MonitoringService } from './services/monitoringService';
import { config } from './config';
import axios from 'axios';
import { DatabaseManager } from './services/databaseManager';
import { DataTransformer } from './services/dataTransformer';
import { DriversDataTransformer } from './services/driversDataTransformer';
import { AIAgentController } from './api/aiAgentController';
import apiRoutes from './api';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🔄 API Routes - Controle de Recargas e Sistema Híbrido
app.use('/api', apiRoutes);

// Instância do scraper persistente
const scraper = getPersistentScraper();

// 🗄️ Instâncias do banco de dados
const databaseManager = DatabaseManager.getInstance();
const dataTransformer = DataTransformer.getInstance();

// 📊 Instância do MonitoringService (Rides + Drivers integrado)
const monitoringService = new MonitoringService();

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

// � ================== ENDPOINTS DE DRIVERS ==================

// 🚗 Endpoint para scraping de drivers
app.get('/api/drivers/scrape', async (req: any, res: any) => {
  try {
    console.log('🎯 [API] Iniciando scraping de drivers...');
    
    const result = await scrapeAllDriversDataPersistent();
    
    if (result.success) {
      // Transformar e salvar dados
      const driversTransformer = DriversDataTransformer.getInstance();
      const transformedData = await driversTransformer.transformAndSave(
        result.data,
        result.sessionInfo,
        'api-request',
        result.hasChanges || false
      );

      res.json({
        success: true,
        message: result.message,
        data: {
          totalTables: result.data.length,
          totalRecords: transformedData.totalRecords,
          newRecords: transformedData.newRecords,
          hasChanges: result.hasChanges || false,
          tables: result.data.map(table => ({
            name: table.name,
            recordCount: table.isEmpty ? 0 : table.rows.length,
            isEmpty: table.isEmpty
          }))
        },
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Erro no scraping de drivers:', error.message);
    res.status(500).json({
      success: false,
      message: `Erro no scraping de drivers: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 Endpoint para teste específico da página Active Drivers
app.get('/api/drivers/active/test', async (req: any, res: any) => {
  try {
    console.log('🎯 [API] Testando scraping de Active Drivers...');
    
    // Importar classe diretamente para teste
    const { DriversPersistentScraper } = await import('./scraper/driversPersistentScraper');
    const driverscraper = new DriversPersistentScraper();
    
    // Testar apenas a primeira página (Active Drivers)
    const result = await driverscraper.scrapeAllDriversData();
    
    if (result.success && result.data.length > 0) {
      const activeDriversData = result.data.find(table => table.name === 'Active Drivers');
      
      res.json({
        success: true,
        message: 'Teste de Active Drivers concluído',
        data: {
          tableName: activeDriversData?.name || 'Active Drivers',
          headers: activeDriversData?.headers || [],
          totalRecords: activeDriversData?.rows.length || 0,
          sampleRecords: activeDriversData?.rows.slice(0, 3) || [], // Primeiros 3 registros como exemplo
          isEmpty: activeDriversData?.isEmpty || true
        },
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Erro no teste de Active Drivers:', error.message);
    res.status(500).json({
      success: false,
      message: `Erro no teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 Endpoint para teste específico da página Deactive Drivers
app.get('/api/drivers/deactive/test', async (req: any, res: any) => {
  try {
    console.log('🎯 [API] Testando scraping de Deactive Drivers...');
    
    // Importar classe diretamente para teste
    const { DriversPersistentScraper } = await import('./scraper/driversPersistentScraper');
    const driverscraper = new DriversPersistentScraper();
    
    // Testar apenas a página Deactive Drivers
    const result = await driverscraper.scrapeAllDriversData();
    
    if (result.success && result.data.length > 0) {
      const deactiveDriversData = result.data.find(table => table.name === 'Deactive Drivers');
      
      res.json({
        success: true,
        message: 'Teste de Deactive Drivers concluído',
        data: {
          tableName: deactiveDriversData?.name || 'Deactive Drivers',
          headers: deactiveDriversData?.headers || [],
          totalRecords: deactiveDriversData?.rows.length || 0,
          sampleRecords: deactiveDriversData?.rows.slice(0, 3) || [], // Primeiros 3 registros como exemplo
          isEmpty: deactiveDriversData?.isEmpty || true
        },
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Erro no teste de Deactive Drivers:', error.message);
    res.status(500).json({
      success: false,
      message: `Erro no teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 Endpoint para teste específico da página Enrollment Drivers
app.get('/api/drivers/enrollment/test', async (req: any, res: any) => {
  try {
    console.log('🎯 [API] Testando scraping de Drivers Enrollment...');
    
    // Importar classe diretamente para teste
    const { DriversPersistentScraper } = await import('./scraper/driversPersistentScraper');
    const driverscraper = new DriversPersistentScraper();
    
    // Testar apenas a página Drivers Enrollment
    const result = await driverscraper.scrapeAllDriversData();
    
    if (result.success && result.data.length > 0) {
      const enrollmentData = result.data.find(table => table.name === 'Drivers Enrollment');
      
      res.json({
        success: true,
        message: 'Teste de Drivers Enrollment concluído',
        data: {
          tableName: enrollmentData?.name || 'Drivers Enrollment',
          headers: enrollmentData?.headers || [],
          totalRecords: enrollmentData?.rows.length || 0,
          sampleRecords: enrollmentData?.rows.slice(0, 3) || [], // Primeiros 3 registros como exemplo
          isEmpty: enrollmentData?.isEmpty || true
        },
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Erro no teste de Drivers Enrollment:', error.message);
    res.status(500).json({
      success: false,
      message: `Erro no teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 Endpoint para teste específico da página Leaderboard
app.get('/api/drivers/leaderboard/test', async (req: any, res: any) => {
  try {
    console.log('🎯 [API] Testando scraping de Leaderboard...');
    
    // Importar classe diretamente para teste
    const { DriversPersistentScraper } = await import('./scraper/driversPersistentScraper');
    const driverscraper = new DriversPersistentScraper();
    
    // Testar apenas a página Leaderboard
    const result = await driverscraper.scrapeAllDriversData();
    
    if (result.success && result.data.length > 0) {
      const leaderboardData = result.data.find(table => table.name === 'Leaderboard');
      
      res.json({
        success: true,
        message: 'Teste de Leaderboard concluído',
        data: {
          tableName: leaderboardData?.name || 'Leaderboard',
          headers: leaderboardData?.headers || [],
          totalRecords: leaderboardData?.rows.length || 0,
          sampleRecords: leaderboardData?.rows.slice(0, 3) || [], // Primeiros 3 registros como exemplo
          isEmpty: leaderboardData?.isEmpty || true
        },
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Erro no teste de Leaderboard:', error.message);
    res.status(500).json({
      success: false,
      message: `Erro no teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// 🎯 Endpoint para teste específico da página Driver Performance
app.get('/api/drivers/performance/test', async (req: any, res: any) => {
  try {
    console.log('🎯 [API] Testando scraping de Driver Performance...');
    
    // Importar classe diretamente para teste
    const { DriversPersistentScraper } = await import('./scraper/driversPersistentScraper');
    const driverscraper = new DriversPersistentScraper();
    
    // Testar apenas a página Driver Performance
    const result = await driverscraper.scrapeAllDriversData();
    
    if (result.success && result.data.length > 0) {
      const performanceData = result.data.find(table => table.name === 'Driver Performance');
      
      res.json({
        success: true,
        message: 'Teste de Driver Performance concluído',
        data: {
          tableName: performanceData?.name || 'Driver Performance',
          headers: performanceData?.headers || [],
          totalRecords: performanceData?.rows.length || 0,
          sampleRecords: performanceData?.rows.slice(0, 3) || [], // Primeiros 3 registros como exemplo
          isEmpty: performanceData?.isEmpty || true
        },
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        sessionInfo: result.sessionInfo,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    console.error('❌ [API] Erro no teste de Driver Performance:', error.message);
    res.status(500).json({
      success: false,
      message: `Erro no teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// 📋 Endpoint para listar páginas de drivers disponíveis
app.get('/api/drivers/pages', (req: any, res: any) => {
  const driversPages = [
    { name: 'Active Drivers', url: '#/app/active-drivers/' },
    { name: 'Deactive Drivers', url: '#/app/deactivated-drivers/' },
    { name: 'Drivers Enrollment', url: '#/app/selfEnrolled-driver/' },
    { name: 'Leaderboard', url: '#/app/driver-leaderboard/' },
    { name: 'Driver Performance', url: '#/app/high-cancellations/' }
  ];
  
  res.json({
    success: true,
    pages: driversPages,
    message: 'Lista de páginas de drivers disponíveis para scraping'
  });
});

// �🗂️ ENDPOINT - Gerenciar cache de dados
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
app.post('/api/hybrid/start', async (req, res) => {
  try {
    console.log('🚀 Iniciando Sistema Híbrido via API...');
    await hybridService.start();
    
    // 🪟 Organizar janelas automaticamente após inicialização
    console.log('🪟 Organizando janelas dos browsers...');
    try {
      // Aguardar browsers abrirem
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      const { WindowPositioner } = await import('./utils/windowPositioner');
      const positioner = new WindowPositioner();
      
      await positioner.arrangeAllWindows();
      console.log('✅ Janelas organizadas em split-screen');
    } catch (windowError) {
      console.error('❌ Erro ao organizar janelas:', windowError);
    }
    
    res.json({
      success: true,
      message: 'Sistema híbrido iniciado com sucesso (janelas organizadas automaticamente)',
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
app.post('/api/windows/arrange', async (req, res) => {
  try {
    console.log('🪟 Organizando janelas em split-screen via API...');
    
    const { WindowPositioner } = await import('./utils/windowPositioner');
    const positioner = new WindowPositioner();
    
    await positioner.arrangeAllWindows();
    
    res.json({
      success: true,
      message: 'Janelas organizadas em split-screen com sucesso',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao organizar janelas:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ⏹️ Parar Sistema Híbrido
app.post('/api/hybrid/stop', async (req, res) => {
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
app.get('/api/hybrid/status', (req, res) => {
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
app.post('/api/hybrid/recharge', (req, res) => {
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
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 📋 Adicionar IDs para Extração
app.post('/api/hybrid/add-drivers', (req, res) => {
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
app.post('/api/hybrid/pause', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema híbrido controla pausas automaticamente durante recargas',
    note: 'Use /api/hybrid/stop para parar completamente',
    timestamp: new Date().toISOString()
  });
});

// ▶️ Resumir Sistema Híbrido (Nota: Funcionalidade controlada automaticamente)
app.post('/api/hybrid/resume', (req, res) => {
  res.json({
    success: true,
    message: 'Sistema híbrido resume automaticamente após recargas',
    note: 'Use /api/hybrid/start para iniciar se parado',
    timestamp: new Date().toISOString()
  });
});

// 🚨 Parada de Emergência (Use o método stop padrão)
app.post('/api/hybrid/emergency-stop', async (req, res) => {
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
app.get('/api/personal-data/drivers', async (req, res) => {
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
app.get('/api/personal-data/stats', async (req, res) => {
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

// Auto-inicialização (sem mudanças)
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
  
  // 🚀 AUTO-INICIALIZAÇÃO (apenas se habilitada)
  if (isAutoScrapingEnabled) {
    const autoStartHybrid = process.env.AUTO_START_HYBRID === 'true';
    
    // Log detalhado para arquivo
    logger.debug('AUTO', `Variáveis de ambiente: ENABLE_AUTO_SCRAPING=${process.env.ENABLE_AUTO_SCRAPING}, AUTO_START_HYBRID=${process.env.AUTO_START_HYBRID}`);
    logger.debug('AUTO', `Flags calculadas: isAutoScrapingEnabled=${isAutoScrapingEnabled}, autoStartHybrid=${autoStartHybrid}`);
    
    // Log resumido para console
    logger.info('AUTO', `Auto-start configurado - MonitoringService: SIM | HybridService: ${autoStartHybrid ? 'SIM' : 'NÃO'}`);
    logger.info('AUTO', 'Aguardando 30 segundos para inicialização...');
    
    setTimeout(async () => {
      try {
        logger.info('AUTO', 'Iniciando scrapers automáticos...');

        // Verificar se credenciais estão configuradas
        if (!process.env.RIDES_USERNAME || process.env.RIDES_USERNAME.includes('seu_email') ||
            !process.env.RIDES_PASSWORD || process.env.RIDES_PASSWORD.includes('sua_senha')) {
          logger.warn('AUTO', 'Credenciais não configuradas - aguardando configuração manual');
          return;
        }

        // ✅ MonitoringService e HybridOperationService em paralelo
        logger.info('MONITORING', 'Iniciando MonitoringService...');
        
        // 🚀 Iniciar híbrido em paralelo (não aguardar MonitoringService)
        if (autoStartHybrid) {
          logger.info('HYBRID', 'Iniciando Sistema Híbrido...');
          hybridService.start().then(() => {
            logger.success('HYBRID', 'Sistema Híbrido iniciado com sucesso');
          }).catch(err => {
            logger.error('HYBRID', 'Erro ao iniciar Sistema Híbrido', err);
          });
        } else {
          logger.info('HYBRID', 'Sistema Híbrido não será iniciado automaticamente (AUTO_START_HYBRID=false)');
        }
        
        try {
          // Executar uma vez imediatamente
          await monitoringService.runOnce();
          logger.success('MONITORING', 'Execução inicial de Rides + Drivers concluída');
          
          // 🪟 Organizar janelas automaticamente após abertura dos browsers
          logger.info('WINDOWS', 'Organizando janelas dos browsers em split-screen...');
          try {
            // Aguardar 3 segundos para browsers terminarem inicialização
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Importar e usar WindowPositioner
            const { WindowPositioner } = await import('./utils/windowPositioner');
            const positioner = new WindowPositioner();
            
            await positioner.arrangeAllWindows();
            logger.success('WINDOWS', 'Janelas organizadas em split-screen automaticamente');
          } catch (windowError: any) {
            logger.error('WINDOWS', 'Erro ao organizar janelas', windowError);
          }

          // 🔄 Iniciar monitoramento automático
          monitoringService.startMonitoring();
          logger.success('MONITORING', 'Monitoramento automático iniciado (frequência: 2,5 min)');

        } catch (error) {
          logger.error('MONITORING', 'Erro na execução inicial', error);
          logger.info('MONITORING', 'Tentando fallback...');
          try {
            const result = await scrapeAllRidesDataPersistent();
            if (result.success) {
              logger.success('MONITORING', 'Fallback concluído com sucesso');
              await processScrapingResult(result, 'initial-execution');
            } else {
              logger.error('MONITORING', `Falha no fallback: ${result.message}`);
            }
          } catch (fallbackError) {
            logger.error('MONITORING', 'Erro no fallback', fallbackError);
          }
        }

      } catch (error) {
        logger.error('AUTO', 'Erro na auto-inicialização', error);
        logger.info('AUTO', 'Use os endpoints /api/rides/scrape ou /api/hybrid/start para execução manual');
      }
    }, 30000);
  } else {
    logger.info('AUTO', 'Auto-execução DESABILITADA (ENABLE_AUTO_SCRAPING=false)');
    logger.info('AUTO', 'Use os endpoints para execução manual quando necessário');
  }
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
