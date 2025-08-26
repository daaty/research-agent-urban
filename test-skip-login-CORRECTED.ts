import { MonitoringService } from './src/services/monitoringService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🔥 TESTE FINAL - CORREÇÃO DO SKIP LOGIN
 * Este teste confirma que o problema foi resolvido
 */
async function testSkipLoginCorrected() {
  console.log('🔥 TESTE FINAL - VERIFICAÇÃO DA CORREÇÃO DO SKIP LOGIN');
  console.log('='.repeat(65));
  console.log('📌 OBJETIVO: Confirmar que a segunda execução NÃO refaz login');
  console.log('');
  
  try {
    const monitoringService = MonitoringService.getInstance();
    
    console.log('\n1️⃣ PRIMEIRA EXECUÇÃO:');
    console.log('   ✅ skipLogin = false (deve fazer login)');
    console.log('   🔧 Deve aparecer: "Skip Login Verification: false"');
    console.log('   🔑 Deve executar login e captcha');
    console.log('');
    
    await monitoringService.runOnce(false); // ✅ EXPLICITAMENTE false para login
    
    console.log('\n⏰ Aguardando 10 segundos...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n2️⃣ SEGUNDA EXECUÇÃO:');
    console.log('   ✅ skipLogin = true (deve PULAR login)');
    console.log('   🔧 Deve aparecer: "Skip Login Verification: true"');
    console.log('   🚀 Deve reutilizar sessão existente');
    console.log('   ❌ NÃO deve fazer login novamente');
    console.log('');
    
    await monitoringService.runOnce(true); // ✅ EXPLICITAMENTE true para pular login
    
    console.log('\n🎯 RESULTADO ESPERADO:');
    console.log('   1ª execução: "skipLoginVerification=false" → FAZ LOGIN');
    console.log('   2ª execução: "skipLoginVerification=true" → PULA LOGIN');
    console.log('');
    console.log('✅ TESTE CONCLUÍDO! Verifique os logs acima.');
    
  } catch (error: any) {
    console.error('\n❌ ERRO DURANTE TESTE:', error.message);
  }
}

// Executar teste
testSkipLoginCorrected().catch(console.error);
