import { MonitoringService } from './src/services/monitoringService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🔥 TESTE DEFINITIVO - VERIFICAÇÃO DO LOGIN CONTROL
 */
async function testLoginControlDefinitive() {
  console.log('🔥 TESTE DEFINITIVO - VERIFICAÇÃO DO LOGIN CONTROL');
  console.log('='.repeat(60));
  
  try {
    const monitoringService = MonitoringService.getInstance();
    
    console.log('\n1️⃣ PRIMEIRA EXECUÇÃO (deve fazer login):');
    console.log('   📌 hasLoggedIn inicial:', (monitoringService as any).hasLoggedIn);
    
    await monitoringService.runOnce(false); // Forçar login
    
    console.log('\n📋 ESTADO APÓS PRIMEIRA EXECUÇÃO:');
    console.log('   📌 hasLoggedIn:', (monitoringService as any).hasLoggedIn);
    
    if ((monitoringService as any).hasLoggedIn) {
      console.log('   ✅ SUCESSO: Login foi marcado como concluído!');
    } else {
      console.log('   ❌ PROBLEMA: Login não foi marcado!');
    }
    
    console.log('\n⏰ Aguardando 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n2️⃣ SEGUNDA EXECUÇÃO (deve pular login):');
    console.log('   📌 hasLoggedIn antes:', (monitoringService as any).hasLoggedIn);
    
    await monitoringService.runOnce(true); // Tentar pular login
    
    console.log('\n✅ TESTE CONCLUÍDO!');
    console.log('📊 Verifique os logs para confirmar:');
    console.log('   - 1ª execução: deve fazer login');
    console.log('   - 2ª execução: deve pular login (skipLoginVerification=true)');
    
  } catch (error: any) {
    console.error('\n❌ ERRO DURANTE TESTE:', error.message);
  }
}

// Executar teste
testLoginControlDefinitive().catch(console.error);
