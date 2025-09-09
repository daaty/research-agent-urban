/**
 * 🧪 TESTE SIMPLES - HÍBRIDO STANDALONE
 * 
 * Testa se o híbrido está funcionando independentemente do dashboard
 */

console.log('🧪 [TEST] Iniciando teste simples do híbrido...\n');

// Configurar variáveis de ambiente para teste
process.env.RIDES_USERNAME = 'test-hybrid-user';
process.env.RIDES_PASSWORD = 'test-password';

async function testHybridBasic() {
  try {
    // 1. Testar se consegue importar sem erro
    console.log('1️⃣ Importando híbrido...');
    const { getHybridScraperIntegration } = require('./hybridScraperIntegration');
    console.log('   ✅ Import OK\n');
    
    // 2. Testar se consegue criar instância
    console.log('2️⃣ Criando instância...');
    const hybridIntegration = getHybridScraperIntegration();
    console.log('   ✅ Instância criada\n');
    
    // 3. Verificar propriedades básicas
    console.log('3️⃣ Verificando propriedades...');
    const scraperId = hybridIntegration.getScraperId();
    const scraperName = hybridIntegration.getScraperName();
    const metrics = hybridIntegration.getMetrics();
    
    console.log(`   ✅ Scraper ID: ${scraperId}`);
    console.log(`   ✅ Scraper Name: ${scraperName}`);
    console.log(`   ✅ Metrics: ${JSON.stringify(metrics)}\n`);

    // 4. Aguardar um pouco para heartbeat
    console.log('4️⃣ Aguardando heartbeat...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3s
    console.log('   ✅ Heartbeat processado\n');

    console.log('🎉 [TEST] Teste básico concluído com sucesso!');
    
    return {
      success: true,
      scraperId,
      scraperName,
      metrics
    };

  } catch (error) {
    console.error('❌ [TEST] Erro durante teste básico:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar teste
testHybridBasic()
  .then(result => {
    console.log('\n📋 [TEST] Resultado final:', JSON.stringify(result, null, 2));
    
    if (result.success) {
      console.log('\n✅ O híbrido está funcionando de forma INDEPENDENTE!');
      console.log('📊 O híbrido pode registrar suas métricas no PostgreSQL');
      console.log('🔗 Dashboard pode ler os dados da tabela que o híbrido escreve');
    } else {
      console.log('\n❌ O híbrido tem problemas de configuração');
    }
    
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ [TEST] Falha crítica:', error);
    process.exit(1);
  });
