import { DatabaseManager } from './src/services/databaseManager';

async function testDatabase() {
  console.log('🧪 TESTE CONEXÃO BANCO DE DADOS');
  console.log('===============================');

  try {
    console.log('🔌 Tentando conectar no banco...');
    const dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    console.log('✅ Banco conectado com sucesso!');
    
    console.log('📊 Status da conexão:', dbManager.isConnectedToDatabase());
    
    await dbManager.close();
    console.log('✅ Teste concluído');
    
  } catch (error) {
    console.error('❌ Erro no teste de banco:', error);
  }
}

testDatabase();
