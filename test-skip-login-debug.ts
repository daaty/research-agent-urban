import { scrapeAllRidesDataPersistent } from './src/scraper/ridesPersistentScraper';
import { scrapeAllDriversDataPersistent } from './src/scraper/driversPersistentScraper';

async function testSkipLoginDebug() {
  try {
    console.log('🎯 TESTE ESPECÍFICO: Verificando onde está a chamada problemática');
    console.log('');
    
    console.log('1️⃣ PRIMEIRA EXECUÇÃO (com login - skipLogin=false):');
    console.log('   skipLogin = false para rides e drivers');
    
    // Primeira execução COM login
    const ridesResult1 = await scrapeAllRidesDataPersistent(false);
    console.log('✅ Resultado rides (1ª execução):', ridesResult1.success ? 'SUCCESS' : 'FAILURE');
    
    const driversResult1 = await scrapeAllDriversDataPersistent(false);
    console.log('✅ Resultado drivers (1ª execução):', driversResult1.success ? 'SUCCESS' : 'FAILURE');
    
    console.log('');
    console.log('⏰ Aguardando 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('');
    
    console.log('2️⃣ SEGUNDA EXECUÇÃO (deve reutilizar sessão):');
    console.log('   skipLogin = true para rides e drivers');
    console.log('   🔍 SE APARECER "🔄 Iniciando processo de login com tratamento de captcha..." AQUI É O PROBLEMA!');
    console.log('');
    
    // Segunda execução SEM login (skipLogin=true)
    const ridesResult2 = await scrapeAllRidesDataPersistent(true);
    console.log('✅ Resultado rides (2ª execução):', ridesResult2.success ? 'SUCCESS' : 'FAILURE');
    
    const driversResult2 = await scrapeAllDriversDataPersistent(true);
    console.log('✅ Resultado drivers (2ª execução):', driversResult2.success ? 'SUCCESS' : 'FAILURE');
    
    console.log('');
    console.log('🎯 TESTE CONCLUÍDO!');
    console.log('Se a mensagem "🔄 Iniciando processo de login com tratamento de captcha..." apareceu na SEGUNDA execução, é aí que está o bug!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
  
  process.exit(0);
}

testSkipLoginDebug();
