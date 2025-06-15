import { chromium } from 'playwright';

export async function testDirectLogin(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando browser para login direto...');
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
    
    // Tentar chamar diretamente a função de login do AngularJS
    console.log('Tentando login direto via AngularJS...');
    const loginResult = await page.evaluate((email, password) => {
      try {
        // Verificar se o AngularJS está disponível
        if (typeof window.angular === 'undefined') {
          return { success: false, message: 'AngularJS não encontrado' };
        }
        
        // Pegar o scope do elemento
        const element = document.getElementById('LoginForm');
        if (!element) {
          return { success: false, message: 'Formulário de login não encontrado' };
        }
        
        const scope = window.angular.element(element).scope();
        if (!scope) {
          return { success: false, message: 'Scope do AngularJS não encontrado' };
        }
        
        // Definir os dados do usuário
        scope.user = {
          email: email,
          password: password
        };
        
        // Aplicar as mudanças
        scope.$apply();
        
        // Chamar a função de login
        if (typeof scope.loginAdmin === 'function') {
          scope.loginAdmin(scope.user);
          return { success: true, message: 'Função de login chamada com sucesso' };
        } else {
          return { success: false, message: 'Função loginAdmin não encontrada' };
        }
        
      } catch (error) {
        return { success: false, message: `Erro: ${error.message}` };
      }
    }, process.env.RIDES_LOGIN!, process.env.RIDES_PASSWORD!);
    
    if (!loginResult.success) {
      await browser.close();
      return loginResult;
    }
    
    console.log('Aguardando redirecionamento após login direto...');
    await page.waitForTimeout(10000);
    
    const finalUrl = page.url();
    const finalTitle = await page.title();
    
    await browser.close();
    
    const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
    
    return {
      success: loginSuccess,
      message: `Login direto ${loginSuccess ? 'bem-sucedido' : 'falhou'}! URL final: ${finalUrl}, Título: ${finalTitle}`
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
