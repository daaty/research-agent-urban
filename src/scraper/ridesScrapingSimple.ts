import { chromium } from 'playwright';

export interface RideTableData {
  name: string;
  url: string;
  headers: string[];
  rows: string[][];
  isEmpty: boolean;
}

export async function scrapeAllRidesData(): Promise<{ success: boolean; data: RideTableData[]; message: string }> {
  let browser;
  
  try {
    console.log('Iniciando browser para scraping completo...');
    browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // PASSO 1: LOGIN (código que já funciona)
    console.log('Fazendo login...');
    await page.goto('https://rides.ec2dashboard.com/#/page/login', { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
    
    await page.waitForTimeout(3000);
    
    // Preencher credenciais
    await page.fill('#exampleInputEmail1', 'herbert@urbandobrasil.com.br');
    await page.fill('#exampleInputPassword1', 'herbert@urban25');
    
    // Fazer login
    await page.press('#exampleInputPassword1', 'Enter');
    await page.waitForTimeout(8000);
    
    // Verificar se login foi bem-sucedido
    const currentUrl = page.url();
    if (currentUrl.includes('login')) {
      await browser.close();
      return {
        success: false,
        data: [],
        message: 'Falha no login - ainda na página de login'
      };
    }
    
    console.log('Login bem-sucedido! Iniciando extração das abas...');
    
    // PASSO 2: NAVEGAR E EXTRAIR DADOS DE CADA ABA
    const ridesPages = [
      { name: 'Ongoing Rides', url: 'https://rides.ec2dashboard.com/#/app/ongoing-rides/' },
      { name: 'Scheduled Rides', url: 'https://rides.ec2dashboard.com/#/app/scheduled-rides/' },
      { name: 'Completed Rides', url: 'https://rides.ec2dashboard.com/#/app/completed-rides/' },
      { name: 'Cancelled Rides', url: 'https://rides.ec2dashboard.com/#/app/cancelled-rides/4/' },
      { name: 'Missed Rides', url: 'https://rides.ec2dashboard.com/#/app/missed-rides/3/' }
    ];
    
    const allData: RideTableData[] = [];
    
    for (const ridePage of ridesPages) {
      console.log(`Navegando para: ${ridePage.name}...`);
      
      try {
        await page.goto(ridePage.url, { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        // Aguardar tabela carregar
        await page.waitForTimeout(5000);
        
        // Tentar encontrar a tabela
        const tableExists = await page.$('table.t-fancy-table');
        
        if (!tableExists) {
          console.log(`Nenhuma tabela encontrada em ${ridePage.name}`);
          allData.push({
            name: ridePage.name,
            url: ridePage.url,
            headers: [],
            rows: [],
            isEmpty: true
          });
          continue;
        }
        
        // Extrair headers
        const headers = await page.$$eval('table.t-fancy-table thead th', ths => 
          ths.map(th => th.textContent?.trim() || '')
        );
        
        // Verificar se há dados na tabela
        const noDataMessage = await page.$('td.dataTables_empty');
        
        if (noDataMessage) {
          console.log(`${ridePage.name}: Tabela vazia (sem dados)`);
          allData.push({
            name: ridePage.name,
            url: ridePage.url,
            headers: headers,
            rows: [],
            isEmpty: true
          });
          continue;
        }
        
        // Extrair dados das linhas
        const rows = await page.$$eval('table.t-fancy-table tbody tr:not(.odd):not(.even)', trs => 
          trs.map(tr => {
            const tds = tr.querySelectorAll('td');
            return Array.from(tds).map(td => td.textContent?.trim() || '');
          })
        );
        
        // Se não encontrou linhas com o seletor anterior, tentar outro
        let finalRows = rows;
        if (rows.length === 0) {
          finalRows = await page.$$eval('table.t-fancy-table tbody tr', trs => 
            trs.map(tr => {
              const tds = tr.querySelectorAll('td');
              return Array.from(tds).map(td => td.textContent?.trim() || '');
            })
          );
        }
        
        console.log(`${ridePage.name}: Encontrados ${finalRows.length} registros`);
        
        allData.push({
          name: ridePage.name,
          url: ridePage.url,
          headers: headers,
          rows: finalRows,
          isEmpty: finalRows.length === 0
        });
        
      } catch (error: any) {
        console.error(`Erro ao processar ${ridePage.name}:`, error.message);
        allData.push({
          name: ridePage.name,
          url: ridePage.url,
          headers: [],
          rows: [],
          isEmpty: true
        });
      }
    }
    
    await browser.close();
    
    const totalRecords = allData.reduce((sum, table) => sum + table.rows.length, 0);
    
    return {
      success: true,
      data: allData,
      message: `Scraping concluído! ${allData.length} abas processadas, ${totalRecords} registros extraídos.`
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
