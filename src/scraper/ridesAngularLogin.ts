import { chromium } from 'playwright';

export async function testRidesAngularLogin(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando browser para login AngularJS...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    console.log('Navegando para:', process.env.RIDES_URL);
    await page.goto(process.env.RIDES_URL!, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Aguardar AngularJS carregar
    console.log('Aguardando AngularJS carregar...');
    await page.waitForTimeout(5000);
    
    // Aguardar especificamente pelo angular
    await page.waitForFunction(() => {
      return typeof window.angular !== 'undefined';
    }, { timeout: 10000 });
    
    console.log('AngularJS carregado, preenchendo campos...');
    
    // Método 1: Usar evaluate para executar código no contexto da página
    await page.evaluate((email, password) => {
      // Encontrar o scope do Angular
      const emailElement = document.getElementById('exampleInputEmail1');
      const passwordElement = document.getElementById('exampleInputPassword1');
      
      if (emailElement && passwordElement) {
        // Obter o scope Angular
        const scope = window.angular.element(emailElement).scope();
        
        if (scope) {
          // Definir os valores no modelo Angular
          scope.user = scope.user || {};
          scope.user.email = email;
          scope.user.password = password;
          
          // Aplicar as mudanças
          scope.$apply();
          
          console.log('Valores definidos no scope Angular:', scope.user);
        }
        
        // Também definir os valores diretamente nos elementos
        emailElement.value = email;
        passwordElement.value = password;
        
        // Disparar eventos de input
        emailElement.dispatchEvent(new Event('input', { bubbles: true }));
        passwordElement.dispatchEvent(new Event('input', { bubbles: true }));
        emailElement.dispatchEvent(new Event('change', { bubbles: true }));
        passwordElement.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, process.env.RIDES_LOGIN!, process.env.RIDES_PASSWORD!);
    
    await page.waitForTimeout(2000);
    
    console.log('Clicando no botão de login...');
    await page.click('#loginButton');
    
    console.log('Aguardando resposta...');
    await page.waitForTimeout(8000);
    
    const finalUrl = page.url();
    console.log('URL final:', finalUrl);
    
    // Verificar se há mensagem de erro
    const errorMessage = await page.$eval('.error, .alert-danger, .ng-binding:contains("Incorrect")', 
      el => el.textContent?.trim()).catch(() => null);
    
    // Verificar se saiu da página de login
    const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
    
    await browser.close();
    
    if (errorMessage) {
      return {
        success: false,
        message: `Erro de login detectado: ${errorMessage}`
      };
    }
    
    return {
      success: loginSuccess,
      message: `Login ${loginSuccess ? 'bem-sucedido' : 'falhou'}! URL final: ${finalUrl}`
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
