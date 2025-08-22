#!/usr/bin/env ts-node

/**
 * Teste específico para navegação via clique no menu Active Drivers
 */

import { RidesDashboardHybridScraper } from './src/scraper/RidesDashboardHybridScraper';
import { BrowserSessionManager } from './src/core/BrowserSessionManager';

interface TestResult {
  step: string;
  success: boolean;
  error?: string;
  data?: any;
}

async function testClickNavigation(): Promise<void> {
  console.log('🔬 === TESTE DE NAVEGAÇÃO VIA CLIQUE NO MENU ===');
  console.log('🎯 Objetivo: Testar clique no menu "Active Drivers" para identificação da cidade');
  console.log('');

  const results: TestResult[] = [];
  const browserManager = new BrowserSessionManager();
  const scraper = new RidesDashboardHybridScraper();

  try {
    // 1. Inicializar Browser
    console.log('1️⃣ Inicializando browser com VNC...');
    await browserManager.initialize({ 
      headless: false, 
      vncMode: true,
      slowMo: 1000  // Modo mais lento para visualizar melhor
    });
    results.push({ step: 'Inicialização do Browser', success: true });

    // 2. Configurar Scraper
    console.log('2️⃣ Configurando scraper...');
    const page = browserManager.getPage();
    await scraper.configurePage(page);
    results.push({ step: 'Configuração do Scraper', success: true });

    // 3. Fazer Login
    console.log('3️⃣ Executando login...');
    await scraper.performLogin();
    results.push({ step: 'Login', success: true });

    // 4. Verificar se está na página dashboard
    console.log('4️⃣ Verificando página atual...');
    const currentUrl = page.url();
    console.log(`📍 URL atual: ${currentUrl}`);
    
    if (!currentUrl.includes('dashboard')) {
      throw new Error('Não está na página do dashboard');
    }
    results.push({ step: 'Verificação Dashboard', success: true });

    // 5. Capturar HTML antes do clique para análise
    console.log('5️⃣ Analisando estrutura da página...');
    const pageContent = await page.content();
    
    // Procurar por elementos que contenham "Active Drivers"
    const activeDriversMatches = pageContent.match(/<[^>]*Active Drivers[^>]*>/gi) || [];
    console.log(`🔍 Encontrados ${activeDriversMatches.length} elementos com "Active Drivers"`);
    
    activeDriversMatches.forEach((match, index) => {
      console.log(`   ${index + 1}. ${match}`);
    });

    // 6. Listar todos os elementos span visíveis
    console.log('6️⃣ Listando elementos span na página...');
    const spanElements = await page.$$eval('span', spans => 
      spans.map(span => ({
        text: span.textContent?.trim(),
        className: span.className,
        style: span.getAttribute('style'),
        visible: span.offsetParent !== null
      })).filter(span => span.text && span.text.includes('Active'))
    );

    console.log(`📋 Encontrados ${spanElements.length} spans com texto "Active":`);
    spanElements.forEach((span, index) => {
      console.log(`   ${index + 1}. Texto: "${span.text}"`);
      console.log(`      Classe: ${span.className}`);
      console.log(`      Style: ${span.style}`);
      console.log(`      Visível: ${span.visible}`);
      console.log('');
    });

    // 7. Testar método identifyCity com nova abordagem de clique
    console.log('7️⃣ Testando identificação da cidade via clique...');
    
    // Fazer a identificação (que agora usa clique interno)
    await scraper.initialize();
    
    const currentCity = scraper.getCurrentCity();
    console.log(`🏙️ Cidade identificada: ${currentCity}`);

    if (currentCity && currentCity !== 'Cidade Padrão') {
      results.push({ 
        step: 'Identificação da Cidade via Clique', 
        success: true, 
        data: { city: currentCity } 
      });
    } else {
      results.push({ 
        step: 'Identificação da Cidade via Clique', 
        success: false, 
        error: 'Cidade não identificada corretamente' 
      });
    }

    // 8. Verificar URL após tentativa de clique
    console.log('8️⃣ Verificando URL após tentativa de clique...');
    const finalUrl = page.url();
    console.log(`📍 URL final: ${finalUrl}`);

    // 9. Capturar screenshot do estado final
    console.log('9️⃣ Capturando screenshot do estado final...');
    await page.screenshot({ 
      path: './test-results-click-navigation.png', 
      fullPage: true 
    });
    console.log('📸 Screenshot salvo em: ./test-results-click-navigation.png');

  } catch (error: any) {
    console.error('❌ Erro durante o teste:', error.message);
    results.push({ 
      step: 'Execução do Teste', 
      success: false, 
      error: error.message 
    });
  } finally {
    // Aguardar para permitir inspeção manual
    console.log('⏳ Aguardando 10 segundos para inspeção manual...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    await browserManager.close();
  }

  // Resumo dos resultados
  console.log('\n📊 === RESUMO DOS RESULTADOS ===');
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.step}: ${result.success ? 'SUCESSO' : 'FALHOU'}`);
    if (result.error) {
      console.log(`   🔴 Erro: ${result.error}`);
    }
    if (result.data) {
      console.log(`   📋 Dados: ${JSON.stringify(result.data)}`);
    }
  });

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  console.log(`\n🎯 Taxa de Sucesso: ${successCount}/${totalCount} (${Math.round(successCount/totalCount*100)}%)`);

  if (successCount === totalCount) {
    console.log('🎉 TESTE CONCLUÍDO COM SUCESSO!');
  } else {
    console.log('⚠️ TESTE CONCLUÍDO COM PROBLEMAS');
  }
}

// Executar teste
if (require.main === module) {
  testClickNavigation().catch(console.error);
}

export { testClickNavigation };
