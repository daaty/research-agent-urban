import axios from 'axios';

/**
 * Script de teste para validar o sistema híbrido completo
 * Testa a integração entre:
 * - RidesDashboardHybridScraper
 * - HybridOperationServiceV2 
 * - RechargeController (API interna)
 */

const BASE_URL = 'http://localhost:3000';

interface TestResult {
  endpoint: string;
  success: boolean;
  data?: any;
  error?: string;
}

async function testEndpoint(endpoint: string, method: 'GET' | 'POST' = 'GET', data?: any): Promise<TestResult> {
  try {
    console.log(`\n🧪 Testando: ${method} ${endpoint}`);
    
    const response = method === 'GET' 
      ? await axios.get(`${BASE_URL}${endpoint}`)
      : await axios.post(`${BASE_URL}${endpoint}`, data);
    
    console.log(`✅ Sucesso:`, response.data);
    return {
      endpoint,
      success: true,
      data: response.data
    };
    
  } catch (error: any) {
    const errorMsg = error.response?.data?.error || error.message;
    console.log(`❌ Erro:`, errorMsg);
    return {
      endpoint,
      success: false,
      error: errorMsg
    };
  }
}

async function runHybridSystemTests() {
  console.log('🚀 INICIANDO TESTES DO SISTEMA HÍBRIDO COMPLETO');
  console.log('=' .repeat(60));
  
  const results: TestResult[] = [];
  
  // 1. Teste de Status Geral
  console.log('\n📊 1. TESTE DE STATUS GERAL');
  results.push(await testEndpoint('/api/status'));
  
  // 2. Teste de Solicitação de Recarga
  console.log('\n🔋 2. TESTE DE SOLICITAÇÃO DE RECARGA');
  results.push(await testEndpoint('/api/recharge/request', 'POST', {
    driverId: 'TEST_DRIVER_001',
    amount: 50.00,
    priority: 'high'
  }));
  
  // 3. Teste de Status da Recarga
  console.log('\n📈 3. TESTE DE STATUS DE RECARGA');
  results.push(await testEndpoint('/api/recharge/status'));
  
  // 4. Teste de Parar Sistema
  console.log('\n⏹️ 4. TESTE DE PARAR SISTEMA');
  results.push(await testEndpoint('/api/recharge/stop', 'POST'));
  
  // 5. Aguardar um momento
  console.log('\n⏳ Aguardando 2 segundos...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // 6. Teste de Reiniciar Sistema
  console.log('\n▶️ 6. TESTE DE REINICIAR SISTEMA');
  results.push(await testEndpoint('/api/recharge/start', 'POST'));
  
  // 7. Teste de Limpeza do Sistema
  console.log('\n🧹 7. TESTE DE LIMPEZA DO SISTEMA');
  results.push(await testEndpoint('/api/system/cleanup', 'POST'));
  
  // 8. Resultado Final
  console.log('\n' + '=' .repeat(60));
  console.log('📋 RELATÓRIO FINAL DOS TESTES');
  console.log('=' .repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.endpoint} - ${result.success ? 'PASSOU' : 'FALHOU'}`);
    if (!result.success && result.error) {
      console.log(`   Erro: ${result.error}`);
    }
  });
  
  console.log(`\n📊 Resultado: ${successCount}/${totalCount} testes passaram`);
  
  if (successCount === totalCount) {
    console.log('🎉 TODOS OS TESTES PASSARAM! Sistema híbrido funcionando perfeitamente!');
  } else {
    console.log('⚠️  Alguns testes falharam. Verificar logs acima para detalhes.');
  }
  
  return {
    success: successCount === totalCount,
    passed: successCount,
    total: totalCount,
    results
  };
}

// Validação do ambiente
async function validateEnvironment() {
  console.log('🔍 VALIDANDO AMBIENTE...');
  
  try {
    const response = await axios.get(`${BASE_URL}/api/status`);
    console.log('✅ Servidor está rodando');
    return true;
  } catch (error) {
    console.log('❌ Servidor não está rodando. Execute: npm run dev');
    return false;
  }
}

// Execução principal
async function main() {
  const environmentOK = await validateEnvironment();
  
  if (!environmentOK) {
    console.log('\n🚨 Por favor, inicie o servidor primeiro:');
    console.log('   npm run dev');
    process.exit(1);
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 SISTEMA HÍBRIDO - TESTE COMPLETO');
  console.log('Dashboard: rides.ec2dashboard.com');
  console.log('API Interna: Controle de Recargas');
  console.log('=' .repeat(60));
  
  const finalResult = await runHybridSystemTests();
  
  process.exit(finalResult.success ? 0 : 1);
}

// Tratar erros não capturados
process.on('unhandledRejection', (error) => {
  console.error('❌ Erro não tratado:', error);
  process.exit(1);
});

// Executar se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

export { runHybridSystemTests, validateEnvironment };
    const config = {
      extractionBatchSize: 3,
      rechargePauseThreshold: 2,
      maxConcurrentRecharges: 2,
      stateCheckInterval: 3000,
      recoveryOnStart: true,
      autoFeedInterval: 10000, // 10 segundos para teste
      citiesRefreshInterval: 30000 // 30 segundos para teste
    };

    // Obter instância do serviço híbrido
    const hybridService = HybridOperationService.getInstance(config);
    
    console.log('📋 FASE 1: Configurando cidades de exemplo');
    // Configurar algumas cidades de exemplo
    const driverProvider = DriverIdProvider.getInstance();
    
    // Adicionar cidades de teste (URLs fictícias para demonstração)
    hybridService.addCity('São Paulo', 'https://api-teste-sp.com/drivers', 1);
    hybridService.addCity('Rio de Janeiro', 'https://api-teste-rj.com/drivers', 1);
    hybridService.addCity('Belo Horizonte', 'https://api-teste-bh.com/drivers', 2);
    
    console.log('\n📋 FASE 2: Adicionando motoristas à fila de extração');
    // Adicionar alguns motoristas para extração
    hybridService.addDriverToQueue('DRV001', 'normal');
    hybridService.addDriverToQueue('DRV002', 'normal');
    hybridService.addDriverToQueue('DRV003', 'high');
    hybridService.addDriverToQueue('DRV004', 'normal');
    hybridService.addDriverToQueue('DRV005', 'high');
    
    console.log('\n💳 FASE 3: Adicionando algumas recargas iniciais');
    // Adicionar algumas recargas
    hybridService.addRechargeToQueue('DRV006', 50.00, false);
    hybridService.addRechargeToQueue('DRV007', 100.00, false);
    
    console.log('\n🎯 FASE 4: Iniciando sistema híbrido');
    // Iniciar sistema
    await hybridService.start();
    
    // Simular chegada de recargas durante operação
    setTimeout(() => {
      console.log('\n⚡ SIMULANDO: Chegada de recarga urgente');
      hybridService.addRechargeToQueue('DRV999', 200.00, true);
    }, 8000);
    
    setTimeout(() => {
      console.log('\n📈 SIMULANDO: Mais motoristas adicionados');
      hybridService.addDriverToQueue('DRV010', 'normal');
      hybridService.addDriverToQueue('DRV011', 'high');
    }, 12000);
    
    setTimeout(() => {
      console.log('\n💰 SIMULANDO: Mais recargas chegando');
      hybridService.addRechargeToQueue('DRV012', 75.00, false);
      hybridService.addRechargeToQueue('DRV013', 150.00, true);
    }, 18000);
    
    // Mostrar estatísticas a cada 5 segundos
    const statsInterval = setInterval(() => {
      console.log('\n📊 ESTATÍSTICAS ATUAIS:');
      const stats = hybridService.getStats();
      console.log(`   - Modo atual: ${stats.currentMode}`);
      console.log(`   - Total extraído: ${stats.totalExtracted}`);
      console.log(`   - Total recargas: ${stats.totalRecharges}`);
      console.log(`   - Erros: ${stats.errorCount}`);
      
      const queueStatus = hybridService.getQueueStatus();
      console.log(`   - Fila extração: ${queueStatus.drivers.total} motoristas`);
      console.log(`   - Fila recargas: ${queueStatus.recharges.pending} pendentes`);
    }, 5000);
    
    // Parar teste após 30 segundos
    setTimeout(async () => {
      console.log('\n🛑 FASE 5: Parando sistema híbrido');
      clearInterval(statsInterval);
      await hybridService.stop();
      
      // Estatísticas finais
      console.log('\n🏁 ESTATÍSTICAS FINAIS:');
      const finalStats = hybridService.getStats();
      console.log(`   - Total extraído: ${finalStats.totalExtracted}`);
      console.log(`   - Total recargas: ${finalStats.totalRecharges}`);
      console.log(`   - Erros: ${finalStats.errorCount}`);
      console.log(`   - Taxa de sucesso: ${finalStats.successRate}%`);
      
      const finalQueue = hybridService.getQueueStatus();
      console.log(`   - Pendentes extração: ${finalQueue.drivers.total}`);
      console.log(`   - Pendentes recargas: ${finalQueue.recharges.pending}`);
      
      console.log('\n✅ TESTE CONCLUÍDO COM SUCESSO!');
      process.exit(0);
    }, 30000);
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
    process.exit(1);
  }
}

/**
 * Teste específico de recuperação de estado
 */
async function testStateRecovery() {
  console.log('🔄 TESTE DE RECUPERAÇÃO DE ESTADO');
  console.log('==================================\n');
  
  const hybridService = HybridOperationService.getInstance();
  
  // Adicionar alguns itens
  hybridService.addDriverToQueue('REC001', 'normal');
  hybridService.addDriverToQueue('REC002', 'high');
  hybridService.addRechargeToQueue('REC003', 100.00, false);
  
  // Iniciar por um curto período
  await hybridService.start();
  
  setTimeout(async () => {
    console.log('💾 Salvando estado e parando...');
    await hybridService.stop();
    
    setTimeout(async () => {
      console.log('🔄 Reiniciando com recuperação...');
      const newService = HybridOperationService.getInstance();
      await newService.start();
      
      setTimeout(async () => {
        await newService.stop();
        console.log('✅ Teste de recuperação concluído!');
        process.exit(0);
      }, 5000);
    }, 2000);
  }, 10000);
}

// Executar teste baseado no argumento
const testType = process.argv[2] || 'hybrid';

if (testType === 'recovery') {
  testStateRecovery();
} else {
  testHybridSystem();
}

// Tratamento de sinais para parada graciosa
process.on('SIGINT', async () => {
  console.log('\n🛑 Recebido SIGINT, parando sistema...');
  try {
    const hybridService = HybridOperationService.getInstance();
    await hybridService.stop();
    process.exit(0);
  } catch (error) {
    console.error('Erro ao parar:', error);
    process.exit(1);
  }
});
