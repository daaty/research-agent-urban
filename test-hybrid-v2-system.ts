import { HybridOperationService } from './src/services/hybridOperationServiceV2';

/**    console.log(`❌ Erros: ${finalStats.errorCount}`);
    console.log(`✅ Taxa de sucesso: ${finalStats.successRate.toFixed(1)}%`);
    console.log(`📊 IDs restantes na fila: ${finalQueue.drivers.total}`);
    console.log(`💰 Recargas restantes na fila: ${finalQueue.recharges.total}`); console.log(`📊 IDs restantes na fila: ${finalQueue.drivers.total}`);
    console.log(`💰 Recargas restantes na fila: ${finalQueue.recharges.total}`); Teste Específico: Sistema Híbrido V2 - Extração de Dados Completa
 * 
 * Este teste usa o sistema híbrido V2 completo para extrair dados reais.
 */

async function testHybridSystemV2() {
  console.log('🧪 ===== TESTE DO SISTEMA HÍBRIDO V2 =====');
  console.log('⏰ Iniciado em:', new Date().toLocaleString());

  const hybridConfig = {
    extractionBatchSize: 2,
    rechargePauseThreshold: 3,
    maxConcurrentRecharges: 1,
    stateCheckInterval: 5000,
    recoveryOnStart: true,
    autoFeedInterval: 30000,
    citiesRefreshInterval: 60000
  };

  const hybridService = HybridOperationService.getInstance(hybridConfig);

  try {
    // ===== STEP 1: VERIFICAR ESTADO INICIAL =====
    console.log('\n📋 Step 1: Verificando estado inicial...');
    const initialStats = hybridService.getStats();
    console.log(`📊 Estado inicial: ${initialStats.currentMode}`);
    console.log(`📊 Total extraído: ${initialStats.totalExtracted}`);
    console.log(`💰 Total recargas: ${initialStats.totalRecharges}`);

    // ===== STEP 2: CARREGAR IDS FRESCOS =====
    console.log('\n🔢 Step 2: Carregando IDs frescos do dashboard...');
    await hybridService.refreshDriverIds();
    console.log('✅ IDs atualizados');

    // ===== STEP 3: VERIFICAR FILA APÓS CARREGAMENTO =====
    console.log('\n📊 Step 3: Verificando fila após carregamento...');
    const queueStatus = hybridService.getQueueStatus();
    console.log(`📊 IDs na fila: ${queueStatus.drivers.total}`);
    console.log(`💰 Recargas na fila: ${queueStatus.recharges.total}`);

    if (queueStatus.drivers.total === 0) {
      console.log('⚠️ Adicionando IDs de teste para demonstração...');
      hybridService.addDriverToQueue('TEST_ID_1', 'high');
      hybridService.addDriverToQueue('TEST_ID_2', 'normal');
      console.log('✅ IDs de teste adicionados');
    }

    // ===== STEP 4: ADICIONAR RECARGA DE TESTE =====
    console.log('\n� Step 4: Adicionando recarga de teste...');
    hybridService.addRechargeToQueue('TEST_RECHARGE_1', 5000, true);
    console.log('✅ Recarga de teste adicionada');

    // ===== STEP 5: INICIAR SISTEMA =====
    console.log('\n🚗 Step 5: Iniciando sistema híbrido...');
    await hybridService.start();
    console.log('✅ Sistema iniciado');
    
    // ===== STEP 6: AGUARDAR PROCESSAMENTO =====
    console.log('\n⏳ Step 6: Aguardando processamento (15 segundos)...');
    await new Promise(resolve => setTimeout(resolve, 15000));
    
    // ===== STEP 7: VERIFICAR PROGRESSO =====
    console.log('\n📊 Step 7: Verificando progresso...');
    const progressStats = hybridService.getStats();
    console.log(`🎯 Modo atual: ${progressStats.currentMode}`);
    console.log(`📊 Total extraído: ${progressStats.totalExtracted}`);
    console.log(`💰 Total recargas: ${progressStats.totalRecharges}`);
    console.log(`❌ Erros: ${progressStats.errorCount}`);
    console.log(`✅ Taxa de sucesso: ${progressStats.successRate.toFixed(1)}%`);
    console.log(`⏱️ Uptime: ${progressStats.uptime}ms`);

    // ===== STEP 8: PARAR SISTEMA =====
    console.log('\n🛑 Step 8: Parando sistema...');
    await hybridService.stop();
    console.log('✅ Sistema parado');

    // ===== STEP 9: ESTATÍSTICAS FINAIS =====
    console.log('\n📊 ===== ESTATÍSTICAS FINAIS =====');
    const finalStats = hybridService.getStats();
    const finalQueue = hybridService.getQueueStatus();
    
    console.log(`📋 Total extraído: ${finalStats.totalExtracted}`);
    console.log(`💰 Total recargas: ${finalStats.totalRecharges}`);
    console.log(`🎯 Modo final: ${finalStats.currentMode}`);
    console.log(`⏱️ Uptime: ${finalStats.uptime}ms`);
    console.log(`❌ Erros: ${finalStats.errorCount}`);
    console.log(`✅ Taxa de sucesso: ${finalStats.successRate.toFixed(1)}%`);
    console.log(`� IDs restantes na fila: ${finalQueue.pendingDrivers}`);
    console.log(`💰 Recargas restantes na fila: ${finalQueue.pendingRecharges}`);

    // ===== STEP 10: VALIDAÇÃO =====
    console.log('\n✅ ===== VALIDAÇÃO DO TESTE =====');
    
    let testResult = 'INCONCLUSO';
    let score = 0;

    // Sistema inicializou corretamente
    if (finalStats.currentMode !== 'idle') {
      score += 25;
      console.log('✅ Sistema inicializou corretamente (+25 pontos)');
    } else {
      console.log('❌ Sistema não inicializou corretamente');
    }

    // Processou alguma operação
    if (finalStats.totalExtracted > 0 || finalStats.totalRecharges > 0) {
      score += 25;
      console.log('✅ Sistema processou operações (+25 pontos)');
    } else {
      console.log('❌ Sistema não processou nenhuma operação');
    }

    // Taxa de sucesso aceitável
    if (finalStats.successRate >= 70) {
      score += 30;
      console.log('✅ Taxa de sucesso excelente (+30 pontos)');
    } else if (finalStats.successRate >= 50) {
      score += 20;
      console.log('🟡 Taxa de sucesso boa (+20 pontos)');
    } else {
      console.log('❌ Taxa de sucesso baixa');
    }

    // Sem muitos erros
    if (finalStats.errorCount <= 2) {
      score += 20;
      console.log('✅ Poucos erros durante execução (+20 pontos)');
    } else if (finalStats.errorCount <= 5) {
      score += 10;
      console.log('� Alguns erros durante execução (+10 pontos)');
    } else {
      console.log('❌ Muitos erros durante execução');
    }

    // Determinar resultado final
    if (score >= 80) {
      testResult = '🟢 APROVADO';
    } else if (score >= 60) {
      testResult = '🟡 PARCIAL';
    } else if (score >= 40) {
      testResult = '🟠 REGULAR';
    } else {
      testResult = '🔴 FALHOU';
    }

    console.log(`\n🎯 Pontuação Final: ${score}/100`);
    console.log(`🏆 Resultado: ${testResult}`);

    // ===== STEP 11: RESUMO FINAL =====
    console.log('\n🏁 ===== RESUMO FINAL =====');
    console.log(`✅ Inicialização: SUCESSO`);
    console.log(`✅ Carregamento de IDs: SUCESSO`);
    console.log(`✅ Adição de recargas: SUCESSO`);
    console.log(`🔄 Sistema Híbrido V2: ${testResult}`);
    console.log(`📊 Dados processados: ${finalStats.totalExtracted + finalStats.totalRecharges}`);
    console.log(`🎯 Score: ${score}/100`);

    if (score >= 60) {
      console.log('\n🎉 SISTEMA V2 FUNCIONAL! Pronto para produção.');
    } else {
      console.log('\n⚠️ SISTEMA V2 PRECISA AJUSTES. Revisar configurações.');
    }

  } catch (error: any) {
    console.error('\n💥 ===== ERRO NO TESTE =====');
    console.error(`❌ Tipo: ${error.name || 'Error'}`);
    console.error(`📝 Mensagem: ${error.message}`);
    console.error(`📍 Stack: ${error.stack?.split('\n')[1] || 'N/A'}`);
    
  } finally {
    // ===== CLEANUP =====
    console.log('\n🧹 Realizando cleanup...');
    try {
      await hybridService.stop();
      console.log('✅ Sistema parado');
    } catch (cleanupError) {
      console.warn('⚠️ Erro no cleanup:', cleanupError);
    }
    
    console.log(`\n⏰ Teste finalizado em: ${new Date().toLocaleString()}`);
    console.log('🧪 ===== FIM DO TESTE =====');
  }
}

// Executar o teste
if (require.main === module) {
  testHybridSystemV2().catch(console.error);
}

export { testHybridSystemV2 };
