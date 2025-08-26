import { scrapeAllRidesDataPersistent } from './src/scraper/ridesPersistentScraper';

async function testSkipLogin() {
  console.log('🔍 TESTE SIMPLES: skipLoginVerification=true');
  console.log('==================================================');
  
  try {
    // Testar diretamente com skipLogin=true
    console.log('⚡ Chamando scrapeAllRidesDataPersistent(true)...');
    const result = await scrapeAllRidesDataPersistent(true);
    console.log('✅ Resultado:', result.success ? 'SUCCESS' : 'FAIL');
    console.log('📝 Mensagem:', result.message);
  } catch (error: any) {
    console.error('❌ Erro:', error.message);
  }
}

testSkipLogin();
