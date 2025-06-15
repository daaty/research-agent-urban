import { chromium } from 'playwright';

export async function testWithSearchButton(): Promise<any> {
  let browser;
  
  try {
    const email = process.env.RIDES_EMAIL || '';
    const password = process.env.RIDES_PASSWORD || '';
    const headless = process.env.HEADLESS_MODE === 'true';
    
    console.log('🚀 TESTE COM BOTÃO DE PROCURAR');
    console.log('📧 Email:', email);
    console.log('🔧 Headless:', headless);
    
    browser = await chromium.launch({
      headless: headless,
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox', 
        '--disable-dev-shm-usage',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor'
      ]
    });
    
    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1366, height: 768 },
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo'
    });
    
    const page = await context.newPage();
    
    // 1. LOGIN
    console.log('🔐 Fazendo login...');
    await page.goto('https://rides.ec2dashboard.com/#/page/login', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForTimeout(3000);
    
    await page.fill('#exampleInputEmail1', email);
    await page.fill('#exampleInputPassword1', password);
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(8000);
    const currentUrl = page.url();
    console.log('🌐 URL após login:', currentUrl);
    
    if (currentUrl.includes('login')) {
      throw new Error('LOGIN FALHOU!');
    }
    
    console.log('✅ LOGIN SUCESSO!');
    
    // 2. IR PARA CANCELLED RIDES
    console.log('🔍 Navegando para CANCELLED RIDES...');
    await page.goto('https://rides.ec2dashboard.com/#/app/cancelled-rides/4/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Aguardar AngularJS carregar
    await page.waitForTimeout(5000);
    
    // 3. CLICAR NO BOTÃO DE PROCURAR - ESSA É A CHAVE!
    console.log('🎯 PROCURANDO BOTÃO DE PROCURAR...');
    
    // Primeiro, vamos procurar todos os botões e ver quais existem
    const allButtons = await page.$$('button');
    console.log(`🔍 Total de botões na página: ${allButtons.length}`);
    
    let targetButton = null;
    let buttonFound = false;
    
    // Procurar o botão específico de várias formas
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const ngClick = await button.getAttribute('ng-click');
      const text = await button.textContent();
      const className = await button.getAttribute('class');
      
      console.log(`🔘 Botão ${i + 1}: "${text?.trim()}" - ng-click: ${ngClick} - class: ${className}`);
      
      // Procurar pelo botão que tem getRidesData
      if (ngClick && ngClick.includes('getRidesData')) {
        console.log('🎯 BOTÃO TARGET ENCONTRADO!');
        targetButton = button;
        buttonFound = true;
        break;
      }
      
      // Ou procurar por texto "Procurar" ou "Search"
      if (text && (text.includes('Procurar') || text.includes('Search'))) {
        console.log('🎯 BOTÃO DE BUSCA ENCONTRADO POR TEXTO!');
        if (!targetButton) { // Só usar se não achou o específico
          targetButton = button;
        }
      }
    }
    
    if (targetButton) {
      console.log('✅ BOTÃO ENCONTRADO! Verificando visibilidade...');
      
      const isVisible = await targetButton.isVisible();
      const isEnabled = await targetButton.isEnabled();
      console.log('👀 Botão visível?', isVisible);
      console.log('🔄 Botão habilitado?', isEnabled);
      
      if (isVisible && isEnabled) {
        console.log('🎯 CLICANDO NO BOTÃO...');
        
        try {
          // Scroll para o botão para garantir que está visível
          await targetButton.scrollIntoViewIfNeeded();
          await page.waitForTimeout(1000);
          
          // Clicar no botão
          await targetButton.click();
          console.log('✅ BOTÃO CLICADO COM SUCESSO!');
          
          // Aguardar os dados carregarem após o clique
          console.log('⏳ Aguardando dados carregarem após clique...');
          await page.waitForTimeout(5000);
          
          // Aguardar até os dados aparecerem OU 30 segundos
          let dataFound = false;
          for (let i = 0; i < 30; i++) {
            const hasData = await page.evaluate(() => {
              const tbody = document.querySelector('#ridesTable tbody');
              if (!tbody) return false;
              
              const emptyMessage = tbody.querySelector('td.dataTables_empty');
              if (emptyMessage) return false;
              
              const dataRows = tbody.querySelectorAll('tr:not(:has(.dataTables_empty))');
              return dataRows.length > 0;
            });
            
            if (hasData) {
              console.log(`🎉 DADOS ENCONTRADOS após ${i} segundos do clique!`);
              dataFound = true;
              break;
            }
            
            if (i % 5 === 0 && i > 0) {
              console.log(`⏳ ${i}/30s aguardando dados após clique...`);
            }
            
            await page.waitForTimeout(1000);
          }
          
          if (!dataFound) {
            console.log('⚠️ Timeout: dados não apareceram após 30s do clique');
          }
          
        } catch (clickError) {
          console.log('❌ Erro ao clicar no botão:', clickError);
        }
        
      } else {
        console.log('❌ Botão não está visível ou habilitado');
      }
    } else {
      console.log('❌ NENHUM BOTÃO DE PROCURAR ENCONTRADO!');
    }
    
    // 4. VERIFICAR RESULTADO FINAL
    console.log('🐛 === VERIFICAÇÃO FINAL ===');
    
    const finalCheck = await page.evaluate(() => {
      const tbody = document.querySelector('#ridesTable tbody');
      if (!tbody) return { error: 'tbody não encontrado' };
      
      const emptyMessage = tbody.querySelector('td.dataTables_empty');
      const allRows = tbody.querySelectorAll('tr');
      const dataRows = tbody.querySelectorAll('tr:not(:has(.dataTables_empty))');
      
      return {
        hasEmptyMessage: !!emptyMessage,
        totalRows: allRows.length,
        dataRows: dataRows.length,
        emptyText: emptyMessage ? emptyMessage.textContent?.trim() : null,
        tbodyHTML: tbody.innerHTML.substring(0, 1000)
      };
    });
    
    console.log('📋 Verificação final:', JSON.stringify(finalCheck, null, 2));
    
    // Se temos dados, vamos extrair
    if (finalCheck.dataRows > 0) {
      console.log('🎉 DADOS ENCONTRADOS! Extraindo...');
      
      const extractedData = await page.evaluate(() => {
        const tbody = document.querySelector('#ridesTable tbody');
        if (!tbody) return [];
        
        const dataRows = tbody.querySelectorAll('tr:not(:has(.dataTables_empty))');
        return Array.from(dataRows).map((row, index) => {
          const cells = Array.from(row.querySelectorAll('td'));
          return {
            index: index + 1,
            cells: cells.map(cell => cell.textContent?.trim() || ''),
            rowHTML: row.innerHTML.substring(0, 500)
          };
        });
      });
      
      console.log('📊 Dados extraídos:', JSON.stringify(extractedData, null, 2));
      
      return {
        success: true,
        dataFound: true,
        dataCount: extractedData.length,
        data: extractedData,
        message: 'Dados extraídos com sucesso!'
      };
    }
    
    return {
      success: true,
      dataFound: false,
      finalCheck,
      message: 'Teste concluído, mas sem dados encontrados'
    };
    
  } catch (error: any) {
    console.error('❌ ERRO:', error.message);
    return {
      success: false,
      error: error.message
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
