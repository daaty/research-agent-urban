import { MonitoringService } from './src/services/monitoringService';
import dotenv from 'dotenv';

dotenv.config();

async function testDebugMessages() {
  console.log('🔥 TESTE - VERIFICANDO MENSAGENS DE DEBUG');
  console.log('='.repeat(50));
  
  try {
    console.log('\n📌 Criando nova instância...');
    const monitoringService = MonitoringService.getInstance();
    
    console.log('\n📌 Executando performScraping diretamente...');
    // Acessar método privado para teste
    const performScrapingMethod = (monitoringService as any).performScraping;
    
    if (performScrapingMethod) {
      console.log('✅ Método encontrado, executando...');
      await performScrapingMethod.call(monitoringService, false);
    } else {
      console.log('❌ Método não encontrado');
    }
    
  } catch (error: any) {
    console.error('❌ ERRO:', error.message);
  }
}

testDebugMessages().catch(console.error);
