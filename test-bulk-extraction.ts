#!/usr/bin/env ts-node

import { RidesDashboardHybridScraper } from './src/scraper/RidesDashboardHybridScraper';

async function testBulkDriverExtraction() {
  console.log('🧪 Testando extração em massa de IDs de motoristas...\n');

  const scraper = new RidesDashboardHybridScraper();

  try {
    // 1. Inicializar scraper
    console.log('1️⃣ Inicializando scraper...');
    await scraper.initialize();

    // 2. Fazer login automático
    console.log('\n2️⃣ Fazendo login automático...');
    const loginSuccess = await scraper.autoLogin();
    
    if (!loginSuccess) {
      throw new Error('Login automático falhou');
    }

    console.log('✅ Login realizado com sucesso!');

    // 3. Extrair todos os IDs dos motoristas
    console.log('\n3️⃣ Extraindo todos os IDs dos motoristas...');
    const driverIds = await scraper.extractAllDriverIds();

    console.log(`\n📊 RESULTADO:`);
    console.log(`   Total de IDs extraídos: ${driverIds.length}`);
    console.log(`   IDs encontrados:`);
    
    driverIds.forEach((id, index) => {
      console.log(`     ${index + 1}. ${id}`);
    });

    // 4. Testar extração de dados de um motorista específico (se houver IDs)
    if (driverIds.length > 0) {
      console.log(`\n4️⃣ Testando extração de dados do primeiro motorista (${driverIds[0]})...`);
      
      try {
        const driverData = await scraper.extractDriverData(driverIds[0]);
        console.log('✅ Dados extraídos com sucesso:');
        console.log(JSON.stringify(driverData, null, 2));
      } catch (error) {
        console.warn('⚠️ Erro ao extrair dados do motorista:', error);
      }
    }

    console.log('\n✅ Teste concluído com sucesso!');

  } catch (error) {
    console.error('\n❌ Erro durante o teste:', error);
  } finally {
    // 5. Finalizar scraper
    console.log('\n5️⃣ Finalizando scraper...');
    await scraper.close();
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testBulkDriverExtraction().catch(console.error);
}

export { testBulkDriverExtraction };
