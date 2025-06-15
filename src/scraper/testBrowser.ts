import { chromium } from 'playwright';

export async function testBrowserSimple(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Iniciando teste simples do browser...');
    
    const browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-extensions',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    });
    
    console.log('Browser lançado com sucesso!');
    
    const page = await browser.newPage();
    console.log('Nova página criada!');
    
    // Testar com Google
    await page.goto('https://www.google.com', { 
      waitUntil: 'load',
      timeout: 30000 
    });
    
    const title = await page.title();
    const url = page.url();
    
    console.log('Página carregada - Título:', title);
    
    await browser.close();
    
    return {
      success: true,
      message: `Browser funcionando! Título: ${title}, URL: ${url}`
    };
    
  } catch (error: any) {
    console.error('Erro no teste do browser:', error);
    return {
      success: false,
      message: error.message
    };
  }
}
