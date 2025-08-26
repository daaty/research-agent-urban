import { MonitoringService } from './src/services/monitoringService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Teste para verificar se a correção do skipLogin está funcionando
 */
async function testSkipLoginFix() {
  console.log('🔍 TESTANDO CORREÇÃO DO SKIP LOGIN');
  console.log('='.repeat(50));
  
  try {
    const monitoringService = MonitoringService.getInstance();
    
    console.log('\n1️⃣ PRIMEIRA EXECUÇÃO (deve fazer login):');
    console.log('   skipLogin = false para rides e drivers');
    
    // Simular primeira execução (sem skipLogin)
    const performScrapingMethod = (monitoringService as any).performScraping;
    await performScrapingMethod.call(monitoringService, false);
    
    console.log('\n⏰ Aguardando 5 segundos...\n');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('2️⃣ SEGUNDA EXECUÇÃO (deve reutilizar sessão):');
    console.log('   skipLogin = true para rides e drivers');
    
    // Simular execução do loop cron (com skipLogin)
    await performScrapingMethod.call(monitoringService, true);
    
    console.log('\n✅ TESTE CONCLUÍDO!');
    console.log('🔍 Verifique os logs para confirmar:');
    console.log('   - 1ª execução: "Skip Login Verification: false"');
    console.log('   - 2ª execução: "Skip Login Verification: true"');
    
  } catch (error: any) {
    console.error('\n❌ ERRO DURANTE TESTE:', error.message);
  }
}

// Executar teste
testSkipLoginFix().catch(console.error);
