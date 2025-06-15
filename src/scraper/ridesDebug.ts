import { chromium } from 'playwright';

export async function debugRidesLogin(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando browser para debug...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Interceptar requisições de rede
    const requests: any[] = [];
    page.on('request', request => {
      if (request.method() === 'POST') {
        requests.push({
          url: request.url(),
          method: request.method(),
          postData: request.postData(),
          headers: request.headers()
        });
      }
    });
    
    console.log('Navegando para:', process.env.RIDES_URL);
    await page.goto(process.env.RIDES_URL!, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(2000);
    
    // Verificar se há campos ocultos ou tokens CSRF
    const hiddenInputs = await page.$$eval('input[type="hidden"]', inputs => 
      inputs.map(input => ({
        name: input.name,
        value: input.value,
        id: input.id
      }))
    );
    
    console.log('Campos ocultos encontrados:', hiddenInputs);
    
    // Verificar os valores dos campos antes do preenchimento
    const emailValue = await page.inputValue('#exampleInputEmail1');
    const passwordValue = await page.inputValue('#exampleInputPassword1');
    
    console.log('Valores iniciais - Email:', emailValue, 'Password:', passwordValue);
    
    // Limpar campos primeiro
    await page.fill('#exampleInputEmail1', '');
    await page.fill('#exampleInputPassword1', '');
    
    await page.waitForTimeout(500);
    
    // Preencher letra por letra para simular digitação humana
    console.log('Digitando email...');
    await page.type('#exampleInputEmail1', process.env.RIDES_LOGIN!, { delay: 100 });
    
    console.log('Digitando senha...');
    await page.type('#exampleInputPassword1', process.env.RIDES_PASSWORD!, { delay: 100 });
    
    await page.waitForTimeout(1000);
    
    // Verificar os valores após preenchimento
    const emailAfter = await page.inputValue('#exampleInputEmail1');
    const passwordAfter = await page.inputValue('#exampleInputPassword1');
    
    console.log('Valores após preenchimento - Email:', emailAfter, 'Password length:', passwordAfter.length);
    
    // Verificar se há formulário e seus atributos
    const form = await page.$('form');
    let formAction = '';
    let formMethod = '';
    
    if (form) {
      formAction = await form.getAttribute('action') || '';
      formMethod = await form.getAttribute('method') || '';
      console.log('Form action:', formAction, 'method:', formMethod);
    }
    
    // Procurar botão de login
    const buttons = await page.$$eval('button', buttons => 
      buttons.map(button => ({
        text: button.textContent?.trim(),
        type: button.type,
        className: button.className,
        disabled: button.disabled
      }))
    );
    
    console.log('Botões encontrados:', buttons);
    
    // Tentar submit do formulário diretamente
    console.log('Fazendo submit do formulário...');
    if (form) {
      await form.evaluate(form => (form as HTMLFormElement).submit());
    } else {
      // Se não houver formulário, tentar clicar no botão
      const loginButton = await page.$('button[type="submit"], .btn-primary, button:has-text("Login")');
      if (loginButton) {
        await loginButton.click();
      }
    }
    
    console.log('Aguardando resposta...');
    await page.waitForTimeout(5000);
    
    const finalUrl = page.url();
    
    // Verificar se há mensagens de erro na página
    const errorMessages = await page.$$eval('.alert, .error, .alert-danger, [class*="error"]', elements => 
      elements.map(el => el.textContent?.trim())
    );
    
    await browser.close();
    
    return {
      success: true,
      message: `Debug completo:
        URL final: ${finalUrl}
        Credenciais enviadas: ${emailAfter} / senha com ${passwordAfter.length} caracteres
        Campos ocultos: ${JSON.stringify(hiddenInputs)}
        Requisições POST: ${JSON.stringify(requests, null, 2)}
        Mensagens de erro: ${JSON.stringify(errorMessages)}
        Form action: ${formAction}, method: ${formMethod}
        Botões: ${JSON.stringify(buttons)}`
    };
    
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }
    return {
      success: false,
      message: `Erro durante debug: ${error.message}`
    };
  }
}
