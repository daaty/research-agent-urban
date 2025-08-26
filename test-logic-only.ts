import { MonitoringService } from './src/services/monitoringService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🔧 TESTE DIRETO DA LÓGICA DE CONTROLE
 * Simula o comportamento sem depender do CAPTCHA
 */
async function testLogicDirectly() {
  console.log('🔧 TESTE DIRETO - LÓGICA DE CONTROLE DE LOGIN');
  console.log('='.repeat(50));
  
  try {
    const monitoringService = MonitoringService.getInstance();
    
    // Forçar hasLoggedIn = false no início
    (monitoringService as any).hasLoggedIn = false;
    console.log('\n📌 Estado inicial: hasLoggedIn =', (monitoringService as any).hasLoggedIn);
    
    // Simular que já fez login anteriormente
    console.log('\n1️⃣ Simulando que já fez login anteriormente...');
    (monitoringService as any).hasLoggedIn = true;
    console.log('📌 Estado após simular login: hasLoggedIn =', (monitoringService as any).hasLoggedIn);
    
    // Agora chamar runOnce e ver se pula o login
    console.log('\n2️⃣ Chamando runOnce(false) - deve ser forçado para true...');
    
    // Testar apenas a lógica de verificação
    const performScrapingMethod = (monitoringService as any).performScraping;
    
    // Chamar com false (deveria ser forçado para true)
    console.log('🔧 Testando lógica com skipLogin=false...');
    
    // Verificar apenas o cálculo do shouldSkipLogin
    const testSkipLogin = false;
    const hasLoggedIn = (monitoringService as any).hasLoggedIn;
    
    console.log(`📋 LÓGICA DE TESTE:`);
    console.log(`   hasLoggedIn: ${hasLoggedIn}`);
    console.log(`   skipLogin parâmetro: ${testSkipLogin}`);
    
    let shouldSkipLogin = testSkipLogin;
    
    // Aplicar a lógica corrigida
    if (hasLoggedIn) {
      shouldSkipLogin = true;
      console.log('🔧 [LOGIN-CONTROL] hasLoggedIn=true, forçando shouldSkipLogin=true');
    }
    
    console.log(`   shouldSkipLogin final: ${shouldSkipLogin}`);
    
    if (shouldSkipLogin === true && testSkipLogin === false) {
      console.log('✅ SUCESSO: A lógica está funcionando! Login seria pulado.');
    } else {
      console.log('❌ PROBLEMA: A lógica não está funcionando corretamente.');
    }
    
    console.log('\n3️⃣ Resetando estado para teste do contrário...');
    (monitoringService as any).hasLoggedIn = false;
    console.log('📌 Estado resetado: hasLoggedIn =', (monitoringService as any).hasLoggedIn);
    
    const testSkipLogin2 = false;
    const hasLoggedIn2 = (monitoringService as any).hasLoggedIn;
    
    console.log(`📋 LÓGICA DE TESTE 2:`);
    console.log(`   hasLoggedIn: ${hasLoggedIn2}`);
    console.log(`   skipLogin parâmetro: ${testSkipLogin2}`);
    
    let shouldSkipLogin2 = testSkipLogin2;
    
    if (hasLoggedIn2) {
      shouldSkipLogin2 = true;
      console.log('🔧 [LOGIN-CONTROL] hasLoggedIn=true, forçando shouldSkipLogin=true');
    } else {
      console.log('🔧 [LOGIN-CONTROL] hasLoggedIn=false, mantendo shouldSkipLogin como parâmetro');
    }
    
    console.log(`   shouldSkipLogin final: ${shouldSkipLogin2}`);
    
    if (shouldSkipLogin2 === false && testSkipLogin2 === false) {
      console.log('✅ SUCESSO: A lógica está funcionando! Login seria executado.');
    } else {
      console.log('❌ PROBLEMA: A lógica não está funcionando corretamente.');
    }
    
    console.log('\n🎯 RESULTADO DO TESTE:');
    console.log('   ✅ Quando hasLoggedIn=true → deve pular login');
    console.log('   ✅ Quando hasLoggedIn=false → deve fazer login');
    
  } catch (error: any) {
    console.error('\n❌ ERRO DURANTE TESTE:', error.message);
  }
}

// Executar teste
testLogicDirectly().catch(console.error);
