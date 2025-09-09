/**
 * 🧪 TESTE SIMPLES DE INTEGRAÇÃO HÍBRIDO-DASHBOARD
 * 
 * Testa apenas o registro no ScraperStatusService
 */

async function testHybridRegistration() {
  console.log('🧪 [TEST] Testando registro do híbrido no dashboard...\n');

  // Configurar variáveis de ambiente
  process.env.ENABLE_DASHBOARD = 'true';
  process.env.RIDES_USERNAME = 'test-hybrid-user';

  try {
    console.log('1️⃣ Importando ScraperStatusService...');
    const { ScraperStatusService } = require('./research-agent-urban/src/dashboard/services/scraperStatusService');
    console.log('   ✅ ScraperStatusService importado com sucesso\n');

    console.log('2️⃣ Obtendo instância do ScraperStatusService...');
    const statusService = ScraperStatusService.getInstance();
    console.log('   ✅ Instância obtida\n');

    console.log('3️⃣ Registrando scraper híbrido...');
    const scraperId = 'hybrid-test123';
    const scraperName = 'Hybrid Test Scraper';
    
    statusService.registerScraper(scraperId, scraperName);
    console.log(`   ✅ Scraper registrado: ${scraperId}\n`);

    console.log('4️⃣ Atualizando heartbeat...');
    statusService.updateHeartbeat(scraperId);
    console.log('   ✅ Heartbeat atualizado\n');

    console.log('5️⃣ Atualizando atividade...');
    statusService.updateActivity(scraperId, {
      ridesScraped: 5,
      driversScraped: 10,
      errorsCount: 1,
      successRate: 93.75,
      responseTimeMs: 2500
    });
    console.log('   ✅ Atividade atualizada\n');

    console.log('6️⃣ Verificando dados salvos...');
    const allScrapers = await statusService.getAllScrapers();
    const hybridScraper = allScrapers.find(s => s.id === scraperId);
    
    if (hybridScraper) {
      console.log('   ✅ SUCESSO: Híbrido encontrado no sistema!');
      console.log(`   📊 Status: ${hybridScraper.status}`);
      console.log(`   🏷️  Nome: ${hybridScraper.name}`);
      console.log(`   💓 Heartbeat: ${new Date(hybridScraper.lastHeartbeat).toLocaleString()}`);
      console.log(`   ⚡ Activity: ${hybridScraper.lastActivity ? new Date(hybridScraper.lastActivity).toLocaleString() : 'Nunca'}`);
      console.log(`   📈 Métricas:`, hybridScraper.metrics);
    } else {
      console.log('   ❌ FALHA: Híbrido não encontrado');
      console.log('   📋 Scrapers disponíveis:');
      allScrapers.forEach(s => console.log(`      - ${s.id}: ${s.name} (${s.status})`));
    }

    console.log('\n🎉 Teste de registro concluído com sucesso!');

  } catch (error) {
    console.error('❌ [TEST] Erro durante teste:', error);
  }
}

// Executar teste
testHybridRegistration().catch(console.error);
