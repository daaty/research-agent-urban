import { MonitoringService } from './src/services/monitoringService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * TESTE FINAL: Verificar se a correção do skipLogin está funcionando
 * - Primeira execução: deve fazer login (skipLogin=false)
 * - Segunda execução: deve pular login (skipLogin=true automático)
 */
async function testSkipLoginFinalFix() {
  console.log('🔥 TESTE FINAL: Correção do problema skipLogin');
  console.log('=====================================');
  
  try {
    const monitoring = MonitoringService.getInstance();
    
    console.log('\n1️⃣ PRIMEIRA EXECUÇÃO:');
    console.log('   - Deve fazer login normalmente');
    console.log('   - skipLogin = false');
    console.log('   - hasLoggedIn será marcado como true');
    
    await monitoring.runOnce(false); // Primeira execução com login
    
    console.log('\n⏳ Aguardando 10 segundos...');
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n2️⃣ SEGUNDA EXECUÇÃO:');
    console.log('   - Mesmo passando skipLogin=false, deve ser forçado para true');
    console.log('   - Sistema deve detectar que já fez login');
    console.log('   - NÃO deve refazer o login');
    
    await monitoring.runOnce(false); // Segunda execução - deve pular login automaticamente
    
    console.log('\n✅ TESTE CONCLUÍDO!');
    console.log('Se você não viu mensagens de login na segunda execução, a correção funcionou!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
  
  process.exit(0);
}

testSkipLoginFinalFix().catch(console.error);
