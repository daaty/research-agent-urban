import { getPersistentScraper } from './src/scraper/ridesPersistentScraper';

/**
 * Script de teste para demonstrar o funcionamento com captcha
 */
async function testCaptchaHandling() {
  const scraper = getPersistentScraper();

  console.log('🔍 === TESTE DE DETECÇÃO DE CAPTCHA ===');
  console.log('');

  // 1. Verificar status inicial
  console.log('1️⃣ Verificando status inicial...');
  const status = await scraper.getSessionStatus();
  console.log('Status:', status);
  console.log('');

  // 2. Tentar login/scraping
  console.log('2️⃣ Tentando login/scraping...');
  const result = await scraper.scrapeAllData();
  
  if (result.success) {
    console.log('✅ Scraping realizado com sucesso!');
    console.log('📊 Dados extraídos:');
    result.data.forEach(table => {
      console.log(`   - ${table.name}: ${table.rows.length} registros`);
    });
  } else {
    console.log('❌ Falha no scraping:', result.message);
    
    // Se falhou por captcha, mostrar instruções
    if (result.message.includes('Captcha')) {
      console.log('');
      console.log('🤖 INSTRUÇÕES PARA RESOLVER CAPTCHA:');
      console.log('');
      console.log('1. O navegador deve ter sido aberto automaticamente');
      console.log('2. Faça login manualmente no navegador');
      console.log('3. Resolva o captcha se necessário');
      console.log('4. Aguarde até estar logado no dashboard');
      console.log('5. Execute este script novamente');
      console.log('');
      console.log('💡 Ou use o método waitForManualLogin() para aguardar automaticamente');
      
      // Demonstrar aguardo de login manual
      console.log('');
      console.log('⏳ Aguardando login manual (60 segundos)...');
      const manualLogin = await scraper.waitForManualLogin(60000);
      
      if (manualLogin) {
        console.log('✅ Login manual detectado! Tentando scraping novamente...');
        const retryResult = await scraper.scrapeAllData();
        
        if (retryResult.success) {
          console.log('🎉 Scraping realizado com sucesso após login manual!');
          console.log('📊 Dados extraídos:');
          retryResult.data.forEach(table => {
            console.log(`   - ${table.name}: ${table.rows.length} registros`);
          });
        } else {
          console.log('❌ Ainda falhou após login manual:', retryResult.message);
        }
      } else {
        console.log('⏰ Timeout aguardando login manual');
      }
    }
  }

  console.log('');
  console.log('🔚 Teste concluído');
}

// Executar teste
testCaptchaHandling().catch(console.error);
