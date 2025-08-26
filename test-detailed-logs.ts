import { MonitoringService } from './src/services/monitoringService';
import dotenv from 'dotenv';

dotenv.config();

/**
 * 🔥 TESTE COM LOGS DETALHADOS - FORÇA RECRIAÇÃO
 */
async function testWithDetailedLogs() {
  console.log('🔥 TESTE COM LOGS DETALHADOS');
  console.log('='.repeat(60));
  
  try {
    // Forçar recriação da instância
    (MonitoringService as any).instance = null;
    console.log('🔧 Instância singleton resetada');
    
    const monitoringService = MonitoringService.getInstance();
    console.log('🔧 Nova instância criada');
    
    console.log('\n1️⃣ PRIMEIRA EXECUÇÃO (deve fazer login):');
    console.log('Observar logs detalhados...');
    
    await monitoringService.runOnce(false);
    
    console.log('\n⏰ Aguardando 3 segundos...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    console.log('\n2️⃣ SEGUNDA EXECUÇÃO (deve pular login):');
    console.log('Observar se hasLoggedIn=true e skipLogin é forçado...');
    
    await monitoringService.runOnce(false); // Mesmo passando false, deve ser forçado para true
    
    console.log('\n✅ TESTE CONCLUÍDO! Verifique os logs detalhados acima.');
    
  } catch (error: any) {
    console.error('\n❌ ERRO:', error.message);
  }
}

testWithDetailedLogs().catch(console.error);
