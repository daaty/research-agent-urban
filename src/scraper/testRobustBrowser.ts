import { chromium } from 'playwright';

export async function testWithRobustBrowser(): Promise<any> {
  let browser;
  
  try {
    const email = process.env.RIDES_EMAIL || '';
    const password = process.env.RIDES_PASSWORD || '';
    const headless = process.env.HEADLESS_MODE === 'true';
    
    console.log('🚀 TESTE COM BROWSER ROBUSTO');
    console.log('📧 Email:', email);
    console.log('🔧 Headless:', headless);
    
    // Configurações ROBUSTAS do browser que funcionavam antes
    browser = await chromium.launch({
      headless: headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--no-first-run',
        '--disable-default-apps',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ],
      ignoreDefaultArgs: ['--enable-automation'],
      timeout: 60000
    });
    
    // Context com configurações REAIS de browser
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1920, height: 1080 },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo',
      permissions: ['geolocation'],
      javaScriptEnabled: true,
      acceptDownloads: true,
      ignoreHTTPSErrors: true
    });
    
    const page = await context.newPage();
    
    // Remover webdriver property para evitar detecção
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
    });
    
    console.log('🔐 Fazendo login com configurações robustas...');
    
    // IR PARA LOGIN com waitUntil mais robusto
    await page.goto('https://rides.ec2dashboard.com/#/page/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    // Aguardar mais tempo para garantir carregamento
    await page.waitForTimeout(5000);
    
    // Verificar se a página carregou
    const title = await page.title();
    console.log('📄 Título da página:', title);
    
    // LOGIN mais robusto
    await page.waitForSelector('#exampleInputEmail1', { timeout: 15000 });
    await page.fill('#exampleInputEmail1', email);
    await page.waitForTimeout(500);
    
    await page.waitForSelector('#exampleInputPassword1', { timeout: 15000 });
    await page.fill('#exampleInputPassword1', password);
    await page.waitForTimeout(500);
    
    await page.click('button[type="submit"]');
    
    // Aguardar login com timeout maior
    await page.waitForTimeout(8000);
    
    const currentUrl = page.url();
    console.log('🌐 URL após login:', currentUrl);
    
    if (currentUrl.includes('login')) {
      throw new Error('LOGIN FALHOU!');
    }
    
    console.log('✅ LOGIN SUCESSO!');
    
    // IR PARA CANCELADOS com estratégia diferente
    console.log('🔍 Navegando para CANCELLED RIDES...');
    
    // Estratégia 1: URL direta com waitUntil mais permissivo
    await page.goto('https://rides.ec2dashboard.com/#/app/cancelled-rides/4/', { 
      waitUntil: 'domcontentloaded',
      timeout: 45000 
    });
    
    // Aguardar AngularJS carregar - MAIS TEMPO
    console.log('⏳ Aguardando AngularJS carregar...');
    await page.waitForTimeout(10000);
    
    // Aguardar tabela aparecer
    await page.waitForSelector('#ridesTable', { timeout: 20000 });
    console.log('✅ Tabela encontrada!');
    
    // Aguardar AJAX e dados carregarem - MUITO MAIS TEMPO
    console.log('⏳ Aguardando dados carregarem (45 segundos)...');
    
    let dataFound = false;
    let attempts = 0;
    const maxAttempts = 45; // 45 segundos
    
    while (attempts < maxAttempts && !dataFound) {
      await page.waitForTimeout(1000);
      attempts++;
      
      // Verificar se não há mais "No data available"
      const hasData = await page.evaluate(() => {
        const tbody = document.querySelector('#ridesTable tbody');
        if (!tbody) return false;
        
        const emptyMessage = tbody.querySelector('td.dataTables_empty');
        if (!emptyMessage) return true; // Se não tem mensagem de vazio, tem dados
        
        // Verificar se há linhas reais
        const dataRows = tbody.querySelectorAll('tr:not(:has(.dataTables_empty))');
        return dataRows.length > 0;
      });
      
      if (hasData) {
        console.log(`✅ Dados encontrados após ${attempts} segundos!`);
        dataFound = true;
        break;
      }
      
      // Log a cada 10 segundos
      if (attempts % 10 === 0) {
        console.log(`⏳ ${attempts}/45s - ainda aguardando dados...`);
      }
    }
    
    if (!dataFound) {
      console.log('⚠️ Timeout após 45s - vamos ver o que temos...');
    }
    
    // DEBUG FINAL
    console.log('🐛 === DEBUG FINAL COM BROWSER ROBUSTO ===');
    
    const finalUrl = page.url();
    console.log('🌐 URL final:', finalUrl);
    
    // Verificar tabela
    const tableExists = await page.$('#ridesTable');
    console.log('📊 ridesTable existe?', !!tableExists);
    
    if (tableExists) {
      const tbodyHTML = await page.innerHTML('#ridesTable tbody');
      console.log('📋 HTML do tbody:');
      console.log(tbodyHTML);
      
      // Contar elementos
      const allTRs = await page.$$('#ridesTable tbody tr');
      console.log('📋 Total de TRs:', allTRs.length);
      
      // Verificar se há dados via JavaScript
      const jsCheck = await page.evaluate(() => {
        const tbody = document.querySelector('#ridesTable tbody');
        if (!tbody) return { error: 'tbody não encontrado' };
        
        const emptyMessage = tbody.querySelector('td.dataTables_empty');
        const allRows = tbody.querySelectorAll('tr');
        const dataRows = tbody.querySelectorAll('tr:not(:has(.dataTables_empty))');
        
        return {
          hasEmptyMessage: !!emptyMessage,
          totalRows: allRows.length,
          dataRows: dataRows.length,
          emptyText: emptyMessage ? emptyMessage.textContent : null
        };
      });
      
      console.log('🔍 Verificação JavaScript:', JSON.stringify(jsCheck, null, 2));
    }
    
    return {
      success: true,
      dataFound,
      url: finalUrl,
      message: 'Teste com browser robusto concluído'
    };
    
  } catch (error: any) {
    console.error('❌ ERRO:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
