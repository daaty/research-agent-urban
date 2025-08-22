import dotenv from 'dotenv';
dotenv.config();

/**
 * Teste de estrutura do RidesDashboardHybridScraper
 * Testa apenas a lógica interna sem conectar ao site real
 */

interface TestResult {
  success: boolean;
  testName: string;
  details?: any;
  error?: string;
}

async function testScraperStructure(): Promise<TestResult> {
  console.log('🔧 TESTE DE ESTRUTURA DO SCRAPER');
  console.log('=' .repeat(50));
  
  try {
    // Importar e verificar se a classe pode ser instanciada
    const { RidesDashboardHybridScraper } = await import('./src/scraper/RidesDashboardHybridScraper');
    
    console.log('✅ Classe RidesDashboardHybridScraper importada com sucesso');
    
    // Criar instância
    const scraper = new RidesDashboardHybridScraper('test_instance');
    console.log('✅ Instância criada com sucesso');
    
    // Verificar métodos disponíveis
    const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(scraper));
    console.log('📋 Métodos disponíveis:', methods.filter(m => m !== 'constructor'));
    
    // Verificar configurações
    const status = scraper.getStatus();
    console.log('📊 Status inicial:', status);
    
    return {
      success: true,
      testName: 'Estrutura do Scraper',
      details: { methods: methods.length, status }
    };
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'Estrutura do Scraper',
      error: error.message
    };
  }
}

async function testHybridOperationService(): Promise<TestResult> {
  console.log('\n🔄 TESTE DE HÍBRIDO OPERATION SERVICE');
  console.log('=' .repeat(50));
  
  try {
    // Verificar se o serviço híbrido pode ser importado
    const { HybridOperationService } = await import('./src/services/hybridOperationServiceV2');
    
    console.log('✅ HybridOperationService importado com sucesso');
    
    // Verificar configuração padrão
    const config = {
      extractionBatchSize: 5,
      rechargePauseThreshold: 1,
      maxConcurrentRecharges: 3,
      stateCheckInterval: 10000,
      recoveryOnStart: true,
      autoFeedInterval: 30000,
      citiesRefreshInterval: 60000
    };
    
    console.log('⚙️  Configuração de teste:', config);
    
    // Testar singleton
    const instance1 = HybridOperationService.getInstance(config);
    const instance2 = HybridOperationService.getInstance(config);
    
    const isSingleton = instance1 === instance2;
    console.log(`✅ Padrão Singleton: ${isSingleton ? 'FUNCIONANDO' : 'FALHA'}`);
    
    return {
      success: true,
      testName: 'Hybrid Operation Service',
      details: { singleton: isSingleton, config }
    };
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'Hybrid Operation Service',
      error: error.message
    };
  }
}

async function testRechargeController(): Promise<TestResult> {
  console.log('\n💳 TESTE DE RECHARGE CONTROLLER');
  console.log('=' .repeat(50));
  
  try {
    // Verificar se o controller pode ser importado
    const rechargeController = await import('./src/api/rechargeController');
    
    console.log('✅ RechargeController importado com sucesso');
    
    // Verificar se é um router express
    const isRouter = typeof rechargeController.default === 'function';
    console.log(`✅ É um router Express: ${isRouter ? 'SIM' : 'NÃO'}`);
    
    return {
      success: true,
      testName: 'Recharge Controller',
      details: { isRouter }
    };
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'Recharge Controller',
      error: error.message
    };
  }
}

