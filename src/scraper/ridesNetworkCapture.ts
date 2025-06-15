import { chromium } from 'playwright';

export async function captureNetworkRequests(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando captura de rede...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Capturar todas as requisições de rede
    const requests: any[] = [];
    page.on('request', request => {
      if (request.url().includes('login') || request.method() === 'POST') {
        requests.push({
          url: request.url(),
          method: request.method(),
          headers: request.headers(),
          postData: request.postData()
        });
      }
    });
    
    console.log('Navegando para:', process.env.RIDES_URL);
    await page.goto(process.env.RIDES_URL!, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Preencher e submeter o formulário
    await page.fill('#exampleInputEmail1', process.env.RIDES_LOGIN!);
    await page.fill('#exampleInputPassword1', process.env.RIDES_PASSWORD!);
    
    await page.waitForTimeout(1000);
    
    // Clicar no botão de login
    await page.click('#loginButton');
    
    // Aguardar requisições
    await page.waitForTimeout(5000);
    
    await browser.close();
    
    return {
      success: true,
      message: `Requisições capturadas: ${JSON.stringify(requests, null, 2)}`
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
