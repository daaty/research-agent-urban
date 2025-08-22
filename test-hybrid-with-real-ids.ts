import 'dotenv/config';
import { HybridOperationService } from './src/services/hybridOperationServiceV2';

async function testHybridSystemWithRealIds() {
  console.log('🧪 Testando sistema híbrido com IDs reais da dashboard...\n');

  try {
    // Configuração para teste
    const config = {
      extractionBatchSize: 3, // Processar poucos por vez para teste
      rechargePauseThreshold: 1,
      maxConcurrentRecharges: 2,
      stateCheckInterval: 3000, // 3 segundos
      recoveryOnStart: false, // Não recuperar estado para teste limpo
      autoFeedInterval: 60000, // 1 minuto (mais rápido para teste)
      citiesRefreshInterval: 300000 // 5 minutos
    };

    // Criar instância do serviço híbrido
    console.log('🚀 Criando instância do HybridOperationService...');
    const hybridService = HybridOperationService.getInstance(config);

    // Iniciar o sistema
    console.log('⚡ Iniciando sistema híbrido...');
    await hybridService.start();

    // Aguardar um tempo para ver o sistema funcionando
    console.log('⏳ Sistema rodando, aguardando extrações...');
    console.log('   - Aguarde para ver IDs sendo extraídos da dashboard');
    console.log('   - O sistema buscará IDs reais da página Active Drivers');
    console.log('   - Em seguida processará cada ID na fila');
    
    // Aguardar 2 minutos para ver o sistema em ação
    await new Promise(resolve => setTimeout(resolve, 120000));

    // Verificar estatísticas
    const stats = hybridService.getStats();
    console.log('\n📊 Estatísticas do sistema:');
    console.log(`   Total extraído: ${stats.totalExtracted}`);
    console.log(`   Total recargas: ${stats.totalRecharges}`);
    console.log(`   Modo atual: ${stats.currentMode}`);
    console.log(`   Taxa de sucesso: ${stats.successRate.toFixed(1)}%`);
    console.log(`   Erros: ${stats.errorCount}`);

    // Parar o sistema
    console.log('\n🛑 Parando sistema híbrido...');
    await hybridService.stop();

    console.log('\n✅ Teste concluído com sucesso!');
    
  } catch (error: any) {
    console.error('\n❌ Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n🏁 Teste finalizado!');
}

// Executar o teste
if (require.main === module) {
  testHybridSystemWithRealIds().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

export { testHybridSystemWithRealIds };
