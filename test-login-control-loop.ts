import { MonitoringService } from './src/services/monitoringService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Teste para verificar se o loop do monitoring não refaz login desnecessariamente
 */
async function testLoginControlInLoop() {
  console.log('🔍 TESTANDO CONTROLE DE LOGIN NO LOOP DO MONITORING SERVICE');
  console.log('='.repeat(70));
  
  try {
    const monitoringService = MonitoringService.getInstance();
    
    console.log('\n1️⃣ PRIMEIRA EXECUÇÃO (deve fazer login):');
    console.log('   - skipLogin = false');
    console.log('   - scrapeAllRidesDataPersistent(false)');
    console.log('   - scrapeAllDriversDataPersistent(false)');
    
    await monitoringService.runOnce(false); // Primeira execução sempre faz login
    
    console.log('\n⏰ Aguardando 10 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('2️⃣ SEGUNDA EXECUÇÃO (deve reutilizar sessão):');
    console.log('   - skipLogin = true (simulando loop cron)');
    console.log('   - scrapeAllRidesDataPersistent(true)');
    console.log('   - scrapeAllDriversDataPersistent(true)');
    
    // Simular execução do loop cron chamando performScraping(true)
    const performScrapingMethod = (monitoringService as any).performScraping;
    if (performScrapingMethod) {
      await performScrapingMethod.call(monitoringService, true); // skipLogin = true
    } else {
      console.log('⚠️ Método performScraping não acessível, executando runOnce novamente');
      await monitoringService.runOnce(true); // ✅ CORREÇÃO: skipLogin = true
    }
    
    console.log('\n✅ TESTE CONCLUÍDO!');
    console.log('🔍 Verifique os logs acima para confirmar:');
    console.log('   - 1ª execução: fez login');
    console.log('   - 2ª execução: pulou login (reutilizou sessão)');
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }
}

// Executar teste
testLoginControlInLoop().catch(console.error);
