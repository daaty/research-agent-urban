import { chromium } from 'playwright';

export async function debugRidesLogin(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando browser para debug do login...');
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
    
    // Verificar todos os elementos da página antes do login
    console.log('=== ANÁLISE DA PÁGINA DE LOGIN ===');
    
    // Verificar se há campos ocultos
    const hiddenInputs = await page.$$eval('input[type="hidden"]', inputs => 
      inputs.map(input => ({
        name: input.name,
        value: input.value,
        id: input.id
      }))
    );
    console.log('Campos ocultos encontrados:', hiddenInputs);
    
    // Verificar todos os inputs
    const allInputs = await page.$$eval('input', inputs => 
      inputs.map(input => ({
        type: input.type,
        name: input.name || '',
        id: input.id || '',
        placeholder: input.placeholder || '',
        value: input.value || '',
        required: input.required
      }))
    );
    console.log('Todos os inputs:', allInputs);
    
    // Verificar se há formulários
    const forms = await page.$$eval('form', forms => 
      forms.map(form => ({
        action: form.action,
        method: form.method,
        id: form.id || '',
        className: form.className || ''
      }))
    );
    console.log('Formulários encontrados:', forms);
    
    // Preencher os campos devagar
    console.log('Preenchendo email devagar...');
    await page.click('#exampleInputEmail1');
    await page.fill('#exampleInputEmail1', '');
    await page.type('#exampleInputEmail1', process.env.RIDES_LOGIN!, { delay: 100 });
    
    console.log('Preenchendo senha devagar...');
    await page.click('#exampleInputPassword1');
    await page.fill('#exampleInputPassword1', '');
    await page.type('#exampleInputPassword1', process.env.RIDES_PASSWORD!, { delay: 100 });
    
    await page.waitForTimeout(2000);
    
    // Verificar valores preenchidos
    const emailValue = await page.inputValue('#exampleInputEmail1');
    const passwordValue = await page.inputValue('#exampleInputPassword1');
    console.log('Email preenchido:', emailValue);
    console.log('Senha preenchida:', '[HIDDEN]', passwordValue.length, 'caracteres');
    
    // Procurar todos os botões
    const allButtons = await page.$$eval('button, input[type="submit"]', buttons => 
      buttons.map(button => ({
        text: button.textContent?.trim(),
        type: button.type,
        className: button.className,
        id: button.id || '',
        disabled: button.disabled
      }))
    );
    console.log('Todos os botões:', allButtons);
    
    // Tentar encontrar o botão de login de forma mais específica
    const loginButton = await page.$('button[type="submit"]') || 
                        await page.$('input[type="submit"]') ||
                        await page.$('button:has-text("Login")') ||
                        await page.$('button:has-text("Entrar")') ||
                        await page.$('.btn-primary') ||
                        await page.$('button');
    
    if (!loginButton) {
      await browser.close();
      return {
        success: false,
        message: `Nenhum botão encontrado. Análise completa: Inputs: ${JSON.stringify(allInputs, null, 2)}, Botões: ${JSON.stringify(allButtons, null, 2)}`
      };
    }
    
    console.log('Clicando no botão de login...');
    await loginButton.click();
    
    // Aguardar um pouco e verificar se apareceu algum erro
    await page.waitForTimeout(3000);
    
    // Procurar por mensagens de erro
    const errorSelectors = [
      '.alert-danger',
      '.error',
      '.invalid-feedback',
      '[class*="error"]',
      '[class*="danger"]',
      '.text-danger'
    ];
    
    let errorMessage = '';
    for (const selector of errorSelectors) {
      try {
        const errorElement = await page.$(selector);
        if (errorElement) {
          errorMessage = await errorElement.textContent() || '';
          if (errorMessage.trim()) {
            console.log('Erro encontrado com seletor', selector, ':', errorMessage);
            break;
          }
        }
      } catch (e) {
        // Ignorar erros de seletor
      }
    }
    
    // Se não encontrou erro específico, procurar qualquer texto de erro na página
    if (!errorMessage) {
      const pageText = await page.textContent('body');
      const errorKeywords = ['incorrect', 'invalid', 'wrong', 'error', 'fail', 'erro', 'inválido', 'incorreto'];
      for (const keyword of errorKeywords) {
        if (pageText?.toLowerCase().includes(keyword.toLowerCase())) {
          const sentences = pageText.split(/[.!?]+/);
          const errorSentence = sentences.find(s => s.toLowerCase().includes(keyword.toLowerCase()));
          if (errorSentence) {
            errorMessage = errorSentence.trim();
            break;
          }
        }
      }
    }
    
    const finalUrl = page.url();
    const finalTitle = await page.title();
    
    await browser.close();
    
    const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
    
    return {
      success: loginSuccess,
      message: `Debug completo - Login ${loginSuccess ? 'bem-sucedido' : 'falhou'}! URL final: ${finalUrl}, Título: ${finalTitle}, ${errorMessage ? 'Erro: ' + errorMessage : 'Sem erros visíveis'}, Credenciais testadas: ${emailValue} / [senha com ${passwordValue.length} caracteres]`
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
