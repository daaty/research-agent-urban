/**
 * Teste para verificar o problema do monitoring loop
 * Por que ainda está fazendo login mesmo com skipLogin=true?
 */

async function testMonitoringFix() {
  try {
    console.log('🔍 TESTE: Verificando lógica do monitoring service...');
    
    // 1. Verificar se há múltiplas instâncias
    console.log('\n1️⃣ Verificando instâncias ativas...');
    
    // Importar o monitoring service
    const { MonitoringService } = await import('./src/services/monitoringService');
    
    // 2. Simular execução direta dos métodos
    console.log('\n2️⃣ Testando performScraping diretamente...');
    const monitoringService = MonitoringService.getInstance();
    
    // Acessar método privado para teste
    const performScrapingMethod = (monitoringService as any).performScraping;
    
    if (performScrapingMethod) {
      console.log('\n🧪 TESTE 1: performScraping(true) - deve PULAR login');
      await performScrapingMethod.call(monitoringService, true);
      
      console.log('\n🧪 TESTE 2: performScraping(false) - deve FAZER login');
      await performScrapingMethod.call(monitoringService, false);
    } else {
      console.log('❌ Método performScraping não acessível');
    }
    
  } catch (error: any) {
    console.error('❌ Erro no teste:', error.message);
    console.error('❌ Stack:', error.stack);
  }
}

testMonitoringFix().catch(console.error);
