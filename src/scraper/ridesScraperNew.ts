import { chromium } from 'playwright';
import { TableData } from '../types/common';

export async function testRidesLogin(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando browser...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    console.log('Navegando para:', process.env.RIDES_LOGIN_URL);
    await page.goto(process.env.RIDES_LOGIN_URL!, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    const title = await page.title();
    const url = page.url();
    
    console.log('Título:', title);
    console.log('URL:', url);
    
    // Usar os seletores que encontramos
    const emailField = await page.$('#exampleInputEmail1');
    const passwordField = await page.$('#exampleInputPassword1');
    
    if (!emailField || !passwordField) {
      await browser.close();
      return {
        success: false,
        message: `Campos de login não encontrados. URL: ${url}`
      };
    }
    
    console.log('Preenchendo credenciais...');
    await emailField.fill(process.env.RIDES_LOGIN!);
    await passwordField.fill(process.env.RIDES_PASSWORD!);
    
    // Procurar botão de submit
    const submitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar"), button:has-text("Sign"), .btn-primary');
    
    if (!submitButton) {
      await browser.close();
      return {
        success: false,
        message: 'Botão de login não encontrado'
      };
    }
    
    console.log('Fazendo login...');
    await submitButton.click();
    
    // Aguardar navegação
    await page.waitForNavigation({ timeout: 10000 });
    
    const newUrl = page.url();
    const newTitle = await page.title();
    
    await browser.close();
    
    return {
      success: true,
      message: `Login realizado com sucesso! Nova URL: ${newUrl}, Título: ${newTitle}`
    };
    
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }
    return {
      success: false,
      message: `Erro durante teste: ${error.message}`
    };
  }
}

export async function scrapeRidesData(): Promise<{ success: boolean; data: TableData[]; message: string }> {
  let browser;
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Fazer login primeiro
    await page.goto(process.env.RIDES_LOGIN_URL!, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Login
    await page.fill('#exampleInputEmail1', process.env.RIDES_LOGIN!);
    await page.fill('#exampleInputPassword1', process.env.RIDES_PASSWORD!);
    
    const submitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar"), button:has-text("Sign"), .btn-primary');
    if (submitButton) {
      await submitButton.click();
      await page.waitForNavigation({ timeout: 10000 });
    }
    
    // Agora extrair dados das tabelas
    const tables = await page.$$('table');
    const tableData: TableData[] = [];
    
    for (let i = 0; i < tables.length; i++) {
      const table = tables[i];
      
      // Extrair cabeçalhos
      const headers = await table.$$eval('thead th, tr:first-child th, tr:first-child td', cells => 
        cells.map(cell => cell.textContent?.trim() || '')
      );
      
      // Extrair linhas de dados
      const rows = await table.$$eval('tbody tr, tr:not(:first-child)', rows => 
        rows.map(row => {
          const cells = row.querySelectorAll('td, th');
          return Array.from(cells).map(cell => cell.textContent?.trim() || '');
        })
      );
      
      if (headers.length > 0 || rows.length > 0) {
        tableData.push({
          id: `table-${i + 1}`,
          headers: headers,
          rows: rows,
          title: `Tabela ${i + 1}`,
          isEmpty: rows.length === 0
        });
      }
    }
    
    await browser.close();
    
    return {
      success: true,
      data: tableData,
      message: `${tableData.length} tabelas extraídas com sucesso`
    };
    
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }
    return {
      success: false,
      data: [],
      message: `Erro durante scraping: ${error.message}`
    };
  }
}

export async function previewRidesTables(): Promise<{ success: boolean; message: string }> {
  let browser;
  
  try {
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // Fazer login primeiro
    await page.goto(process.env.RIDES_LOGIN_URL!, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Login
    await page.fill('#exampleInputEmail1', process.env.RIDES_LOGIN!);
    await page.fill('#exampleInputPassword1', process.env.RIDES_PASSWORD!);
    
    const submitButton = await page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar"), button:has-text("Sign"), .btn-primary');
    if (submitButton) {
      await submitButton.click();
      await page.waitForNavigation({ timeout: 10000 });
    }
    
    // Contar tabelas
    const tableCount = await page.$$eval('table', tables => tables.length);
    
    // Obter informações básicas das tabelas
    const tableInfo = await page.$$eval('table', tables => 
      tables.map((table, index) => {
        const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th, tr:first-child td'))
          .map(cell => cell.textContent?.trim() || '');
        const rowCount = table.querySelectorAll('tbody tr, tr:not(:first-child)').length;
        
        return {
          index: index + 1,
          headers: headers,
          rowCount: rowCount,
          isEmpty: rowCount === 0
        };
      })
    );
    
    await browser.close();
    
    return {
      success: true,
      message: `${tableCount} tabelas encontradas. Detalhes: ${JSON.stringify(tableInfo, null, 2)}`
    };
    
  } catch (error: any) {
    if (browser) {
      await browser.close();
    }
    return {
      success: false,
      message: `Erro durante preview: ${error.message}`
    };
  }
}
