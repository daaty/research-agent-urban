import { chromium } from 'playwright';

export async function testCancelledRidesAdvanced(): Promise<any> {
  let browser;
  
  try {
    const email = process.env.RIDES_EMAIL || '';
    const password = process.env.RIDES_PASSWORD || '';
    const headless = process.env.HEADLESS_MODE === 'true';
    
    console.log('🚀 TESTE AVANÇADO - ABA CANCELADOS');
    console.log('📧 Email:', email);
    console.log('🔧 Headless:', headless);
    
    browser = await chromium.launch({
      headless: true, // FORÇAR SEMPRE HEADLESS
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled', // Anti-detecção
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      // Simular um browser real
      javaScriptEnabled: true,
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo'
    });
    
    const page = await context.newPage();
    
    // Interceptar requests para debug
    page.on('request', request => {
      if (request.url().includes('cancelled') || request.url().includes('rides')) {
        console.log(`📡 REQUEST: ${request.method()} ${request.url()}`);
      }
    });
    
    page.on('response', response => {
      if (response.url().includes('cancelled') || response.url().includes('rides')) {
        console.log(`📡 RESPONSE: ${response.status()} ${response.url()}`);
      }
    });
    
    // 1. LOGIN
    console.log('🔐 Fazendo login...');
    await page.goto('https://rides.ec2dashboard.com/#/page/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForTimeout(3000);
    
    // Preencher login
    await page.fill('#exampleInputEmail1', email);
    await page.fill('#exampleInputPassword1', password);
    await page.click('button[type="submit"]');
    
    // Aguardar login
    await page.waitForTimeout(8000);
    const currentUrl = page.url();
    console.log('🌐 URL após login:', currentUrl);
    
    if (currentUrl.includes('login')) {
      throw new Error('LOGIN FALHOU!');
    }
    
    console.log('✅ LOGIN SUCESSO!');
    
    // 2. ESTRATÉGIA 1: NAVEGAR PELO MENU AO INVÉS DE URL DIRETA
    console.log('🔍 ESTRATÉGIA 1: Navegando pelo menu...');
    
    // Procurar por link do menu para Cancelled Rides
    await page.waitForTimeout(2000);
    const menuLinks = await page.$$('a, .nav-link, [ui-sref]');
    console.log(`🔗 ${menuLinks.length} links encontrados no menu`);
    
    let cancelledLink = null;
    for (const link of menuLinks) {
      const text = await link.textContent();
      const href = await link.getAttribute('href');
      const uiSref = await link.getAttribute('ui-sref');
      
      if (text && (text.toLowerCase().includes('cancelled') || text.toLowerCase().includes('cancelado'))) {
        console.log(`🎯 Link encontrado: "${text}" - href: ${href}, ui-sref: ${uiSref}`);
        cancelledLink = link;
        break;
      }
    }
    
    if (cancelledLink) {
      console.log('🔍 Clicando no link do menu...');
      await cancelledLink.click();
      await page.waitForTimeout(3000);
    } else {
      console.log('🔍 Link não encontrado, usando URL direta...');
      await page.goto('https://rides.ec2dashboard.com/#/app/cancelled-rides/4/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
    }
    
    // 3. AGUARDAR E DEBUGAR CARREGAMENTO
    console.log('⏳ Aguardando página carregar completamente...');
    
    // Aguardar AngularJS
    await page.waitForFunction(() => {
      return (window as any).angular && (window as any).angular.element;
    }, { timeout: 15000 });
    console.log('✅ AngularJS carregado!');
    
    // Aguardar mais um tempo para AJAX
    await page.waitForTimeout(5000);
    
    // 4. ESTRATÉGIA 2: SIMULAR REFRESH DA PÁGINA
    console.log('🔄 ESTRATÉGIA 2: Simulando refresh...');
    await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(5000);
    
    // 5. DEBUGAR ESTADO ATUAL
    console.log('🐛 === DEBUG DO ESTADO ATUAL ===');
    
    const currentUrl2 = page.url();
    console.log('🌐 URL atual:', currentUrl2);
    
    // Verificar se existem cookies
    const cookies = await context.cookies();
    console.log('🍪 Cookies:', cookies.length);
    
    // Verificar localStorage
    const localStorage = await page.evaluate(() => {
      const items: any = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) items[key] = localStorage.getItem(key);
      }
      return items;
    });
    console.log('💾 LocalStorage keys:', Object.keys(localStorage));
    
    // Verificar sessionStorage
    const sessionStorage = await page.evaluate(() => {
      const items: any = {};
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) items[key] = sessionStorage.getItem(key);
      }
      return items;
    });
    console.log('💾 SessionStorage keys:', Object.keys(sessionStorage));
    
    // 6. AGUARDAR DADOS COM MÚLTIPLAS ESTRATÉGIAS
    console.log('⏳ Aguardando dados com múltiplas estratégias...');
    
    let dataFound = false;
    let strategy = '';
    
    // Estratégia A: Aguardar sumiço do "No data available"
    console.log('🔍 Estratégia A: Aguardando sumiço do "No data available"...');
    for (let i = 0; i < 15; i++) {
      const noDataElement = await page.$('td.dataTables_empty');
      if (!noDataElement) {
        console.log(`✅ "No data available" desapareceu após ${i} segundos!`);
        dataFound = true;
        strategy = 'no-data-gone';
        break;
      }
      await page.waitForTimeout(1000);
    }
    
    // Estratégia B: Aguardar linhas aparecerem
    if (!dataFound) {
      console.log('🔍 Estratégia B: Aguardando linhas aparecerem...');
      for (let i = 0; i < 15; i++) {
        const dataRows = await page.$$('#ridesTable tbody tr:not(:has(.dataTables_empty))');
        if (dataRows.length > 0) {
          console.log(`✅ ${dataRows.length} linhas encontradas após ${i} segundos!`);
          dataFound = true;
          strategy = 'rows-appeared';
          break;
        }
        await page.waitForTimeout(1000);
      }
    }
    
    // Estratégia C: Aguardar AngularJS scope
    if (!dataFound) {
      console.log('🔍 Estratégia C: Aguardando AngularJS scope...');
      await page.waitForFunction(() => {
        const tbody = document.querySelector('#ridesTable tbody');
        if (!tbody) return false;
        
        const angularElement = (window as any).angular?.element(tbody);
        if (!angularElement) return false;
        
        const scope = angularElement.scope();
        return scope && scope.rides && scope.rides.length > 0;
      }, { timeout: 20000 }).catch(() => {
        console.log('⚠️ Timeout aguardando AngularJS scope');
      });
    }
    
    // 7. DEBUGAR RESULTADO FINAL
    console.log('🐛 === DEBUG FINAL ===');
    console.log('📊 Estratégia usada:', strategy || 'nenhuma');
    
    // Verificar tabela
    const ridesTable = await page.$('#ridesTable');
    console.log('🎯 ridesTable existe?', !!ridesTable);
    
    if (ridesTable) {
      // Pegar dados via JavaScript (método alternativo)
      const jsData = await page.evaluate(() => {
        const tbody = document.querySelector('#ridesTable tbody');
        if (!tbody) return { error: 'tbody não encontrado' };
        
        const rows = Array.from(tbody.querySelectorAll('tr'));
        console.log('JS: Total de rows:', rows.length);
        
        const data = rows.map((row, index) => {
          const cells = Array.from(row.querySelectorAll('td'));
          const isEmpty = row.querySelector('.dataTables_empty');
          
          return {
            index,
            cellCount: cells.length,
            isEmpty: !!isEmpty,
            text: row.textContent?.trim() || '',
            html: row.innerHTML.substring(0, 200)
          };
        });
        
        return { totalRows: rows.length, data };
      });
      
      console.log('📋 Dados via JavaScript:', JSON.stringify(jsData, null, 2));
      
      // HTML da tabela para debug
      const tableHTML = await page.innerHTML('#ridesTable');
      console.log('📋 HTML da tabela (primeiros 1000 chars):');
      console.log(tableHTML.substring(0, 1000));
    }
    
    return {
      success: true,
      url: page.url(),
      strategy,
      dataFound,
      tableExists: !!ridesTable,
      message: 'Teste avançado concluído'
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
