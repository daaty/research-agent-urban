import { chromium } from 'playwright';
import { TableData } from '../types/common';

export async function testRidesLogin(): Promise<{ success: boolean; message: string }> {
  let browser;
  try {
    console.log('Iniciando browser em modo headless...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    console.log('Navegando para a página de login...');
    await page.goto(process.env.RIDES_LOGIN_URL!, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    
    // Aguardar a página carregar
    console.log('Aguardando página carregar...');
    await page.waitForTimeout(3000);
    
    // Verificar se estamos na página de login
    const currentUrl = page.url();
    console.log('URL atual:', currentUrl);
    
    // Capturar o título da página para debug
    const pageTitle = await page.title();
    console.log('Título da página:', pageTitle);
    
    // Procurar pelos campos específicos que encontramos
    console.log('Procurando campos de login...');
    const emailField = await page.$('#exampleInputEmail1');
    const passwordField = await page.$('#exampleInputPassword1');
    
    if (!emailField || !passwordField) {
      // Capturar conteúdo da página para debug
      const bodyHTML = await page.content();
      const bodyText = await page.textContent('body');
      
      return {
        success: false,
        message: `Campos de login não encontrados. URL: ${currentUrl}. 
                 HTML da página (primeiros 1000 chars): ${bodyHTML.substring(0, 1000)}...
                 Texto da página: ${bodyText?.substring(0, 500)}...`
      };
    }
    
    console.log('Campos encontrados! Preenchendo credenciais...');
    await emailField.fill(process.env.RIDES_LOGIN!);
    await passwordField.fill(process.env.RIDES_PASSWORD!);
    
    // Procurar botão de submit por diferentes seletores
    const submitSelectors = [
      'button[type="submit"]',
      'input[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("Entrar")',
      'button:has-text("Sign In")',
      '.login-button',
      '.btn-login',
      '[data-testid="login-button"]'
    ];
    
    let submitButton = null;
    for (const selector of submitSelectors) {
      try {
        submitButton = await page.$(selector);
        if (submitButton) {
          console.log('Botão de login encontrado com seletor:', selector);
          break;
        }
      } catch (e) {
        continue;
      }
    }
    
    if (!submitButton) {
      return {
        success: false,
        message: 'Botão de login não encontrado'
      };
    }
    
    console.log('Fazendo login...');
    await submitButton.click();
    
    // Aguardar redirecionamento ou resposta
    await page.waitForTimeout(5000);
    
    const newUrl = page.url();
    console.log('URL após login:', newUrl);
    
    // Verificar se o login foi bem-sucedido
    if (newUrl !== currentUrl || newUrl.includes('dashboard') || newUrl.includes('home')) {
      return {
        success: true,
        message: `Login realizado com sucesso! Redirecionado para: ${newUrl}`
      };
    } else {
      // Verificar se há mensagens de erro na página
      const errorMessages = await page.$$eval('[class*="error"], [class*="alert"], .alert-danger, .error-message', 
        elements => elements.map(el => el.textContent?.trim()).filter(text => text)
      );
      
      return {
        success: false,
        message: `Login pode ter falhado. URL não mudou: ${newUrl}. Erros encontrados: ${errorMessages.join(', ')}`
      };
    }
    
  } catch (error: any) {
    console.error('Erro durante teste de login:', error);
    return {
      success: false,
      message: `Erro durante teste: ${error.message}`
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function scrapeRidesTables(): Promise<TableData[]> {
  let browser;
  try {
    console.log('Iniciando scraping das tabelas...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    // Fazer login primeiro
    await page.goto(process.env.RIDES_URL!, { waitUntil: 'networkidle' });
    
    // Preencher e submeter formulário de login (similar ao testRidesLogin)
    // ... código de login ...
    
    // Após login bem-sucedido, navegar para páginas com tabelas
    const tables: TableData[] = [];
    
    // Lista de URLs ou seletores onde as tabelas podem estar
    const tablePages = [
      '/dashboard',
      '/reports',
      '/data',
      '/tables',
      '/rides'
    ];
    
    for (const pagePath of tablePages) {
      try {
        const fullUrl = process.env.RIDES_URL!.replace(/\/$/, '') + pagePath;
        await page.goto(fullUrl, { waitUntil: 'networkidle' });
        
        // Procurar tabelas na página
        const tablesOnPage = await page.$$('table');
        
        for (let i = 0; i < tablesOnPage.length; i++) {
          const table = tablesOnPage[i];
          
          // Extrair dados da tabela
          const headers = await table.$$eval('thead tr th, tr:first-child td', 
            cells => cells.map(cell => cell.textContent?.trim() || '')
          );
          
          const rows = await table.$$eval('tbody tr, tr:not(:first-child)', 
            (rows) => rows.map(row => 
              Array.from(row.querySelectorAll('td')).map(cell => cell.textContent?.trim() || '')
            )
          );
          
          if (headers.length > 0 || rows.length > 0) {
            tables.push({
              name: `Tabela_${pagePath.replace('/', '')}_${i + 1}`,
              headers,
              rows,
              source: fullUrl
            });
          }
        }
      } catch (error) {
        console.log(`Erro ao processar página ${pagePath}:`, error);
        // Continuar com próxima página
      }
    }
    
    return tables;
    
  } catch (error: any) {
    console.error('Erro durante scraping:', error);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

export async function previewRidesTables(): Promise<{ success: boolean; message: string; preview?: any }> {
  let browser;
  try {
    console.log('Fazendo preview das tabelas...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    
    const page = await browser.newPage();
    
    await page.goto(process.env.RIDES_URL!, { waitUntil: 'networkidle' });
    
    // Capturar informações estruturais da página
    const pageInfo = {
      title: await page.title(),
      url: page.url(),
      forms: await page.$$eval('form', forms => forms.length),
      tables: await page.$$eval('table', tables => tables.length),
      inputs: await page.$$eval('input', inputs => 
        inputs.map(input => ({
          type: input.type,
          name: input.name,
          placeholder: input.placeholder,
          id: input.id
        }))
      )
    };
    
    return {
      success: true,
      message: 'Preview realizado com sucesso',
      preview: pageInfo
    };
    
  } catch (error: any) {
    return {
      success: false,
      message: `Erro durante preview: ${error.message}`
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
