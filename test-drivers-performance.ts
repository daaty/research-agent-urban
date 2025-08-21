import { DriversPersistentScraper } from './src/scraper/driversPersistentScraper';
import { BrowserSessionManager } from './src/services/browserSessionManager';

/**
 * Teste específico para o scraper de drivers incluindo Driver Performance
 */
async function testDriversScraperWithPerformance() {
  console.log('🧪 TESTE DO SCRAPER DE DRIVERS - INCLUINDO DRIVER PERFORMANCE');
  console.log('================================================================');
  
  try {
    // Inicializar o scraper
    const scraper = new DriversPersistentScraper();
    const browserManager = BrowserSessionManager.getInstance();
    
    console.log('🔧 Verificando páginas configuradas...');
    const pages = scraper.getDriversPages();
    console.log('📋 Páginas de drivers disponíveis:');
    pages.forEach((page, index) => {
      console.log(`   ${index + 1}. ${page.name} - ${page.url}`);
    });
    
    // Verificar se Driver Performance está incluída
    const hasPerformance = pages.some(page => page.name.includes('Performance'));
    if (hasPerformance) {
      console.log('✅ Driver Performance está HABILITADA no scraper');
    } else {
      console.log('❌ Driver Performance NÃO está configurada');
      return;
    }
    
    console.log('\\n🚀 Iniciando teste do scraping de drivers...');
    
    // Executar o scraping
    const startTime = Date.now();
    const result = await scraper.scrapeAllDriversData();
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    console.log('\\n📊 RESULTADOS DO TESTE:');
    console.log('========================');
    console.log(`⏱️ Tempo total: ${duration}s`);
    console.log(`✅ Sucesso: ${result.success}`);
    console.log(`📄 Páginas processadas: ${result.data.length}`);
    console.log(`💬 Mensagem: ${result.message}`);
    
    if (result.sessionInfo) {
      console.log('\\n🔗 Informações da sessão:');
      console.log(`   🆕 Novo login: ${result.sessionInfo.isNewLogin}`);
      console.log(`   🌐 Status browser: ${result.sessionInfo.browserStatus}`);
      console.log(`   ✅ Sessão válida: ${result.sessionInfo.sessionValid}`);
    }
    
    console.log('\\n📋 DETALHES POR PÁGINA:');
    console.log('========================');
    
    result.data.forEach((pageData, index) => {
      const status = pageData.isEmpty ? '🔴 VAZIA' : '✅ COM DADOS';
      const recordCount = pageData.isEmpty ? 0 : pageData.rows.length;
      
      console.log(`\\n${index + 1}. ${pageData.name} ${status}`);
      console.log(`   📊 Registros: ${recordCount}`);
      console.log(`   📑 Headers: ${pageData.headers.length}`);
      console.log(`   🌐 URL: ${pageData.url}`);
      
      if (pageData.headers.length > 0) {
        console.log(`   📝 Cabeçalhos: ${pageData.headers.join(', ')}`);
      }
      
      if (pageData.name.includes('Performance')) {
        console.log('   🎯 PÁGINA DRIVER PERFORMANCE:');
        if (recordCount > 0) {
          console.log(`      ✅ Dados extraídos com sucesso!`);
          console.log(`      📊 Total de registros: ${recordCount}`);
          
          // Mostrar primeiras linhas como exemplo
          if (pageData.rows.length > 0) {
            console.log('      📋 Primeira linha de exemplo:');
            console.log(`         ${pageData.rows[0].join(' | ')}`);
          }
        } else {
          console.log('      ⚠️ Nenhum dado encontrado na Driver Performance');
          console.log('      💡 Possíveis causas:');
          console.log('         - Página ainda carregando');
          console.log('         - Seletor não correspondeu');
          console.log('         - Tabela realmente vazia');
        }
      }
    });
    
    // Verificar especificamente Driver Performance
    const performanceData = result.data.find(page => page.name.includes('Performance'));
    if (performanceData) {
      console.log('\\n🎯 ANÁLISE ESPECÍFICA - DRIVER PERFORMANCE:');
      console.log('============================================');
      console.log(`✅ Página encontrada: ${performanceData.name}`);
      console.log(`📊 Status: ${performanceData.isEmpty ? 'Vazia' : 'Com dados'}`);
      console.log(`🔗 URL processada: ${performanceData.url}`);
      
      if (!performanceData.isEmpty) {
        console.log('🎉 SUCESSO! Driver Performance foi processada corretamente');
        console.log(`📈 Total de registros extraídos: ${performanceData.rows.length}`);
      } else {
        console.log('⚠️ Driver Performance foi processada mas não retornou dados');
        console.log('💡 Isso pode ser normal se a tabela estiver realmente vazia');
      }
    } else {
      console.log('\\n❌ ERRO: Driver Performance não foi encontrada nos resultados');
    }
    
    console.log('\\n✅ TESTE CONCLUÍDO');
    
  } catch (error: any) {
    console.error('\\n❌ ERRO NO TESTE:');
    console.error('==================');
    console.error(`Tipo: ${error.name || 'Error'}`);
    console.error(`Mensagem: ${error.message}`);
    
    if (error.stack) {
      console.error('\\nStack trace:');
      console.error(error.stack);
    }
    
    console.error('\\n🔧 Possíveis soluções:');
    console.error('• Verificar se o sistema de rides foi executado primeiro');
    console.error('• Verificar conexão com a plataforma');
    console.error('• Verificar se o browser está ativo');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testDriversScraperWithPerformance().catch((error: any) => {
    console.error('❌ Falha crítica no teste:', error);
    process.exit(1);
  });
}

export { testDriversScraperWithPerformance };
