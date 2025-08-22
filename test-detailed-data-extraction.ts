import 'dotenv/config';
import { RidesDashboardHybridScraper } from './src/scraper/RidesDashboardHybridScraper';

async function testDetailedDataExtraction() {
  console.log('🧪 Testando extração DETALHADA de dados dos motoristas...\n');

  try {
    // Criar instância do scraper
    const scraper = new RidesDashboardHybridScraper();

    // Inicializar o scraper
    console.log('🚀 Inicializando scraper...');
    await scraper.initialize();

    // Aguardar dashboard carregar
    console.log('⏳ Aguardando dashboard carregar...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extrair IDs dos motoristas
    console.log('\n📋 Extraindo IDs dos motoristas...');
    const driverIds = await scraper.extractAllDriverIds();

    if (driverIds && driverIds.length > 0) {
      console.log(`✅ ${driverIds.length} IDs extraídos\n`);

      // Testar extração detalhada com os primeiros 2 IDs
      const testIds = driverIds.slice(0, 2);
      
      for (let i = 0; i < testIds.length; i++) {
        const driverId = testIds[i];
        console.log(`\n🔍 ===== TESTANDO MOTORISTA ${i + 1}: ${driverId} =====`);
        
        try {
          const detailedData = await scraper.extractDriverData(driverId);
          
          if (detailedData && !detailedData.error) {
            console.log('\n📊 DADOS PESSOAIS EXTRAÍDOS:');
            console.log('----------------------------------------');
            
            const personal = detailedData.personal_data || {};
            console.log(`🆔 Driver ID: ${personal.driver_id || 'N/A'}`);
            console.log(`👤 Nome: ${personal.driver_name || 'N/A'}`);
            console.log(`📱 Telefone: ${personal.phone_no || 'N/A'}`);
            console.log(`🏙️ Cidade: ${personal.city || 'N/A'}`);
            console.log(`✅ Status: ${personal.status || 'N/A'}`);
            console.log(`📅 Data de Ingresso: ${personal.joining_date || 'N/A'}`);
            console.log(`🎂 Data Nascimento: ${personal.dob || 'N/A'}`);
            console.log(`🚗 Veículo: ${personal.vehicle_no || 'N/A'}`);
            console.log(`📱 App Version: ${personal.app_version || 'N/A'}`);
            console.log(`🔧 Device: ${personal.device || 'N/A'}`);
            console.log(`🔗 OS Version: ${personal.os_version || 'N/A'}`);
            
            console.log('\n💰 DADOS FINANCEIROS:');
            console.log('----------------------------------------');
            console.log(`💳 Saldo Carteira: ${personal.credit_wallet_balance || 'N/A'}`);
            console.log(`🏦 Conta Bancária: ${personal.bank_account_no || 'N/A'}`);
            console.log(`⏸️ Pagamento Retido: ${personal.hold_payment || 'N/A'}`);
            
            console.log('\n🚗 DADOS DE CORRIDAS:');
            console.log('----------------------------------------');
            console.log(`📊 Corridas Hoje: ${personal.today_completed_rides || 'N/A'}`);
            console.log(`🔄 Corrida em Andamento: ${personal.ongoing_ride || 'N/A'}`);
            console.log(`📈 Média 7 Dias: ${personal.ride_avg_7_days || 'N/A'}`);
            console.log(`❗ % Corridas Problemáticas: ${personal.faulty_rides_percentage || 'N/A'}`);
            console.log(`🚙 Tipo Veículo: ${personal.vehicle_type || 'N/A'}`);
            
            console.log('\n📍 LOCALIZAÇÃO E ATIVIDADE:');
            console.log('----------------------------------------');
            console.log(`🗓️ Última Corrida: ${personal.last_ride_on || 'N/A'}`);
            console.log(`📍 Última Localização: ${personal.last_latitude_longitude || 'N/A'}`);
            console.log(`🔑 Último Login: ${personal.last_login_at || 'N/A'}`);
            console.log(`📡 Localização Atualizada: ${personal.last_location_updated_at || 'N/A'}`);
            console.log(`🌅 Primeiro Login Hoje: ${personal.today_first_login_at || 'N/A'}`);
            
            // Histórico de corridas
            const rides = detailedData.rides_history || [];
            console.log(`\n🚗 HISTÓRICO DE CORRIDAS (${rides.length} corridas):`);
            console.log('========================================');
            
            if (rides.length > 0) {
              rides.forEach((ride: any, index: number) => {
                console.log(`\n📋 Corrida ${index + 1}:`);
                console.log(`   🆔 Engagement ID: ${ride.engagement_id || 'N/A'}`);
                console.log(`   👤 Customer ID: ${ride.customer_id || 'N/A'}`);
                console.log(`   ⭐ Rating: ${ride.driver_rating || 'N/A'}`);
                console.log(`   🕐 Drop Time: ${ride.drop_time || 'N/A'}`);
                console.log(`   📏 Distância: ${ride.distance_travelled || 'N/A'} km`);
                console.log(`   🗺️ Google Distance: ${ride.google_distance || 'N/A'} km`);
                console.log(`   ⏱️ Duração: ${ride.duration || 'N/A'} min`);
                console.log(`   💵 Tarifa: R$ ${ride.fare || 'N/A'}`);
                console.log(`   🔄 Start/End Case: ${ride.start_end_case || 'N/A'}`);
              });
            } else {
              console.log('   ⚠️ Nenhuma corrida encontrada no histórico');
            }
            
          } else {
            console.log(`❌ Erro ao extrair dados: ${detailedData?.error || 'Dados não encontrados'}`);
          }
          
        } catch (error: any) {
          console.log(`❌ Erro ao processar motorista ${driverId}: ${error.message}`);
        }

        // Aguardar entre extrações
        if (i < testIds.length - 1) {
          console.log('\n⏳ Aguardando antes do próximo...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      }

    } else {
      console.log('❌ Nenhum ID de motorista foi extraído');
    }

    console.log('\n⏳ Teste concluído, aguardando antes de encerrar...');
    await new Promise(resolve => setTimeout(resolve, 3000));

  } catch (error: any) {
    console.error('\n❌ Erro durante o teste:', error.message);
    console.error('Stack trace:', error.stack);
  }

  console.log('\n🏁 Teste de extração detalhada finalizado!');
}

// Executar o teste
if (require.main === module) {
  testDetailedDataExtraction().then(() => {
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Erro fatal:', error);
    process.exit(1);
  });
}

export { testDetailedDataExtraction };
