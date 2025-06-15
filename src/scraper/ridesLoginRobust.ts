import { chromium } from 'playwright';

export async function testRidesLoginRobust(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando browser robusto...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Aguardar JavaScript carregar antes de interagir
    console.log('Navegando para:', process.env.RIDES_URL);
    await page.goto(process.env.RIDES_URL!, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('Aguardando JavaScript carregar...');
    await page.waitForTimeout(5000);
    
    // Aguardar especificamente pelos campos de login
    console.log('Aguardando campos de login...');
    await page.waitForSelector('#exampleInputEmail1', { timeout: 10000 });
    await page.waitForSelector('#exampleInputPassword1', { timeout: 10000 });
    
    // Usar type ao invés de fill para simular digitação real
    console.log('Preenchendo email com digitação...');
    await page.click('#exampleInputEmail1');
    await page.waitForTimeout(500);
    await page.type('#exampleInputEmail1', process.env.RIDES_LOGIN!, { delay: 100 });
    
    console.log('Preenchendo senha com digitação...');
    await page.click('#exampleInputPassword1');
    await page.waitForTimeout(500);
    await page.type('#exampleInputPassword1', process.env.RIDES_PASSWORD!, { delay: 100 });
    
    await page.waitForTimeout(1000);
    
    // Procurar botão de login com mais opções
    console.log('Procurando botão de login...');
    const buttonSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Entrar")',
      '.btn-primary',
      'button.btn',
      '[ng-click*="login"]',
      '[ng-click*="Login"]'
    ];
    
    let loginButton = null;
    for (const selector of buttonSelectors) {
      try {
        loginButton = await page.$(selector);
        if (loginButton) {
          console.log('Botão encontrado com seletor:', selector);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!loginButton) {
      // Listar todos os botões disponíveis
      const allButtons = await page.$$eval('button', buttons => 
        buttons.map(button => ({
          text: button.textContent?.trim(),
          type: button.type,
          className: button.className,
          onclick: button.onclick ? button.onclick.toString() : null,
          ngClick: button.getAttribute('ng-click')
        }))
      );
      
      await browser.close();
      return {
        success: false,
        message: `Botão de login não encontrado. Botões disponíveis: ${JSON.stringify(allButtons, null, 2)}`
      };
    }
    
    console.log('Clicando no botão de login...');
    await loginButton.click();
    
    // Aguardar mais tempo para o processo de login
    console.log('Aguardando processo de login...');
    await page.waitForTimeout(8000);
    
    // Verificar se houve redirecionamento ou mudança na página
    const finalUrl = page.url();
    const finalTitle = await page.title();
    
    // Verificar se há mensagens de erro na página
    const errorSelectors = [
      '.alert-danger',
      '.error',
      '[class*="error"]',
      '.ng-binding:has-text("error")',
      '.ng-binding:has-text("incorrect")',
      '.ng-binding:has-text("invalid")'
    ];
    
    let errorMessage = '';
    for (const selector of errorSelectors) {
      try {
        const errorElement = await page.$(selector);
        if (errorElement) {
          const text = await errorElement.textContent();
          if (text && text.trim()) {
            errorMessage = text.trim();
            break;
          }
        }
      } catch (e) {
        continue;
      }
    }
    
    await browser.close();
    
    // Verificar sucesso baseado na URL e mensagens
    const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
    
    if (errorMessage) {
      return {
        success: false,
        message: `Erro de login detectado: ${errorMessage}`
      };
    }
    
    return {
      success: loginSuccess,
      message: `Login ${loginSuccess ? 'bem-sucedido' : 'falhou'}! URL final: ${finalUrl}, Título: ${finalTitle}${errorMessage ? `, Erro: ${errorMessage}` : ''}`
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
