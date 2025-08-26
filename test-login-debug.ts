import { MonitoringService } from './src/services/monitoringService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Teste específico para debugar o hasLoggedIn
 */
async function testLoginDebug() {
  console.log('🔍 TESTE DE DEBUG - HASLOGGEDIN');
  console.log('='.repeat(50));
  
  try {
    const monitoring = MonitoringService.getInstance();
    
    // Verificar estado inicial
    console.log('\n📋 ESTADO INICIAL:');
    console.log(`   hasLoggedIn: ${(monitoring as any).hasLoggedIn}`);
    
    console.log('\n1️⃣ PRIMEIRA EXECUÇÃO (deve fazer login):');
    await monitoring.runOnce(false);
    
    // Verificar estado após primeira execução
    console.log('\n📋 ESTADO APÓS PRIMEIRA EXECUÇÃO:');
    console.log(`   hasLoggedIn: ${(monitoring as any).hasLoggedIn}`);
    
    console.log('\n⏰ Aguardando 5 segundos...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n2️⃣ SEGUNDA EXECUÇÃO (deve pular login):');
    await monitoring.runOnce(true);
    
    console.log('\n✅ TESTE CONCLUÍDO!');
    
  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
  }
}

testLoginDebug().catch(console.error);
