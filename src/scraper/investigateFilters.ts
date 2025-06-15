import { chromium } from 'playwright';

export async function investigateFilters(): Promise<any> {
  let browser;
  
  try {
    const email = process.env.RIDES_EMAIL || '';
    const password = process.env.RIDES_PASSWORD || '';
    const headless = process.env.HEADLESS_MODE === 'true';
    
    console.log('🔍 INVESTIGANDO FILTROS E BOTÕES');
    
    browser = await chromium.launch({
      headless: headless,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    
    // LOGIN
    console.log('🔐 Fazendo login...');
    await page.goto('https://rides.ec2dashboard.com/#/page/login');
    await page.waitForTimeout(3000);
    
    await page.fill('#exampleInputEmail1', email);
    await page.fill('#exampleInputPassword1', password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(5000);
    
    // NAVEGAR
    await page.goto('https://rides.ec2dashboard.com/#/app/cancelled-rides/4/', { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    await page.waitForTimeout(5000);
    
    console.log('🔍 === INVESTIGANDO BOTÕES DE FILTRO ===');
    
    // Procurar todos os botões
    const allButtons = await page.$$('button');
    console.log(`🔘 Total de botões encontrados: ${allButtons.length}`);
    
    for (let i = 0; i < allButtons.length; i++) {
      const button = allButtons[i];
      const text = await button.textContent();
      const className = await button.getAttribute('class');
      const id = await button.getAttribute('id');
      const type = await button.getAttribute('type');
      const ngClick = await button.getAttribute('ng-click');
      
      if (text && (
        text.toLowerCase().includes('filter') ||
        text.toLowerCase().includes('search') ||
        text.toLowerCase().includes('apply') ||
        text.toLowerCase().includes('load') ||
        text.toLowerCase().includes('buscar') ||
        text.toLowerCase().includes('filtrar')
      )) {
        console.log(`🎯 BOTÃO INTERESSANTE ${i + 1}:`, {
          text: text.trim(),
          className,
          id,
          type,
          ngClick
        });
      }
    }
    
    console.log('🔍 === INVESTIGANDO INPUTS DE DATA ===');
    
    // Procurar todos os inputs
    const allInputs = await page.$$('input');
    console.log(`📝 Total de inputs encontrados: ${allInputs.length}`);
    
    for (let i = 0; i < allInputs.length; i++) {
      const input = allInputs[i];
      const type = await input.getAttribute('type');
      const placeholder = await input.getAttribute('placeholder');
      const className = await input.getAttribute('class');
      const id = await input.getAttribute('id');
      const ngModel = await input.getAttribute('ng-model');
      const value = await input.inputValue();
      
      if (type === 'date' || type === 'datetime-local' || 
          (placeholder && (placeholder.toLowerCase().includes('date') || placeholder.toLowerCase().includes('data'))) ||
          (className && (className.includes('date') || className.includes('picker'))) ||
          (id && (id.includes('date') || id.includes('Date')))) {
        
        console.log(`📅 INPUT DE DATA ${i + 1}:`, {
          type,
          placeholder,
          className,
          id,
          ngModel,
          value
        });
      }
    }
    
    console.log('🔍 === INVESTIGANDO DROPDOWNS/SELECTS ===');
    
    const allSelects = await page.$$('select');
    console.log(`📋 Total de selects encontrados: ${allSelects.length}`);
    
    for (let i = 0; i < allSelects.length; i++) {
      const select = allSelects[i];
      const id = await select.getAttribute('id');
      const className = await select.getAttribute('class');
      const ngModel = await select.getAttribute('ng-model');
      const options = await select.$$('option');
      
      console.log(`📋 SELECT ${i + 1}:`, {
        id,
        className,
        ngModel,
        optionsCount: options.length
      });
      
      // Mostrar algumas opções
      for (let j = 0; j < Math.min(3, options.length); j++) {
        const optionText = await options[j].textContent();
        const optionValue = await options[j].getAttribute('value');
        console.log(`   Opção ${j + 1}: "${optionText}" (value: ${optionValue})`);
      }
    }
    
    console.log('🔍 === PROCURANDO ELEMENTOS DE CARREGAMENTO ===');
    
    const loadingSelectors = [
      '.loading',
      '.spinner',
      '[class*="load"]',
      '[class*="spin"]',
      '.fa-spinner',
      '.glyphicon-refresh'
    ];
    
    for (const selector of loadingSelectors) {
      const elements = await page.$$(selector);
      if (elements.length > 0) {
        console.log(`⏳ Encontrados ${elements.length} elementos com seletor: ${selector}`);
        
        for (let i = 0; i < elements.length; i++) {
          const element = elements[i];
          const className = await element.getAttribute('class');
          const style = await element.getAttribute('style');
          const isVisible = await element.isVisible();
          
          console.log(`   Elemento ${i + 1}:`, { className, style, isVisible });
        }
      }
    }
    
    console.log('🔍 === TENTATIVA DE INTERAÇÃO COM FILTROS ===');
    
    // Procurar por botões que possam carregar dados
    const potentialTriggers = await page.$$('button, input[type="submit"], [ng-click]');
    
    for (const trigger of potentialTriggers) {
      const text = await trigger.textContent();
      const ngClick = await trigger.getAttribute('ng-click');
      const className = await trigger.getAttribute('class');
      
      if (text && text.trim() && (
        text.toLowerCase().includes('search') ||
        text.toLowerCase().includes('filter') ||
        text.toLowerCase().includes('load') ||
        text.toLowerCase().includes('apply') ||
        ngClick && ngClick.includes('search')
      )) {
        console.log(`🎯 TENTANDO CLICAR EM: "${text.trim()}" (ng-click: ${ngClick})`);
        
        try {
          await trigger.click();
          await page.waitForTimeout(3000);
          
          // Verificar se apareceram dados
          const hasDataAfterClick = await page.evaluate(() => {
            const tbody = document.querySelector('#ridesTable tbody');
            if (!tbody) return false;
            const emptyMessage = tbody.querySelector('td.dataTables_empty');
            return !emptyMessage;
          });
          
          if (hasDataAfterClick) {
            console.log('🎉 SUCESSO! Dados apareceram após clicar!');
            break;
          } else {
            console.log('❌ Ainda sem dados após clicar');
          }
        } catch (error) {
          console.log(`❌ Erro ao clicar: ${error}`);
        }
      }
    }
    
    return {
      success: true,
      message: 'Investigação completa dos filtros'
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
