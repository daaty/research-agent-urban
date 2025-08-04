const { MonitoringService } = require('./dist/services/monitoringService');

async function testRidesFix() {
  console.log('🧪 TESTE: Verificando correção de rides...');
  
  const monitor = new MonitoringService();
  
  try {
    // Executar uma vez para testar
    await monitor.runOnce();
    console.log('✅ Teste concluído - verifique os logs acima');
  } catch (error) {
    console.error('❌ Erro no teste:', error);
  }
}

testRidesFix();
