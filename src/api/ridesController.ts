import express from 'express';
import { scrapeRidesDashboard } from '../scraper/ridesDashboardScraper';
import { testBrowserSimple } from '../scraper/testBrowser';
import { testRidesLogin, previewRidesTables } from '../scraper/ridesScraperNew';
import { N8nWebhookPayload } from '../types/common';
import axios from 'axios';
import { chromium } from 'playwright';
import { testRidesSimple } from '../scraper/ridesTestSimple';
import { testRidesLoginWorking } from '../scraper/ridesLoginWorking';
import { debugRidesLogin } from '../scraper/ridesDebug';
import { simpleRidesLogin, testAfterManualLogin } from '../scraper/ridesSimpleLogin';
import { testRidesLoginRobust } from '../scraper/ridesLoginRobust';
import { investigateRidesForm } from '../scraper/ridesInvestigate';
import { testRidesAngularLogin } from '../scraper/ridesAngularLogin';
import { testAngularLoginSafe } from '../scraper/ridesAngularLoginSafe';
import { testDirectLogin } from '../scraper/ridesDirectLogin';
import { testSimpleEnterLogin } from '../scraper/ridesSimpleEnter';
import { captureNetworkRequests } from '../scraper/ridesNetworkCapture';
import { scrapeRidesData } from '../scraper/ridesFullScraper';
import { testEnvironmentVariables } from '../scraper/testEnvVars';
import { scrapeRidesDataSimple } from '../scraper/ridesScrapingSimple';
import { testCancelledRidesOnly } from '../scraper/testCancelledRides';
import { testCancelledRidesAdvanced } from '../scraper/testCancelledRides2';
import { investigateFilters } from '../scraper/investigateFilters';
import { testRobustBrowser } from '../scraper/testRobustBrowser';
import { testWithSearchButton } from '../scraper/testWithSearchButton';

const router = express.Router();

// Função para enviar dados para n8n
async function sendToN8n(payload: N8nWebhookPayload): Promise<boolean> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  
  if (!webhookUrl || webhookUrl.includes('seu-n8n.com')) {
    console.log('⚠️ URL do webhook n8n não configurada, pulando envio...');
    return false;
  }

  try {
    console.log('📤 Enviando dados para n8n...');
    const response = await axios.post(webhookUrl, payload, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ Dados enviados para n8n com sucesso!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao enviar dados para n8n:', error);
    return false;
  }
}

// Endpoint principal para scraping do Rides Dashboard
router.post('/', async (req, res) => {
  try {
    console.log('🚀 Iniciando scraping do Rides Dashboard...');
    
    const { targetPageUrl, sendToN8n: shouldSendToN8n } = req.body;
    
    // Realizar o scraping
    const result = await scrapeRidesDashboard(targetPageUrl);
    
    // Enviar para n8n se solicitado
    if (shouldSendToN8n) {
      const n8nPayload: N8nWebhookPayload = {
        source: 'rides-dashboard',
        data: result,
        timestamp: new Date().toISOString(),
        success: result.success,
        message: result.message
      };
      
      const n8nSent = await sendToN8n(n8nPayload);
      
      res.json({
        ...result,
        n8nDelivery: {
          attempted: true,
          success: n8nSent,
          timestamp: new Date().toISOString()
        }
      });
    } else {
      res.json(result);
    }

  } catch (error: any) {
    console.error('❌ Erro durante scraping:', error.message);
    
    const errorResult = {
      success: false,
      message: `Erro durante scraping: ${error.message}`,
      tables: [],
      scrapedAt: new Date().toISOString()
    };
    
    res.status(500).json(errorResult);
  }
});

