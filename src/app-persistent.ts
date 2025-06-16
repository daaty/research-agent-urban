import dotenv from 'dotenv';
dotenv.config();
import express, { Request, Response } from 'express';
import { getPersistentScraper, scrapeAllRidesDataPersistent } from './scraper/ridesPersistentScraper';
import { config } from './config';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Instância do scraper persistente
const scraper = getPersistentScraper();

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
    
    if (result.success) {
      console.log('✅ Scraping persistente concluído com sucesso!');
      
      // Enviar dados para n8n se configurado
      if (config.n8nWebhookUrl && !config.n8nWebhookUrl.includes('seu-n8n.com')) {
        try {
          console.log('📤 Enviando dados para n8n...');
          await axios.post(config.n8nWebhookUrl, {
            timestamp: new Date().toISOString(),
            source: 'rides-dashboard-persistent',
            mode: 'persistent-browser',
            sessionInfo: result.sessionInfo,
            data: result.data
          });
          console.log('✅ Dados enviados para n8n com sucesso!');
        } catch (error) {
          console.error('❌ Erro ao enviar para n8n:', error);
        }
      }
      
      res.json({
        success: true,
        message: result.message,
        mode: 'persistent',
        sessionInfo: result.sessionInfo,
        data: result.data,
        summary: {
          totalTables: result.data.length,
          tablesWithData: result.data.filter(table => !table.isEmpty).length,
          tablesEmpty: result.data.filter(table => table.isEmpty).length,
          totalRecords: result.data.reduce((sum, table) => sum + table.rows.length, 0),
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

// ⏰ Sistema de execução periódica (opcional)
let intervalId: NodeJS.Timeout | null = null;

app.post('/api/scheduler/start', async (req: any, res: any) => {
  try {
    const { intervalMinutes = 10 } = req.body;
    
    if (intervalId) {
      clearInterval(intervalId);
    }
    
    console.log(`⏰ Iniciando execução automática a cada ${intervalMinutes} minutos`);
    
    intervalId = setInterval(async () => {
      try {
        console.log('⏰ Execução automática iniciada...');
        const result = await scrapeAllRidesDataPersistent();
        
        if (result.success) {
          console.log(`✅ Execução automática concluída: ${result.data.reduce((sum, table) => sum + table.rows.length, 0)} registros`);
        } else {
          console.error('❌ Erro na execução automática:', result.message);
        }
      } catch (error) {
        console.error('❌ Erro crítico na execução automática:', error);
      }
    }, intervalMinutes * 60 * 1000);
    
    res.json({
      success: true,
      message: `Execução automática iniciada (${intervalMinutes} min)`,
      intervalMinutes
    });
    
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro ao iniciar scheduler: ${error.message}`
    });
  }
});

app.post('/api/scheduler/stop', (req: any, res: any) => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    res.json({
      success: true,
      message: 'Execução automática parada'
    });
  } else {
    res.json({
      success: false,
      message: 'Nenhuma execução automática ativa'
    });
  }
});

// Inicializar servidor
app.listen(PORT, () => {
  console.log('🎉' + '='.repeat(60));
  console.log(`🚀 SERVIDOR PERSISTENTE FUNCIONANDO NA PORTA ${PORT}`);
  console.log('🎉' + '='.repeat(60));
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
  console.log('🎉' + '='.repeat(60));
  console.log(`🖥️  Modo: BROWSER PERSISTENTE`);
  console.log(`🖥️  Visual: ${!config.headlessMode ? 'HABILITADO ✅' : 'Desabilitado'}`);
  console.log(`🔄  Auto-execução: Disponível via /api/scheduler/start`);
  console.log('🎉' + '='.repeat(60));
});

// Limpeza na saída do processo
process.on('SIGINT', async () => {
  console.log('\n🔄 Recebido sinal de interrupção...');
  
  if (intervalId) {
    console.log('⏸️ Parando execução automática...');
    clearInterval(intervalId);
  }
  
  console.log('🧹 Executando limpeza final...');
  try {
    await scraper.cleanup();
    console.log('✅ Limpeza concluída');
  } catch (error) {
    console.error('❌ Erro na limpeza:', error);
  }
  
  console.log('👋 Servidor encerrado');
  process.exit(0);
});

export default app;
