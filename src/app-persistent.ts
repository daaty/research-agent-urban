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

// 🔄 Função para processar resultado e enviar webhook
async function processScrapingResult(result: any, source: string = 'manual') {
  if (result.success) {
    console.log('✅ Scraping concluído com sucesso!');
    
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
              totalNewRecords: result.differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0),
              totalUpdatedRecords: result.differences.reduce((sum, diff) => sum + diff.updatedRecords.length, 0),
              totalRemovedRecords: result.differences.reduce((sum, diff) => sum + diff.removedRecords.length, 0),
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
      await page.goto('https://rides.ec2dashboard.com/#/page/login', {
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

// Inicializar servidor
app.listen(PORT, async () => {
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
  console.log(`🔄  Auto-execução: ATIVANDO EM 30 SEGUNDOS...`);
  console.log('🎉' + '='.repeat(60));
  
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
