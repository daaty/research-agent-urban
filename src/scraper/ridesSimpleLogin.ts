import { chromium } from 'playwright';

export async function simpleRidesLogin(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    console.log('Navegando...');
    await page.goto(process.env.RIDES_URL!, { timeout: 30000 });
    await page.waitForTimeout(2000);
    
    console.log('Preenchendo credenciais...');
    await page.fill('#exampleInputEmail1', process.env.RIDES_LOGIN!);
    await page.fill('#exampleInputPassword1', process.env.RIDES_PASSWORD!);
    
    console.log('Tentando fazer login...');
    
    // Tentar pressionar Enter primeiro (mais natural)
    await page.press('#exampleInputPassword1', 'Enter');
    await page.waitForTimeout(3000);
    
    const url1 = page.url();
    console.log('URL após Enter:', url1);
    
    // Se ainda estiver na página de login, tentar clicar no botão
    if (url1.includes('login')) {
      const submitBtn = await page.$('button[type="submit"], button');
      if (submitBtn) {
        await submitBtn.click();
        await page.waitForTimeout(3000);
      }
    }
    
    const finalUrl = page.url();
    const pageContent = await page.textContent('body');
    
    await browser.close();
    
    // Verificar se o login foi bem-sucedido
    const loginSuccess = !finalUrl.includes('login');
    const hasError = pageContent?.toLowerCase().includes('incorrect') || 
                     pageContent?.toLowerCase().includes('invalid') ||
                     pageContent?.toLowerCase().includes('erro');
    
    let message = `URL final: ${finalUrl}`;
    if (hasError) {
      message += '. Erro detectado na página.';
    }
    if (pageContent && pageContent.length < 200) {
      message += ` Conteúdo: ${pageContent}`;
    }
    
    return {
      success: loginSuccess && !hasError,
      message: message
    };
    
  } catch (error: any) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    return {
      success: false,
      message: `Erro: ${error.message}`
    };
  }
}

// Função para testar apenas se consegue acessar após login manual
export async function testAfterManualLogin(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    browser = await chromium.launch({
      headless: false, // Modo visual para você fazer login manual
      slowMo: 1000
    });
    
    const page = await browser.newPage();
    
    console.log('Abrindo página para login manual...');
    await page.goto(process.env.RIDES_URL!);
    
    console.log('Aguardando 60 segundos para você fazer login manual...');
    await page.waitForTimeout(60000);
    
    const finalUrl = page.url();
    const title = await page.title();
    
    // Verificar se há tabelas na página
    const tables = await page.$$('table');
    const tableCount = tables.length;
    
    await browser.close();
    
    return {
      success: !finalUrl.includes('login'),
      message: `Após login manual - URL: ${finalUrl}, Título: ${title}, Tabelas encontradas: ${tableCount}`
    };
    
  } catch (error: any) {
    if (browser) {
      await browser.close().catch(() => {});
    }
    return {
      success: false,
      message: `Erro: ${error.message}`
    };
  }
}
