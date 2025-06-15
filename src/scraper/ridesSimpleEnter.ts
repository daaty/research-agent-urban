import { chromium } from 'playwright';

export async function testSimpleEnterLogin(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando login simples com Enter...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Navegar para a página
    await page.goto(process.env.RIDES_URL!, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Preencher email
    await page.click('#exampleInputEmail1');
    await page.type('#exampleInputEmail1', process.env.RIDES_LOGIN!, { delay: 100 });
    
    // Preencher senha
    await page.click('#exampleInputPassword1');
    await page.type('#exampleInputPassword1', process.env.RIDES_PASSWORD!, { delay: 100 });
    
    // Pressionar Enter no campo de senha (comum em formulários)
    await page.press('#exampleInputPassword1', 'Enter');
    
    // Aguardar redirecionamento
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    const finalTitle = await page.title();
    
    // Verificar se há mensagem de erro
    const errorMessage = await page.$eval('.error, .alert-danger, [class*="error"], [class*="alert"]', 
      el => el.textContent?.trim()).catch(() => null);
    
    await browser.close();
    
    const success = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
    
    let message = `URL final: ${finalUrl}, Título: "${finalTitle}"`;
    if (errorMessage) {
      message += `, Erro: ${errorMessage}`;
    }
    if (success) {
      message = `Login bem-sucedido! ${message}`;
    }
    
    return { success, message };
    
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }
    return {
      success: false,
      message: `Erro: ${error.message}`
    };
  }
}
