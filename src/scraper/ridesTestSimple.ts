import { chromium } from 'playwright';

export async function testRidesSimple(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando browser...');
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
    
    const title = await page.title();
    const url = page.url();
    
    console.log('Título:', title);
    console.log('URL:', url);
    
    // Verificar se há inputs na página
    const inputs = await page.$$eval('input', inputs => 
      inputs.map(input => ({
        type: input.type,
        name: input.name || '',
        id: input.id || '',
        placeholder: input.placeholder || '',
        className: input.className || ''
      }))
    );
    
    await browser.close();
    
    return {
      success: true,
      message: `Página carregada! Título: ${title}, URL: ${url}, Inputs encontrados: ${inputs.length}. Detalhes: ${JSON.stringify(inputs, null, 2)}`
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
