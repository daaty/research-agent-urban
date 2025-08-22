import { HybridOperationService } from './src/services/hybridOperationServiceV2';

/**
 * TESTE OFICIAL: Sistema Híbrido V2 - Melhorado
 * 
 * Este teste usa apenas o sistema híbrido V2 para validar 
 * a extração completa de dados com recargas inteligentes.
 */

async function testHybridSystemV2() {
  console.log('🧪 ===== TESTE OFICIAL - SISTEMA HÍBRIDO V2 =====');
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

    // ===== STEP 3: VERIFICAR FILA =====
    console.log('\n📊 Step 3: Verificando fila...');
    const queueStatus = hybridService.getQueueStatus();
    console.log(`📊 IDs na fila: ${queueStatus.drivers.total}`);
    console.log(`💰 Recargas na fila: ${queueStatus.recharges.total}`);

    if (queueStatus.drivers.total === 0) {
      console.log('⚠️ Adicionando IDs de teste...');
      hybridService.addDriverToQueue('TEST_ID_1', 'high');
      hybridService.addDriverToQueue('TEST_ID_2', 'normal');
      console.log('✅ IDs de teste adicionados');
    }

    // ===== STEP 4: ADICIONAR RECARGA =====
    console.log('\n💰 Step 4: Adicionando recarga de teste...');
    hybridService.addRechargeToQueue('TEST_RECHARGE_1', 5000, true);
    console.log('✅ Recarga adicionada');

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
    console.log(`📊 IDs restantes: ${finalQueue.drivers.total}`);
    console.log(`💰 Recargas restantes: ${finalQueue.recharges.total}`);

    // ===== STEP 10: VALIDAÇÃO =====
    console.log('\n✅ ===== VALIDAÇÃO =====');
    
    let testResult = 'INCONCLUSO';
    let score = 0;

    // Sistema inicializou corretamente
    if (finalStats.currentMode !== 'idle') {
      score += 25;
      console.log('✅ Sistema funcionou (+25 pontos)');
    } else {
      console.log('❌ Sistema não funcionou');
    }

    // Processou alguma operação
    if (finalStats.totalExtracted > 0 || finalStats.totalRecharges > 0) {
      score += 25;
      console.log('✅ Processou operações (+25 pontos)');
    } else {
      console.log('❌ Não processou operações');
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

    // Poucos erros
    if (finalStats.errorCount <= 2) {
      score += 20;
      console.log('✅ Poucos erros (+20 pontos)');
    } else if (finalStats.errorCount <= 5) {
      score += 10;
      console.log('🟡 Alguns erros (+10 pontos)');
    } else {
      console.log('❌ Muitos erros');
    }

    // Resultado final
    if (score >= 80) {
      testResult = '🟢 APROVADO';
    } else if (score >= 60) {
      testResult = '🟡 PARCIAL';
    } else if (score >= 40) {
      testResult = '🟠 REGULAR';
    } else {
      testResult = '🔴 FALHOU';
    }

    console.log(`\n🎯 Pontuação: ${score}/100`);
    console.log(`🏆 Resultado: ${testResult}`);

    // ===== RESUMO FINAL =====
    console.log('\n🏁 ===== RESUMO FINAL =====');
    console.log(`✅ Sistema V2: ${testResult}`);
    console.log(`📊 Score: ${score}/100`);
    console.log(`🔄 Processamentos: ${finalStats.totalExtracted + finalStats.totalRecharges}`);

    if (score >= 60) {
      console.log('\n🎉 SISTEMA V2 FUNCIONAL! ✅');
    } else {
      console.log('\n⚠️ SISTEMA V2 PRECISA AJUSTES! ❌');
    }

  } catch (error: any) {
    console.error('\n💥 ===== ERRO =====');
    console.error(`❌ Erro: ${error.message}`);
    console.error(`📍 Stack: ${error.stack?.split('\n')[1] || 'N/A'}`);
    
  } finally {
    // ===== CLEANUP =====
    console.log('\n🧹 Cleanup...');
    try {
      await hybridService.stop();
      console.log('✅ Sistema parado');
    } catch (cleanupError) {
      console.warn('⚠️ Erro no cleanup:', cleanupError);
    }
    
    console.log(`\n⏰ Finalizado: ${new Date().toLocaleString()}`);
    console.log('🧪 ===== FIM DO TESTE =====');
  }
}

// Executar o teste
if (require.main === module) {
  testHybridSystemV2().catch(console.error);
}

export { testHybridSystemV2 };