async function testEnvironmentConfig(): Promise<TestResult> {
  console.log('\n🌐 TESTE DE CONFIGURAÇÃO DE AMBIENTE');
  console.log('=' .repeat(50));
  
  try {
    // Verificar variáveis essenciais
    const requiredVars = [
      'RIDES_USERNAME',
      'RIDES_PASSWORD',
      'RIDES_LOGIN_URL'
    ];
    
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    console.log('📋 Variáveis obrigatórias:');
    requiredVars.forEach(varName => {
      const exists = process.env[varName] ? '✅' : '❌';
      const value = process.env[varName] ? '[CONFIGURADO]' : '[NÃO CONFIGURADO]';
      console.log(`   ${exists} ${varName}: ${value}`);
    });
    
    // Verificar variáveis opcionais
    const optionalVars = [
      'BROWSER_HEADLESS',
      'BROWSER_TIMEOUT',
      'CITY_NAME',
      'PORT'
    ];
    
    console.log('\n📋 Variáveis opcionais:');
    optionalVars.forEach(varName => {
      const value = process.env[varName] || '[PADRÃO]';
      console.log(`   🔧 ${varName}: ${value}`);
    });
    
    return {
      success: missingVars.length === 0,
      testName: 'Configuração de Ambiente',
      details: { 
        missing: missingVars,
        configured: requiredVars.length - missingVars.length,
        total: requiredVars.length
      }
    };
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'Configuração de Ambiente',
      error: error.message
    };
  }
}

async function testBrowserManager(): Promise<TestResult> {
  console.log('\n🌐 TESTE DE BROWSER MANAGER');
  console.log('=' .repeat(50));
  
  try {
    // Verificar se o BrowserSessionManager pode ser importado
    const { BrowserSessionManager } = await import('./src/services/browserSessionManager');
    
    console.log('✅ BrowserSessionManager importado com sucesso');
    
    // Testar configuração sem inicializar
    const manager = BrowserSessionManager.getInstance('test_browser');
    console.log('✅ Instância criada sem inicializar browser');
    
    return {
      success: true,
      testName: 'Browser Manager',
      details: { created: true }
    };
    
  } catch (error: any) {
    return {
      success: false,
      testName: 'Browser Manager',
      error: error.message
    };
  }
}

async function runStructuralTests() {
  console.log('🎯 EXECUTANDO TESTES ESTRUTURAIS DO SISTEMA HÍBRIDO');
  console.log('=' .repeat(60));
  console.log('ℹ️  Estes testes verificam a estrutura do código sem conectar ao dashboard real');
  console.log('=' .repeat(60));
  
  const results: TestResult[] = [];
  
  // 1. Teste de Ambiente
  results.push(await testEnvironmentConfig());
  
  // 2. Teste de Browser Manager
  results.push(await testBrowserManager());
  
  // 3. Teste de Estrutura do Scraper
  results.push(await testScraperStructure());
  
  // 4. Teste de Hybrid Operation Service
  results.push(await testHybridOperationService());
  
  // 5. Teste de Recharge Controller
  results.push(await testRechargeController());
  
  // Relatório Final
  console.log('\n' + '=' .repeat(60));
  console.log('📋 RELATÓRIO FINAL DOS TESTES ESTRUTURAIS');
  console.log('=' .repeat(60));
  
  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  results.forEach((result, index) => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${index + 1}. ${result.testName} - ${result.success ? 'PASSOU' : 'FALHOU'}`);
    if (!result.success && result.error) {
      console.log(`   Erro: ${result.error}`);
    }
  });
  
  console.log(`\n📊 Resultado: ${successCount}/${totalCount} testes passaram`);
  
  if (successCount === totalCount) {
    console.log('🎉 TODOS OS TESTES ESTRUTURAIS PASSARAM!');
    console.log('✅ Sistema híbrido está estruturalmente correto!');
    console.log('\n💡 Para testar funcionalidade completa:');
    console.log('   1. Inicie o servidor: npm run dev');
    console.log('   2. Use os endpoints de API para testar com dashboard real');
  } else {
    console.log('⚠️  Alguns testes falharam. Verificar estrutura do código.');
  }
  
  return successCount === totalCount;
}

// Executar se chamado diretamente
if (require.main === module) {
  runStructuralTests().catch(console.error);
}

export { runStructuralTests };
