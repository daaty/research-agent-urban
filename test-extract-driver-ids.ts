import 'dotenv/config';
import { RidesDashboardHybridScraper } from './src/scraper/RidesDashboardHybridScraper';

async function testDriverIdsExtraction() {
  console.log('🧪 Testando extração de IDs dos motoristas...\n');

  try {
    // Criar instância do scraper
    const scraper = new RidesDashboardHybridScraper();

    // Inicializar o scraper
    console.log('🚀 Inicializando scraper...');
    await scraper.initialize();

    // Aguardar um pouco para garantir que o dashboard carregou
    console.log('⏳ Aguardando dashboard carregar...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Extrair todos os IDs dos motoristas
    console.log('\n📋 Extraindo IDs dos motoristas...');
    const driverIds = await scraper.extractAllDriverIds();

    if (driverIds && driverIds.length > 0) {
      console.log(`\n✅ Sucesso! ${driverIds.length} IDs extraídos:`);
      driverIds.forEach((id, index) => {
        console.log(`   ${index + 1}. ${id}`);
      });

      // Testar extração de dados de alguns motoristas
      console.log('\n🔍 Testando extração de dados de alguns motoristas...');
      
      const testIds = driverIds.slice(0, Math.min(3, driverIds.length)); // Pegar até 3 IDs
      
      for (const driverId of testIds) {
        try {
          console.log(`\n   📊 Extraindo dados do motorista ${driverId}...`);
          const driverData = await scraper.extractDriverData(driverId);
          
          if (driverData && driverData.personal_data && driverData.personal_data.driver_id) {
            console.log(`   ✅ Dados extraídos para ${driverId}:`);
            console.log(`      🆔 Driver ID: ${driverData.personal_data.driver_id || 'N/A'}`);
            console.log(`      👤 Nome: ${driverData.personal_data.driver_name || 'N/A'}`);
            console.log(`      📱 Telefone: ${driverData.personal_data.phone_no || 'N/A'}`);
            console.log(`      🏙️ Cidade: ${driverData.personal_data.city || 'N/A'}`);
            console.log(`      ✅ Status: ${driverData.personal_data.status || 'N/A'}`);
            console.log(`      📅 Data Ingresso: ${driverData.personal_data.joining_date || 'N/A'}`);
            console.log(`      🚗 Veículo: ${driverData.personal_data.vehicle_no || 'N/A'}`);
            console.log(`      💰 Saldo: ${driverData.personal_data.credit_wallet_balance || 'N/A'}`);
            console.log(`      🚗 Corridas: ${driverData.rides_history?.length || 0}`);
          } else {
            console.log(`   ⚠️ Nenhum dado encontrado para ${driverId}`);
          }
        } catch (driverError: any) {
          console.log(`   ❌ Erro ao extrair dados do motorista ${driverId}: ${driverError.message}`);
        }

        // Aguardar entre extrações
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

    } else {
      console.log('❌ Nenhum ID de motorista foi extraído');
    }

    // Aguardar um pouco antes de encerrar
    console.log('\n⏳ Teste concluído, aguardando antes de encerrar...');
    await new Promise(resolve => setTimeout(resolve, 5000));

  } catch (error: any) {
    console.error('\n❌ Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n🏁 Teste finalizado!');
}

// Executar o teste
if (require.main === module) {
  testDriverIdsExtraction().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

export { testDriverIdsExtraction };
