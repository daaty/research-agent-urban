import dotenv from 'dotenv';
dotenv.config();
import { DatabaseManager } from './src/services/databaseManager';
import { DataTransformer } from './src/services/dataTransformer';

async function testDatabaseIntegration() {
  console.log('🔧 Testando integração do PostgreSQL...');
  
  try {
    // 1. Testar conexão
    console.log('1️⃣ Testando conexão com PostgreSQL...');
    const databaseManager = DatabaseManager.getInstance();
    await databaseManager.initialize();
    
    const isConnected = databaseManager.isConnectedToDatabase();
    console.log(`   ✅ Conectado: ${isConnected}`);
    
    // 2. Testar criação de tabelas
    console.log('2️⃣ Testando criação de tabelas...');
    const stats = await databaseManager.getDatabaseStats();
    console.log('   ✅ Estatísticas do banco:', stats);
    
    // 3. Testar DataTransformer
    console.log('3️⃣ Testando DataTransformer...');
    const dataTransformer = DataTransformer.getInstance();
    const dbStats = await dataTransformer.getDatabaseStats();
    console.log('   ✅ Estatísticas via DataTransformer:', dbStats);
    
    // 4. Testar inserção de dados simulados
    console.log('4️⃣ Testando inserção de dados simulados...');
    const mockData = [
      {
        tableName: 'test-table',
        headers: ['id', 'name', 'created_at'],
        columns: ['id', 'name', 'created_at'],
        rows: [
          ['1', 'Test Row 1', new Date().toISOString()],
          ['2', 'Test Row 2', new Date().toISOString()]
        ],
        isEmpty: false
      }
    ];
    
    await dataTransformer.processFullScrapingData(mockData, 'test');
    console.log('   ✅ Dados de teste inseridos com sucesso!');
    
    // 5. Testar busca de dados
    console.log('5️⃣ Testando busca de dados...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
    const recentData = await databaseManager.getRidesByDateRange(startDate, endDate);
    console.log(`   ✅ Encontrados ${recentData.length} registros nas últimas 24h`);
    
    console.log('\n🎉 TESTE COMPLETO! Integração PostgreSQL funcionando!');
    
  } catch (error) {
    console.error('❌ Erro no teste:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Executar teste
testDatabaseIntegration();
