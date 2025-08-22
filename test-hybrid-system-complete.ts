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
