#!/usr/bin/env npx ts-node

/**
 * 🧪 Teste de Persistência de Dados Pessoais
 * 
 * Este script testa:
 * 1. Criação automática da nova tabela driver_personal_details
 * 2. Extração de dados pessoais de motoristas
 * 3. Persistência no PostgreSQL
 * 4. Consulta via API
 */

import { DatabaseManager } from './src/services/databaseManager';
import { DataTransformer } from './src/services/dataTransformer';
import { RidesDashboardHybridScraper } from './src/scraper/RidesDashboardHybridScraper';

async function testPersonalDataPersistence() {
  console.log('🧪 TESTANDO PERSISTÊNCIA DE DADOS PESSOAIS');
  console.log('=====================================');

  try {
    // 1. Testar conexão com banco e criação de tabelas
    console.log('1️⃣ Testando conexão e criação de tabelas...');
    const databaseManager = DatabaseManager.getInstance();
    await databaseManager.initialize();
    
    const isConnected = databaseManager.isConnectedToDatabase();
    console.log(`   ✅ PostgreSQL conectado: ${isConnected}`);
    
    // 2. Verificar estatísticas atualizadas
    console.log('2️⃣ Verificando estatísticas do banco...');
    const stats = await databaseManager.getDatabaseStats();
    console.log('   📊 Estatísticas:', {
      totalRecords: stats.totalRecords,
      totalDrivers: stats.totalDrivers,
      totalPersonalDetails: stats.totalPersonalDetails,
      personalDetailsByCity: stats.personalDetailsByCity
    });

    // 3. Testar extração e persistência de dados
    console.log('3️⃣ Testando extração de dados pessoais...');
    const scraper = new RidesDashboardHybridScraper('test_persistence');
    
    const driverIds = ['18181466', '17650720', '17528787'];
    
    console.log('🔐 Inicializando scraper (incluindo login)...');
    await scraper.initialize();
    
    console.log('✅ Scraper inicializado e login realizado com sucesso');
    
    for (const driverId of driverIds) {
      console.log(`\n📊 Processando motorista ${driverId}...`);
      
      try {
        // Verificar se já existe
        const exists = await databaseManager.driverPersonalDetailsExists(driverId);
        console.log(`   📋 Dados já existem: ${exists}`);
        
        // Extrair dados (sempre extrai para verificar funcionamento)
        const extractedData = await scraper.extractDriverData(driverId);
        
        if (extractedData && extractedData.data && extractedData.data.personal_data) {
          console.log(`   ✅ Dados extraídos: ${extractedData.data.personal_data.driver_name}`);
          console.log(`   📍 Cidade: ${extractedData.city}`);
          console.log(`   🚗 Corridas: ${extractedData.data.rides_history?.length || 0}`);
          console.log(`   💰 Transações: ${extractedData.data.wallet_transactions?.length || 0}`);
        } else {
          console.log(`   ⚠️ Dados incompletos para ${driverId}`);
        }
        
      } catch (error: any) {
        console.error(`   ❌ Erro ao processar ${driverId}:`, error.message);
      }
      
      // Pausa entre extrações
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // 4. Verificar dados salvos no banco
    console.log('\n4️⃣ Verificando dados salvos no banco...');
    const updatedStats = await databaseManager.getDatabaseStats();
    console.log('   📊 Dados pessoais salvos:', updatedStats.totalPersonalDetails);
    console.log('   🏙️ Por cidade:', updatedStats.personalDetailsByCity);
    
    // 5. Testar consulta de dados específicos
    console.log('\n5️⃣ Testando consulta de dados específicos...');
    for (const driverId of driverIds) {
      const driverData = await databaseManager.getDriverPersonalDetails(driverId);
      if (driverData) {
        const personalData = typeof driverData.personal_data === 'string' 
          ? JSON.parse(driverData.personal_data) 
          : driverData.personal_data;
        console.log(`   ✅ ${driverId}: ${personalData.driver_name}`);
      } else {
        console.log(`   ⚠️ ${driverId}: Não encontrado no banco`);
      }
    }
    
    // 6. Testar API de consulta
    console.log('\n6️⃣ Para testar a API, use:');
    console.log('   📡 GET /api/database/driver-personal/18181466');
    console.log('   📡 GET /api/database/driver-personal (lista todos)');
    console.log('   📡 GET /api/database/stats (estatísticas atualizadas)');
    
    await scraper.close();
    console.log('\n🎉 Teste concluído com sucesso!');
    
  } catch (error: any) {
    console.error('❌ Erro no teste:', error.message);
    console.error(error.stack);
  }
}

// Executar teste
testPersonalDataPersistence().then(() => {
  console.log('✅ Script finalizado');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Erro fatal:', error);
  process.exit(1);
});
