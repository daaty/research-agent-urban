import { chromium } from 'playwright';

export async function testAngularLoginSafe(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando browser para login AngularJS seguro...');
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
    
    console.log('Aguardando AngularJS carregar...');
    await page.waitForTimeout(5000);
    
    // Aguardar especificamente pelo AngularJS
    await page.waitForFunction(() => {
      return typeof (window as any).angular !== 'undefined';
    }, { timeout: 10000 });
    
    console.log('AngularJS carregado, preenchendo campos de forma segura...');
    
    // Usar uma abordagem mais segura
    const success = await page.evaluate((credentials) => {
      try {
        const { email, password } = credentials;
        
        // Método 1: Preencher campos diretamente
        const emailElement = document.getElementById('exampleInputEmail1') as HTMLInputElement;
        const passwordElement = document.getElementById('exampleInputPassword1') as HTMLInputElement;
        
        if (!emailElement || !passwordElement) {
          return { success: false, message: 'Campos não encontrados' };
        }
        
        // Limpar campos primeiro
        emailElement.value = '';
        passwordElement.value = '';
        
        // Preencher caracter por caracter para simular digitação
        emailElement.focus();
        emailElement.value = email;
        
        passwordElement.focus();
        passwordElement.value = password;
        
        // Disparar eventos múltiplos
        const events = ['input', 'change', 'keyup', 'blur'];
        
        events.forEach(eventType => {
          emailElement.dispatchEvent(new Event(eventType, { bubbles: true }));
          passwordElement.dispatchEvent(new Event(eventType, { bubbles: true }));
        });
        
        // Tentar método AngularJS se disponível
        if ((window as any).angular) {
          try {
            const angular = (window as any).angular;
            const emailScope = angular.element(emailElement).scope();
            
            if (emailScope && emailScope.user) {
              emailScope.user.email = email;
              emailScope.user.password = password;
              emailScope.$apply();
              console.log('AngularJS scope atualizado');
            }
          } catch (angularError) {
            console.log('Erro no AngularJS:', angularError);
          }
        }
        
        return { success: true, message: 'Campos preenchidos' };
        
      } catch (error) {
        return { success: false, message: `Erro: ${(error as Error).message}` };
      }
    }, { 
      email: process.env.RIDES_LOGIN!, 
      password: process.env.RIDES_PASSWORD! 
    });
    
    if (!success.success) {
      await browser.close();
      return success;
    }
    
    await page.waitForTimeout(2000);
    
    console.log('Procurando botão de login...');
    const buttonClick = await page.evaluate(() => {
      const button = document.getElementById('loginButton') || 
                    document.querySelector('button[type="submit"]') ||
                    document.querySelector('.login button');
      
      if (button) {
        (button as HTMLElement).click();
        return true;
      }
      return false;
    });
    
    if (!buttonClick) {
      await browser.close();
      return {
        success: false,
        message: 'Botão de login não encontrado'
      };
    }
    
    console.log('Aguardando resposta...');
    await page.waitForTimeout(8000);
    
    const finalUrl = page.url();
    console.log('URL final:', finalUrl);
    
    // Verificar se há mensagem de erro
    const errorCheck = await page.evaluate(() => {
      const errorSelectors = [
        '.error',
        '.alert-danger', 
        '.alert-warning',
        '[class*="error"]',
        '[class*="invalid"]'
      ];
      
      for (const selector of errorSelectors) {
        const element = document.querySelector(selector);
        if (element && element.textContent && element.textContent.trim()) {
          return element.textContent.trim();
        }
      }
      
      // Verificar se ainda tem os campos de login visíveis
      const emailField = document.getElementById('exampleInputEmail1');
      if (emailField && (emailField as HTMLElement).offsetParent !== null) {
        return 'Ainda na página de login';
      }
      
      return null;
    });
    
    await browser.close();
    
    const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
    
    if (errorCheck) {
      return {
        success: false,
        message: `Erro detectado: ${errorCheck}`
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
