import { chromium } from 'playwright';

export async function testRidesLoginWorking(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando browser para login...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    console.log('Navegando para:', process.env.RIDES_URL);
    await page.goto(process.env.RIDES_URL!, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Preencher os campos de login
    console.log('Preenchendo email...');
    await page.fill('#exampleInputEmail1', process.env.RIDES_LOGIN!);
    
    console.log('Preenchendo senha...');
    await page.fill('#exampleInputPassword1', process.env.RIDES_PASSWORD!);
    
    await page.waitForTimeout(1000);
    
    console.log('Procurando botão de login...');
    
    // Primeiro, vamos ver todos os botões disponíveis
    const allButtons = await page.$$eval('button', buttons => 
      buttons.map(button => ({
        text: button.textContent?.trim(),
        type: button.type,
        className: button.className,
        id: button.id
      }))
    );
    
    console.log('Botões encontrados:', JSON.stringify(allButtons, null, 2));
    
    const loginButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar"), .btn-primary, button.btn');
    
    if (!loginButton) {
      await browser.close();
      return {
        success: false,
        message: `Botão de login não encontrado. Botões disponíveis: ${JSON.stringify(allButtons, null, 2)}`
      };
    }
    
    console.log('Botão de login encontrado, clicando...');
    await loginButton.click();
    
    console.log('Aguardando redirecionamento...');
    await page.waitForTimeout(8000);
    
    // Verificar se há mensagens de erro
    const errorMessages = await page.$$eval('[class*="error"], [class*="alert"], .text-danger, .alert-danger', elements =>
      elements.map(el => el.textContent?.trim()).filter(text => text && text.length > 0)
    );
    
    if (errorMessages.length > 0) {
      await browser.close();
      return {
        success: false,
        message: `Erro de login detectado: ${errorMessages.join(', ')}`
      };
    }
    
    const finalUrl = page.url();
    const finalTitle = await page.title();
    
    await browser.close();
    
    const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
    
    return {
      success: loginSuccess,
      message: `Login ${loginSuccess ? 'bem-sucedido' : 'falhou'}! URL final: ${finalUrl}, Título: ${finalTitle}`
    };
    
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
