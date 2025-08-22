import { RidesDashboardHybridScraper } from './src/scraper/RidesDashboardHybridScraper';

/**
 * Teste Específico: Extração de Dados de Motorista
 * 
 * Este teste verifica se o método extractDriverData() 
 * extrai corretamente os dados reais do dashboard.
 */

async function testDriverDataExtraction() {
  console.log('🧪 ===== TESTE DE EXTRAÇÃO DE DADOS =====');
  console.log('⏰ Iniciado em:', new Date().toLocaleString());

  const scraper = new RidesDashboardHybridScraper();

  try {
    // ===== STEP 1: INICIALIZAR =====
    console.log('\n📋 Step 1: Inicializando scraper...');
    await scraper.initialize();
    console.log('✅ Scraper inicializado');

    // ===== STEP 2: EXTRAIR IDS DOS MOTORISTAS =====
    console.log('\n🔢 Step 2: Extraindo IDs dos motoristas...');
    const allDriverIds = await scraper.extractAllDriverIds();
    console.log(`✅ ${allDriverIds.length} IDs extraídos: ${allDriverIds.slice(0, 3).join(', ')}${allDriverIds.length > 3 ? '...' : ''}`);

    if (allDriverIds.length === 0) {
      throw new Error('❌ Nenhum ID de motorista foi extraído');
    }

    // ===== STEP 3: TESTAR EXTRAÇÃO DE DADOS - PRIMEIRO MOTORISTA =====
    console.log('\n📊 Step 3: Testando extração de dados detalhados...');
    const testDriverId = allDriverIds[0];
    console.log(`🎯 Testando com motorista ID: ${testDriverId}`);

    console.log('� Extraindo dados completos do motorista...');
    const driverData = await scraper.extractDriverData(testDriverId);

    console.log('\n📊 ===== RESULTADO DA EXTRAÇÃO =====');
    console.log('📋 Dados Pessoais:');
    
    const personalData = driverData.personal_data || {};
    
    // Log detalhado dos dados extraídos
    console.log(`   🆔 Driver ID: ${personalData.driver_id || '❌ N/A'}`);
    console.log(`   👤 Driver Name: ${personalData.driver_name || '❌ N/A'}`);
    console.log(`   📱 Phone No: ${personalData.phone_no || '❌ N/A'}`);
    console.log(`   🏙️ City: ${personalData.city || '❌ N/A'}`);
    console.log(`   ✅ Status: ${personalData.status || '❌ N/A'}`);
    console.log(`   📅 Joining Date: ${personalData.joining_date || '❌ N/A'}`);
    console.log(`   🎂 DOB: ${personalData.dob || '❌ N/A'}`);
    console.log(`   🚗 Vehicle No: ${personalData.vehicle_no || '❌ N/A'}`);
    console.log(`   📱 App Version: ${personalData.app_version || '❌ N/A'}`);
    console.log(`   💰 Credit Wallet Balance: ${personalData.credit_wallet_balance || '❌ N/A'}`);
    console.log(`   🚗 Today's Completed Rides: ${personalData.today_completed_rides || '❌ N/A'}`);

    console.log('\n🚗 Histórico de Corridas:');
    const ridesHistory = driverData.rides_history || [];
    console.log(`   📊 Total de corridas: ${ridesHistory.length}`);
    
    if (ridesHistory.length > 0) {
      console.log('   🔍 Primeiras 3 corridas:');
      ridesHistory.slice(0, 3).forEach((ride, index) => {
        console.log(`     ${index + 1}. ID: ${ride.engagement_id || 'N/A'} | Cliente: ${ride.customer_id || 'N/A'} | Valor: ${ride.fare || 'N/A'}`);
      });
    } else {
      console.log('   ⚠️ Nenhuma corrida encontrada no histórico');
    }

    // ===== STEP 4: VALIDAÇÃO DOS DADOS =====
    console.log('\n✅ ===== VALIDAÇÃO DOS DADOS =====');
    
    let dataQuality = 'EXCELENTE';
    let extractedFieldsCount = 0;
    let totalFields = 0;

    // Contar campos extraídos vs campos esperados
    const expectedFields = [
      'driver_id', 'driver_name', 'phone_no', 'city', 'status', 
      'joining_date', 'vehicle_no', 'credit_wallet_balance'
    ];

    expectedFields.forEach(field => {
      totalFields++;
      if (personalData[field] && personalData[field] !== 'N/A' && personalData[field] !== '') {
        extractedFieldsCount++;
        console.log(`✅ ${field}: EXTRAÍDO`);
      } else {
        console.log(`❌ ${field}: NÃO EXTRAÍDO`);
      }
    });

    const extractionRate = (extractedFieldsCount / totalFields) * 100;
    console.log(`\n📊 Taxa de Extração: ${extractionRate.toFixed(1)}% (${extractedFieldsCount}/${totalFields} campos)`);

    if (extractionRate >= 80) {
      dataQuality = '🟢 EXCELENTE';
    } else if (extractionRate >= 60) {
      dataQuality = '🟡 BOA';
    } else if (extractionRate >= 40) {
      dataQuality = '🟠 REGULAR';
    } else {
      dataQuality = '🔴 RUIM';
    }

    console.log(`🎯 Qualidade da Extração: ${dataQuality}`);

    // ===== STEP 5: TESTE ADICIONAL - SEGUNDO MOTORISTA =====
    if (allDriverIds.length > 1 && extractionRate >= 40) {
      console.log('\n🔄 ===== TESTE ADICIONAL - SEGUNDO MOTORISTA =====');
      const secondDriverId = allDriverIds[1];
      console.log(`🎯 Testando com segundo motorista ID: ${secondDriverId}`);
      
      const secondDriverData = await scraper.extractDriverData(secondDriverId);
      const secondPersonalData = secondDriverData.personal_data || {};
      
      console.log(`   🆔 Driver ID: ${secondPersonalData.driver_id || '❌ N/A'}`);
      console.log(`   👤 Driver Name: ${secondPersonalData.driver_name || '❌ N/A'}`);
      console.log(`   📱 Phone No: ${secondPersonalData.phone_no || '❌ N/A'}`);
      console.log(`   🚗 Corridas no histórico: ${secondDriverData.rides_history?.length || 0}`);
    }

    // ===== STEP 6: RESUMO FINAL =====
    console.log('\n🏁 ===== RESUMO FINAL =====');
    console.log(`✅ Inicialização: SUCESSO`);
    console.log(`✅ Extração de IDs: ${allDriverIds.length} motoristas`);
    console.log(`📊 Extração de Dados: ${dataQuality}`);
    console.log(`🚗 Histórico de Corridas: ${ridesHistory.length} corridas`);

    if (extractionRate >= 60) {
      console.log('\n🎉 TESTE APROVADO! Sistema funciona corretamente.');
      
      // Log do JSON completo para debug
      console.log('\n📄 ===== DADOS COMPLETOS (JSON) =====');
      console.log(JSON.stringify(driverData, null, 2));
      
    } else {
      console.log('\n⚠️ TESTE PARCIAL. Necessário ajustar extração de dados.');
      
      // Em caso de falha, mostrar dados brutos
      console.log('\n🔍 ===== DADOS BRUTOS PARA DEBUG =====');
      console.log(JSON.stringify(driverData, null, 2));
    }

  } catch (error: any) {
    console.error('\n💥 ===== ERRO NO TESTE =====');
    console.error(`❌ Tipo: ${error.name || 'Error'}`);
    console.error(`📝 Mensagem: ${error.message}`);
    console.error(`📍 Stack: ${error.stack?.split('\n')[1] || 'N/A'}`);
    
  } finally {
    // ===== CLEANUP =====
    console.log('\n🧹 Realizando cleanup...');
    try {
      await scraper.close();
      console.log('✅ Scraper fechado');
    } catch (cleanupError) {
      console.warn('⚠️ Erro no cleanup:', cleanupError);
    }
    
    console.log(`\n⏰ Teste finalizado em: ${new Date().toLocaleString()}`);
    console.log('🧪 ===== FIM DO TESTE =====');
  }
}

// Executar o teste
if (require.main === module) {
  testDriverDataExtraction().catch(console.error);
}

export { testDriverDataExtraction };