// Endpoint para testar conexão (apenas login)
router.post('/test-login', async (req, res) => {
  try {
    console.log('🧪 Testando login no Rides Dashboard...');
    
    const { RidesDashboardScraper } = await import('../scraper/ridesDashboardScraper');
    const scraper = new RidesDashboardScraper();
    
    await scraper.initialize();
    const loginSuccess = await scraper.login();
    await scraper.close();
    
    res.json({
      success: loginSuccess,
      message: loginSuccess ? 'Login realizado com sucesso!' : 'Falha no login',
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro durante teste de login:', error.message);
    res.status(500).json({
      success: false,
      message: `Erro durante teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para listar tabelas sem extrair dados (mais rápido)
router.post('/preview', async (req, res) => {
  try {
    console.log('👀 Preview de tabelas do Rides Dashboard...');
    
    const { targetPageUrl } = req.body;
    const { RidesDashboardScraper } = await import('../scraper/ridesDashboardScraper');
    
    const scraper = new RidesDashboardScraper();
    await scraper.initialize();
    
    const loginSuccess = await scraper.login();
    if (!loginSuccess) {
      await scraper.close();
      return res.status(401).json({
        success: false,
        message: 'Falha no login',
        timestamp: new Date().toISOString()
      });
    }
    
    if (targetPageUrl) {
      await scraper.scrapeTablesFromPage(targetPageUrl);
    }
    
    // Contar tabelas sem extrair dados completos
    const tableCount = await scraper.page?.$$eval('table', tables => tables.length) || 0;
    
    await scraper.close();
    
    res.json({
      success: true,
      message: `${tableCount} tabelas encontradas`,
      tableCount,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro durante preview:', error.message);
    res.status(500).json({
      success: false,
      message: `Erro durante preview: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint simples para testar se o Playwright funciona
router.post('/test-browser', async (req, res) => {
  try {
    console.log('🧪 Testando browser básico...');
    
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.goto('https://www.google.com');
    const title = await page.title();
    
    await browser.close();
    
    res.json({
      success: true,
      message: 'Browser funcionando!',
      title: title,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro no teste do browser:', error.message);
    res.status(500).json({
      success: false,
      message: `Erro no teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para teste simples do browser
router.post('/test-browser-simple', async (req, res) => {
  try {
    console.log('🧪 Iniciando teste simples do browser...');
    const result = await testBrowserSimple();
    
    res.json({
      ...result,
      timestamp: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('❌ Erro no teste simples:', error.message);
    res.status(500).json({
      success: false,
      message: `Erro no teste simples: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para teste simples do Rides
router.post('/test-simple', async (req, res) => {
  try {
    const result = await testRidesSimple();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante teste simples: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para testar login funcional
router.post('/test-login-working', async (req, res) => {
  try {
    const result = await testRidesLoginWorking();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para debug detalhado do login
router.post('/debug-login', async (req, res) => {
  try {
    const result = await debugRidesLogin();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante debug: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint simples para login
router.post('/simple-login', async (req, res) => {
  try {
    const result = await simpleRidesLogin();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para testar após login manual
router.post('/test-manual-login', async (req, res) => {
  try {
    const result = await testAfterManualLogin();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para testar login robusto
router.post('/test-login-robust', async (req, res) => {
  try {
    const result = await testRidesLoginRobust();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante teste robusto: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para investigar formulário
router.post('/investigate-form', async (req, res) => {
  try {
    const result = await investigateRidesForm();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante investigação: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para testar login com AngularJS
router.post('/test-angular-login', async (req, res) => {
  try {
    const result = await testRidesAngularLogin();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante teste Angular: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para teste de login AngularJS seguro
router.post('/test-angular-login-safe', async (req, res) => {
  try {
    const result = await testAngularLoginSafe();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para teste de login direto
router.post('/test-direct-login', async (req, res) => {
  try {
    const result = await testDirectLogin();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante login direto: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para login simples com Enter
router.post('/test-enter-login', async (req, res) => {
  try {
    const result = await testSimpleEnterLogin();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante login com Enter: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para capturar requisições de rede
router.post('/capture-network', async (req, res) => {
  try {
    const result = await captureNetworkRequests();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante captura: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para scraping completo
router.post('/scrape-full', async (req, res) => {
  try {
    const result = await scrapeRidesData(
      process.env.RIDES_URL!,
      process.env.RIDES_LOGIN!,
      process.env.RIDES_PASSWORD!
    );
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante scraping completo: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para testar variáveis de ambiente
router.post('/test-env', async (req, res) => {
  try {
    const result = await testEnvironmentVariables();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para scraping simples baseado no login que funciona
router.post('/scrape-simple', async (req, res) => {
  try {
    console.log('Iniciando scraping simples das 5 abas...');
    const result = await scrapeAllRidesData();
    
    res.json({
      success: result.success,
      data: result.data,
      message: result.message,
      summary: {
        totalTables: result.data.length,
        tablesWithData: result.data.filter(t => !t.isEmpty).length,
        emptyTables: result.data.filter(t => t.isEmpty).length,
        totalRecords: result.data.reduce((sum, table) => sum + table.rows.length, 0)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      data: [],
      message: `Erro durante scraping simples: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para DEBUG específico da aba CANCELADOS
router.post('/test-cancelled-only', async (req, res) => {
  try {
    console.log('🧪 Iniciando teste específico da aba CANCELADOS...');
    const result = await testCancelledRidesOnly();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante teste: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para DEBUG avançado da aba CANCELADOS
router.post('/test-cancelled-advanced', async (req, res) => {
  try {
    console.log('🧪 Iniciando teste AVANÇADO da aba CANCELADOS...');
    const result = await testCancelledRidesAdvanced();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante teste avançado: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// Endpoint para INVESTIGAR FILTROS da aba CANCELADOS
router.post('/investigate-filters', async (req, res) => {
  try {
    console.log('🔍 Iniciando investigação de FILTROS...');
    const result = await investigateFilters();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante investigação: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

// TESTE COM BROWSER ROBUSTO
router.post('/test-robust-browser', async (req, res) => {
  try {
    console.log('🧪 Iniciando teste com browser robusto...');
    const result = await testRobustBrowser();
    
    res.json({
      success: true,
      data: result,
      message: 'Teste com browser robusto concluído',
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

// Novo endpoint para testar com botão de busca
router.post('/test-with-search-button', async (req, res) => {
  try {
    console.log('🎯 Iniciando teste com botão de busca...');
    const result = await testWithSearchButton();
    res.json({
      success: true,
      data: result,
      message: 'Teste com botão de busca concluído',
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

export default router;
