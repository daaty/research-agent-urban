import { MonitoringService } from './src/services/monitoringService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🔥 TESTE FINAL - VERIFICAÇÃO DA CORREÇÃO
 */
async function testFinalCorrection() {
  console.log('🔥 TESTE FINAL - VERIFICAÇÃO DA CORREÇÃO');
  console.log('='.repeat(50));
  
  try {
    const monitoringService = MonitoringService.getInstance();
    
    console.log('\n📌 Verificando se as mensagens de debug aparecem...');
    console.log('1️⃣ Primeira execução (deve aparecer logs de debug):');
    
    await monitoringService.runOnce(false);
    
    console.log('\n✅ VERIFICAÇÃO CONCLUÍDA!');
    console.log('Se você viu as mensagens:');
    console.log('   🔧 [MONITORING] performScraping chamado com skipLogin=...');
    console.log('   🔧 [DEBUG] hasLoggedIn = ...');
    console.log('   🔧 [LOGIN-CONTROL] ...');
    console.log('Então o código corrigido está sendo usado!');
    
  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
  }
}

testFinalCorrection().catch(console.error);
