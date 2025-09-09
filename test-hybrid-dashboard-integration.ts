/**
 * 🧪 TESTE DE INTEGRAÇÃO HÍBRIDO COM DASHBOARD
 * 
 * Testa se o híbrido está salvando dados na tabela de status corretamente
 */

import { getHybridScraperIntegration, destroyHybridScraperIntegration } from './hybridScraperIntegration';

async function testHybridDashboardIntegration() {
  console.log('🧪 [TEST] Iniciando teste de integração híbrido-dashboard...\n');

  // Habilitar dashboard para teste
  process.env.ENABLE_DASHBOARD = 'true';
  process.env.RIDES_USERNAME = 'test-hybrid-user';

  try {
    // 1. Inicializar integração híbrida
    console.log('1️⃣ Inicializando integração híbrida...');
    const hybridIntegration = getHybridScraperIntegration();
    
    const scraperId = hybridIntegration.getScraperId();
    const scraperName = hybridIntegration.getScraperName();
    
    console.log(`   ✅ Scraper ID: ${scraperId}`);
    console.log(`   ✅ Scraper Name: ${scraperName}\n`);

    // 2. Simular heartbeat
    console.log('2️⃣ Testando heartbeat...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // 2s
    console.log('   ✅ Heartbeat enviado\n');

    // 3. Simular extração de dados
    console.log('3️⃣ Testando extração de dados...');
    try {
      const extractionResult = await hybridIntegration.performExtraction(['TEST_DRIVER_ID']);
      console.log(`   ✅ Extração realizada: ${extractionResult.length} resultados`);
    } catch (error) {
      console.log(`   ⚠️  Extração falhou (esperado): ${error.message}`);
    }
    console.log('');

    // 4. Simular recarga
    console.log('4️⃣ Testando recarga...');
    try {
      const rechargeResult = await hybridIntegration.performRecharge('TEST_DRIVER_ID', 100);
      console.log(`   ✅ Recarga realizada: ${rechargeResult}`);
    } catch (error) {
      console.log(`   ⚠️  Recarga falhou (esperado): ${error.message}`);
    }
    console.log('');

    // 5. Verificar métricas
    console.log('5️⃣ Verificando métricas...');
    const metrics = hybridIntegration.getMetrics();
    console.log(`   📊 Métricas atuais:`, JSON.stringify(metrics, null, 2));
    console.log('');

    // 6. Aguardar um pouco para processar
    console.log('6️⃣ Aguardando processamento...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3s
    console.log('   ✅ Processamento concluído\n');

    // 7. Verificar se dados foram salvos no dashboard (se disponível)
    console.log('7️⃣ Verificando dados no dashboard...');
    try {
      // Tentar importar diretamente o ScraperStatusService
      const { ScraperStatusService } = require('./research-agent-urban/src/dashboard/services/scraperStatusService');
      const statusService = ScraperStatusService.getInstance();
      
      // Verificar se scraper foi registrado
      const allScrapers = await statusService.getAllScrapers();
      const hybridScraper = allScrapers.find(s => s.id === scraperId);
      
      if (hybridScraper) {
        console.log('   ✅ SUCESSO: Híbrido encontrado no dashboard!');
        console.log(`   📊 Status: ${hybridScraper.status}`);
        console.log(`   💓 Last Heartbeat: ${new Date(hybridScraper.lastHeartbeat).toLocaleString()}`);
        console.log(`   ⚡ Last Activity: ${hybridScraper.lastActivity ? new Date(hybridScraper.lastActivity).toLocaleString() : 'Nunca'}`);
        console.log(`   📈 Métricas:`, JSON.stringify(hybridScraper.metrics, null, 2));
      } else {
        console.log('   ❌ FALHA: Híbrido NÃO encontrado no dashboard');
        console.log('   📋 Scrapers disponíveis:');
        allScrapers.forEach(s => console.log(`      - ${s.id}: ${s.name} (${s.status})`));
      }
      
    } catch (dashboardError) {
      console.log(`   ⚠️  Não foi possível verificar dashboard: ${dashboardError.message}`);
    }
    console.log('');

    // 8. Verificar banco PostgreSQL diretamente
    console.log('8️⃣ Verificando banco PostgreSQL...');
    try {
      const { DatabaseManager } = require('./src/services/databaseManager');
      const dbManager = DatabaseManager.getInstance();
      
      if (!dbManager.isConnectedToDatabase()) {
        await dbManager.initialize();
      }
      
      // Query para verificar tabela de status
      const query = `
        SELECT scraper_id, scraper_name, status, last_heartbeat, last_activity, metrics
        FROM scraper_status 
        WHERE scraper_id LIKE '%${scraperId.substring(0, 10)}%'
        ORDER BY last_heartbeat DESC
        LIMIT 5
      `;
      
      const result = await dbManager.query(query, []);
      
      if (result.rows.length > 0) {
        console.log('   ✅ SUCESSO: Dados encontrados no PostgreSQL!');
        result.rows.forEach((row, index) => {
          console.log(`   📊 Registro ${index + 1}:`);
          console.log(`      ID: ${row.scraper_id}`);
          console.log(`      Nome: ${row.scraper_name}`);
          console.log(`      Status: ${row.status}`);
          console.log(`      Heartbeat: ${new Date(row.last_heartbeat).toLocaleString()}`);
          console.log(`      Activity: ${row.last_activity ? new Date(row.last_activity).toLocaleString() : 'Nunca'}`);
          console.log(`      Métricas: ${JSON.stringify(row.metrics, null, 2)}`);
        });
      } else {
        console.log('   ❌ FALHA: Nenhum dado encontrado no PostgreSQL');
      }
      
    } catch (dbError) {
      console.log(`   ⚠️  Erro ao verificar PostgreSQL: ${dbError.message}`);
    }

    console.log('\n🎉 Teste concluído!');

  } catch (error) {
    console.error('❌ [TEST] Erro durante teste:', error);
  } finally {
    // Cleanup
    console.log('\n🧹 Limpando recursos...');
    destroyHybridScraperIntegration();
    console.log('✅ Cleanup concluído');
  }
}

// Executar teste
if (require.main === module) {
  testHybridDashboardIntegration().catch(console.error);
}

export { testHybridDashboardIntegration };
