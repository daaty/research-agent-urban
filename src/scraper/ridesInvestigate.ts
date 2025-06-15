import { chromium } from 'playwright';

export async function investigateRidesForm(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando investigação do formulário...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    console.log('Navegando para a página de login...');
    await page.goto(process.env.RIDES_URL!, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    await page.waitForTimeout(5000);
    
    // Capturar TODOS os elementos do formulário
    const formData = await page.evaluate(() => {
      const forms = Array.from(document.querySelectorAll('form'));
      const allInputs = Array.from(document.querySelectorAll('input'));
      const allButtons = Array.from(document.querySelectorAll('button'));
      
      return {
        forms: forms.map(form => ({
          id: form.id,
          className: form.className,
          action: form.action,
          method: form.method,
          outerHTML: form.outerHTML.substring(0, 500)
        })),
        inputs: allInputs.map(input => ({
          type: input.type,
          name: input.name,
          id: input.id,
          value: input.value,
          placeholder: input.placeholder,
          required: input.required,
          className: input.className,
          style: input.style.cssText
        })),
        buttons: allButtons.map(button => ({
          type: button.type,
          textContent: button.textContent?.trim(),
          className: button.className,
          id: button.id,
          onclick: button.onclick?.toString() || null
        }))
      };
    });
    
    // Verificar se há scripts relacionados a login
    const scripts = await page.evaluate(() => {
      const scriptTags = Array.from(document.querySelectorAll('script'));
      return scriptTags
        .map(script => script.textContent || script.src)
        .filter(content => content && (
          content.includes('login') || 
          content.includes('password') || 
          content.includes('auth') ||
          content.includes('submit')
        ))
        .map(content => content.substring(0, 200));
    });
    
    await browser.close();
    
    return {
      success: true,
      message: JSON.stringify({
        forms: formData.forms,
        inputs: formData.inputs,
        buttons: formData.buttons,
        relevantScripts: scripts
      }, null, 2)
    };
    
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }
    return {
      success: false,
      message: `Erro durante investigação: ${error.message}`
    };
  }
}
