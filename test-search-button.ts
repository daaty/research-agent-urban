import { DriversPersistentScraper } from './src/scraper/driversPersistentScraper';

/**
 * Teste específico para verificar se o botão Search funciona
 */
async function testSearchButton() {
  console.log('🧪 TESTE BOTÃO SEARCH - DRIVER PERFORMANCE');
  console.log('==========================================');

  try {
    const scraper = new DriversPersistentScraper();
    
    console.log('✅ Scraper inicializado');
    console.log('🎯 A próxima execução irá:');
    console.log('  1. Navegar para Driver Performance');
    console.log('  2. Procurar botão Search com seletores:');
    console.log('     - button.fancyButton[ng-click="High_Cancellation()"]');
    console.log('     - button[ng-click="High_Cancellation()"]');
    console.log('     - button.fancyButton:has-text("Search")');
    console.log('     - button:has-text("Search")');
    console.log('     - .fancyButton:has-text("Search")');
    console.log('  3. Clicar no botão para carregar dados');
    console.log('  4. Aguardar 3 segundos para carregamento');
    console.log('  5. Tentar extrair tabela #datatable2');
    
    console.log('');
    console.log('🚀 Execute o monitoramento para testar:');
    console.log('   npm run start:local');
    console.log('');
    console.log('📊 Logs esperados:');
    console.log('   🔍 Procurando botão Search para carregar dados...');
    console.log('   🔍 Botão Search encontrado: [selector]');
    console.log('   ⚡ Clicando no botão Search para carregar dados...');
    console.log('   ✅ Botão Search clicado com sucesso!');
    console.log('   ✅ Driver Performance: dados da tabela carregados');
    console.log('   ✅ Driver Performance: usando seletor #datatable2');
    console.log('   📊 Driver Performance - Headers: 21, Rows: X');

  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

if (require.main === module) {
  testSearchButton();
}
