import { DatabaseManager } from './src/services/databaseManager';

async function queryPersonalData() {
  console.log('🔍 Consultando dados pessoais salvos no PostgreSQL...\n');
  
  const databaseManager = DatabaseManager.getInstance();
  await databaseManager.initialize();
  
  try {
    // 1. Buscar todos os dados salvos
    console.log('📊 Buscando dados salvos...');
    const allDrivers = await databaseManager.getAllDriversPersonalDetails();
    console.log(`   📋 Total de motoristas encontrados: ${allDrivers.length}`);
    
    if (allDrivers.length === 0) {
      console.log('   ⚠️ Nenhum dado encontrado no banco');
      return;
    }
    
    // 2. Contar por cidade
    console.log('\n🏙️ Distribuição por cidade:');
    const cityCounts: { [key: string]: number } = {};
    allDrivers.forEach(driver => {
      const personalData = typeof driver.personal_data === 'string' 
        ? JSON.parse(driver.personal_data) 
        : driver.personal_data;
      const city = personalData.city || 'Não informado';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });
    
    Object.entries(cityCounts).forEach(([city, count]) => {
      console.log(`   📍 ${city}: ${count} motoristas`);
    });
    
    // 3. Últimos 5 motoristas salvos
    console.log('\n👥 Últimos motoristas processados:');
    const recentLimited = allDrivers.slice(-5);
    
    recentLimited.forEach(driver => {
      const personalData = typeof driver.personal_data === 'string' 
        ? JSON.parse(driver.personal_data) 
        : driver.personal_data;
      
      console.log(`   👤 ${personalData.driver_name} (ID: ${driver.driver_id})`);
      console.log(`      📱 ${personalData.phone_no}`);
      console.log(`      🏙️ ${personalData.city}`);
      console.log(`      💰 Saldo: R$ ${personalData.credit_wallet_balance}`);
      console.log(`      🚗 Veículo: ${personalData.vehicle_no}`);
      console.log(`      📅 Último login: ${personalData.last_login_at}`);
      console.log(`      � Processado em: ${driver.extracted_at}`);
      console.log('');
    });
    
    console.log('✅ Consulta finalizada');
    
  } catch (error) {
    console.error('❌ Erro na consulta:', error);
  } finally {
    await databaseManager.close();
  }
}

queryPersonalData().catch(console.error);
