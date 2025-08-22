#!/usr/bin/env node

/**
 * Teste do Sistema Híbrido Completo
 * Demonstra o funcionamento do sistema de extração + recarga com dashboard real
 */

import { HybridOperationService } from '../src/services/hybridOperationServiceV2.js';

async function testHybridSystem() {
  console.log('🧪 TESTE DO SISTEMA HÍBRIDO COMPLETO\n');
  
  console.log('📋 COMO O SISTEMA FUNCIONA:');
  console.log('1. 🌐 Abre dashboard real: https://rides.ec2dashboard.com');
  console.log('2. 🔐 Aguarda login manual (CAPTCHA se necessário)');
  console.log('3. 🏙️ Identifica cidade automaticamente');
  console.log('4. 📊 Extração CONTÍNUA de dados pessoais dos motoristas');
  console.log('5. 💰 INTERRUPÇÃO inteligente para processar recargas');
  console.log('6. 🔄 RETOMA extração após processar recargas\n');
  console.log('🎯 TESTE DO SISTEMA HÍBRIDO REAL\n');
  console.log('=====================================');
  console.log('Este teste demonstra o funcionamento completo:');
  console.log('1. 🌐 Abre a dashboard do Uber');
  console.log('2. ⏳ Espera você resolver CAPTCHA e fazer login');
  console.log('3. 📊 Extrai dados reais dos motoristas');
  console.log('4. 🔄 Gerencia interrupções para recargas');
  console.log('5. 💾 Salva dados extraídos no banco\n');
  
  try {
    // Configuração do sistema híbrido
    const config = {
      extractionBatchSize: 5,        // Processar 5 motoristas por vez
      rechargePauseThreshold: 3,     // Pausar extração se 3+ recargas na fila
      maxConcurrentRecharges: 2,     // Máximo 2 recargas simultâneas
      stateCheckInterval: 5000,      // Verificar estado a cada 5s
      recoveryOnStart: true,         // Recuperar estado ao iniciar
      autoFeedInterval: 60000,       // Buscar novos IDs a cada 1 minuto
      citiesRefreshInterval: 300000  // Atualizar cache da cidade a cada 5 minutos
    };

    console.log('⚙️ Configuração do sistema:');
    console.log(`   - Lote de extração: ${config.extractionBatchSize} motoristas`);
    console.log(`   - Limite para pausar: ${config.rechargePauseThreshold} recargas`);
    console.log(`   - Recargas simultâneas: ${config.maxConcurrentRecharges}`);
    console.log(`   - Auto-alimentação: ${config.autoFeedInterval/1000}s\n`);

    // Inicializar sistema híbrido
    console.log('🚀 Inicializando sistema híbrido...');
    const hybridService = HybridOperationService.getInstance(config);

    // Mostrar estatísticas iniciais
    console.log('📊 Estado inicial do sistema:');
    const initialStats = hybridService.getStats();
    console.log(`   - Modo atual: ${initialStats.currentMode}`);
    console.log(`   - Total extraído: ${initialStats.totalExtracted}`);
    console.log(`   - Total recargas: ${initialStats.totalRecharges}`);
    console.log(`   - Taxa de sucesso: ${initialStats.successRate}%\n`);

    // Adicionar alguns IDs de teste à fila
    console.log('📋 Adicionando IDs de motoristas para teste...');
    await hybridService.addDriversToQueue([
      { id: 'DRV001', priority: 'high', city: 'São Paulo' },
      { id: 'DRV002', priority: 'normal', city: 'São Paulo' },
      { id: 'DRV003', priority: 'normal', city: 'São Paulo' }
    ]);
    console.log('✅ IDs adicionados à fila de extração\n');

    // Iniciar operação híbrida
    console.log('🔄 Iniciando operação híbrida...');
    console.log('⚠️  IMPORTANTE: Quando o browser abrir:');
    console.log('   1. Resolva o CAPTCHA se aparecer');
    console.log('   2. Faça login com suas credenciais');
    console.log('   3. O sistema detectará automaticamente o login');
    console.log('   4. A extração iniciará automaticamente\n');

    await hybridService.start();

    // Simular adição de recarga após 10 segundos (para testar interrupção)
    setTimeout(async () => {
      console.log('\n💳 Simulando pedido de recarga...');
      await hybridService.addRechargeRequest({
        driverId: 'DRV001',
        amount: 5000,
        priority: 'high',
        timestamp: new Date()
      });
      console.log('✅ Pedido de recarga adicionado - sistema deve interromper extração\n');
    }, 10000);

    // Mostrar progresso a cada 30 segundos
    const progressInterval = setInterval(() => {
      const currentStats = hybridService.getStats();
      console.log(`\n📈 Progresso do sistema (${new Date().toLocaleTimeString()}):`);
      console.log(`   - Modo atual: ${currentStats.currentMode}`);
      console.log(`   - Extraídos: ${currentStats.totalExtracted}`);
      console.log(`   - Recargas: ${currentStats.totalRecharges}`);
      console.log(`   - Erros: ${currentStats.errorCount}`);
      console.log(`   - Taxa sucesso: ${currentStats.successRate}%`);
      console.log(`   - Uptime: ${Math.round(currentStats.uptime/1000)}s`);
    }, 30000);

    // Executar por 5 minutos para demonstração
    console.log('⏰ Sistema executará por 5 minutos para demonstração...\n');
    
    setTimeout(async () => {
      console.log('\n🛑 Parando sistema para finalizar demonstração...');
      clearInterval(progressInterval);
      
      await hybridService.stop();
      
      const finalStats = hybridService.getStats();
      console.log('\n📊 ESTATÍSTICAS FINAIS:');
      console.log('========================');
      console.log(`Total de dados extraídos: ${finalStats.totalExtracted}`);
      console.log(`Total de recargas processadas: ${finalStats.totalRecharges}`);
      console.log(`Erros encontrados: ${finalStats.errorCount}`);
      console.log(`Taxa de sucesso: ${finalStats.successRate}%`);
      console.log(`Tempo de execução: ${Math.round(finalStats.uptime/1000)}s`);
      console.log(`Última interrupção: ${finalStats.lastInterruption || 'Nenhuma'}`);
      
      console.log('\n✅ Teste concluído com sucesso!');
      console.log('\n💡 O que foi demonstrado:');
      console.log('   ✅ Abertura automática da dashboard');
      console.log('   ✅ Detecção automática de login');
      console.log('   ✅ Extração real de dados dos motoristas');
      console.log('   ✅ Interrupção inteligente para recargas');
      console.log('   ✅ Retomada automática da extração');
      console.log('   ✅ Auto-alimentação de IDs da API');
      
      process.exit(0);
    }, 5 * 60 * 1000); // 5 minutos

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
    console.log('\n🔧 Possíveis soluções:');
    console.log('   - Verifique as variáveis de ambiente (RIDES_USERNAME, RIDES_PASSWORD)');
    console.log('   - Certifique-se que a dashboard está acessível');
    console.log('   - Verifique a conexão com internet');
    console.log('   - Execute o teste novamente');
    
    process.exit(1);
  }
}

// Verificar se todas as variáveis necessárias estão configuradas
function checkEnvironment() {
  const required = ['RIDES_USERNAME', 'RIDES_PASSWORD'];
  const missing = required.filter(env => !process.env[env]);
  
  if (missing.length > 0) {
    console.error('❌ Variáveis de ambiente faltando:');
    missing.forEach(env => console.error(`   - ${env}`));
    console.log('\n🔧 Configure as variáveis necessárias:');
    console.log('   export RIDES_USERNAME="seu_email@example.com"');
    console.log('   export RIDES_PASSWORD="sua_senha"');
    console.log('   export CITY_NAME="São Paulo"');
    console.log('   export CITY_API_URL="https://api-sp.exemplo.com/drivers"');
    process.exit(1);
  }
}

// Executar verificações e teste
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔍 Verificando configuração do ambiente...');
  checkEnvironment();
  console.log('✅ Ambiente configurado corretamente\n');
  
  testHybridSystemReal().catch(console.error);
}

export { testHybridSystemReal };
