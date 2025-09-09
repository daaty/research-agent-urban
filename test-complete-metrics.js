/**
 * 🧪 TESTE COMPLETO DE MÉTRICAS DO HÍBRIDO
 * 
 * Testa todo o fluxo de atualização de métricas na tabela scraper_status
 */

console.log('🧪 [METRICS TEST] Iniciando teste completo de métricas...\n');

// Configurar variáveis de ambiente para teste
process.env.RIDES_USERNAME = 'metrics-test-user';
process.env.RIDES_PASSWORD = 'test-password';

async function testCompleteMetricsFlow() {
  try {
    // 1. Importar e criar instância
    console.log('1️⃣ Importando e criando instância híbrida...');
    const { getHybridScraperIntegration } = require('./hybridScraperIntegration');
    const hybridIntegration = getHybridScraperIntegration();
    
    const scraperId = hybridIntegration.getScraperId();
    console.log(`   ✅ Híbrido criado: ${scraperId}\n`);
    
    // 2. Aguardar registro inicial
    console.log('2️⃣ Aguardando registro inicial...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Verificar métricas iniciais
    let metrics = hybridIntegration.getMetrics();
    console.log(`   📊 Métricas iniciais:`, metrics);
    
    // 3. Simular extração de drivers (usando notifyActivity diretamente para teste)
    console.log('\n3️⃣ Simulando extração de drivers...');
    
    // Simular 3 drivers extraídos com sucesso
    console.log('   Simulando driver 1...');
    hybridIntegration['notifyActivity']('driver', { driverId: 'test1', success: true });
    
    console.log('   Simulando driver 2...');
    hybridIntegration['notifyActivity']('driver', { driverId: 'test2', success: true });
    
    console.log('   Simulando driver 3...');
    hybridIntegration['notifyActivity']('driver', { driverId: 'test3', success: true });
    
    metrics = hybridIntegration.getMetrics();
    console.log(`   📊 Métricas após drivers:`, metrics);
    
    // 4. Simular recargas
    console.log('\n4️⃣ Simulando recargas...');
    
    console.log('   Simulando recarga bem-sucedida...');
    hybridIntegration['notifyActivity']('recharge', { 
      driverId: 'test1', 
      amount: 50, 
      success: true,
      forceUpdate: true 
    });
    
    console.log('   Simulando recarga falhada...');
    hybridIntegration['notifyActivity']('error', { 
      driverId: 'test2', 
      amount: 30, 
      error: 'Insufficient balance',
      forceUpdate: true 
    });
    
    metrics = hybridIntegration.getMetrics();
    console.log(`   📊 Métricas após recargas:`, metrics);
    
    // 5. Simular erro geral
    console.log('\n5️⃣ Simulando erro geral...');
    hybridIntegration['notifyActivity']('error', { 
      error: 'Network timeout',
      critical: true,
      forceUpdate: true 
    });
    
    metrics = hybridIntegration.getMetrics();
    console.log(`   📊 Métricas finais:`, metrics);
    
    // 6. Aguardar atualização no banco
    console.log('\n6️⃣ Aguardando atualização no banco...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // 7. Verificar dados no banco
    console.log('\n7️⃣ Verificando dados salvos no PostgreSQL...');
    
    const { Pool } = require('pg');
    require('dotenv').config();
    
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
    
    const result = await pool.query(`
      SELECT * FROM scraper_status 
      WHERE scraper_id = $1;
    `, [scraperId]);
    
    await pool.end();
    
    if (result.rows.length > 0) {
      const dbData = result.rows[0];
      console.log(`   📊 Dados no banco:`);
      console.log(`      Status: ${dbData.status}`);
      console.log(`      Last Heartbeat: ${new Date(dbData.last_heartbeat).toLocaleString()}`);
      console.log(`      Performance Metrics:`, dbData.performance_metrics);
      
      // Verificar se métricas batem
      const dbMetrics = dbData.performance_metrics;
      const localMetrics = metrics;
      
      console.log(`\n   🔍 Comparação Local vs Banco:`);
      console.log(`      Drivers - Local: ${localMetrics.driversScraped}, Banco: ${dbMetrics.driversScraped}`);
      console.log(`      Rides - Local: ${localMetrics.ridesScraped}, Banco: ${dbMetrics.ridesScraped}`);
      console.log(`      Errors - Local: ${localMetrics.errorsCount}, Banco: ${dbMetrics.errorsCount}`);
      console.log(`      Success Rate - Local: ${localMetrics.successRate}%, Banco: ${dbMetrics.successRate}%`);
      
      const isConsistent = (
        localMetrics.driversScraped === dbMetrics.driversScraped &&
        localMetrics.ridesScraped === dbMetrics.ridesScraped &&
        localMetrics.errorsCount === dbMetrics.errorsCount &&
        Math.abs(localMetrics.successRate - dbMetrics.successRate) < 0.1
      );
      
      if (isConsistent) {
        console.log(`\n   ✅ CONSISTÊNCIA: Métricas locais e banco estão sincronizadas!`);
      } else {
        console.log(`\n   ❌ INCONSISTÊNCIA: Métricas locais e banco estão diferentes!`);
      }
      
      return {
        success: true,
        consistent: isConsistent,
        localMetrics,
        dbMetrics,
        scraperId
      };
      
    } else {
      console.log(`   ❌ Híbrido não encontrado no banco!`);
      return {
        success: false,
        error: 'Not found in database'
      };
    }

  } catch (error) {
    console.error('❌ [METRICS TEST] Erro durante teste:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Executar teste
testCompleteMetricsFlow()
  .then(result => {
    console.log('\n📋 [METRICS TEST] Resultado final:', JSON.stringify(result, null, 2));
    
    if (result.success && result.consistent) {
      console.log('\n🎉 SUCESSO TOTAL: Todas as métricas estão funcionando corretamente!');
      console.log('✅ O híbrido atualiza a tabela scraper_status adequadamente');
      console.log('✅ Dashboard pode monitorar o híbrido em tempo real');
    } else if (result.success && !result.consistent) {
      console.log('\n⚠️ PARCIAL: Híbrido funciona mas há inconsistências nas métricas');
    } else {
      console.log('\n❌ FALHA: Híbrido não está atualizando métricas corretamente');
    }
    
    process.exit(result.success && result.consistent ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ [METRICS TEST] Falha crítica:', error);
    process.exit(1);
  });
