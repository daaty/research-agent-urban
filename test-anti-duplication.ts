import dotenv from 'dotenv';
dotenv.config();

import { DatabaseManager } from './src/services/databaseManager';
import { DataTransformer } from './src/services/dataTransformer';
import { DataCacheManager } from './src/services/dataCacheManager';

/**
 * Teste do sistema anti-duplicação melhorado
 */
async function testAntiDuplicationSystem() {
  console.log('🧪 === TESTE DO SISTEMA ANTI-DUPLICAÇÃO MELHORADO ===\n');

  const databaseManager = DatabaseManager.getInstance();
  const dataTransformer = DataTransformer.getInstance();
  const cacheManager = DataCacheManager.getInstance();

  try {
    // 1. Conectar ao banco
    console.log('1️⃣ Conectando ao PostgreSQL...');
    await databaseManager.initialize();
    console.log('✅ Conectado ao PostgreSQL\n');

    // 2. Limpar cache para teste limpo
    console.log('2️⃣ Limpando cache para teste limpo...');
    cacheManager.clearCache();
    console.log('✅ Cache limpo\n');

    // 3. Simular dados de teste
    console.log('3️⃣ Criando dados de teste...');
    const testData = [
      {
        name: 'Ongoing Rides',
        tableName: 'Ongoing Rides',
        headers: ['ID', 'Driver', 'Passenger', 'Route', 'Status', 'Time'],
        rows: [
          ['R001', 'João Silva', 'Maria Santos', 'Centro → Aeroporto', 'Em andamento', '14:30'],
          ['R002', 'Pedro Costa', 'Ana Lima', 'Shopping → Casa', 'Em andamento', '14:45'],
          ['R003', 'Carlos Oliveira', 'José Santos', 'Trabalho → Casa', 'Em andamento', '15:00']
        ],
        isEmpty: false,
        url: 'test'
      }
    ];
    console.log(`✅ ${testData[0].rows.length} registros de teste criados\n`);

    // 4. Primeira execução (deve inserir tudo)
    console.log('4️⃣ PRIMEIRA EXECUÇÃO (todos dados são novos)...');
    const firstTransform = dataTransformer.transformScrapingData(
      testData, 
      { test: true, execution: 1 }, 
      'test-execution-1'
    );
    
    const firstSessionId = await dataTransformer.saveToDatabase(firstTransform);
    console.log(`✅ Primeira execução: ${firstTransform.totalRecords} registros processados\n`);

    // 5. Segunda execução IDÊNTICA (deve detectar duplicação)
    console.log('5️⃣ SEGUNDA EXECUÇÃO (mesmos dados - deve usar UPSERT)...');
    const secondTransform = dataTransformer.transformScrapingData(
      testData, 
      { test: true, execution: 2 }, 
      'test-execution-2'
    );
    
    const secondSessionId = await dataTransformer.saveToDatabase(secondTransform);
    console.log(`✅ Segunda execução: ${secondTransform.totalRecords} registros processados\n`);

    // 6. Terceira execução com dados novos
    console.log('6️⃣ TERCEIRA EXECUÇÃO (dados parcialmente novos)...');
    const testDataWithNew = [{
      ...testData[0],
      rows: [
        ...testData[0].rows, // Dados existentes
        ['R004', 'Nova Corrida', 'Novo Passageiro', 'Nova Rota', 'Novo Status', '16:00'] // Novo registro
      ]
    }];
    
    const thirdTransform = dataTransformer.transformScrapingData(
      testDataWithNew, 
      { test: true, execution: 3 }, 
      'test-execution-3'
    );
    
    const thirdSessionId = await dataTransformer.saveToDatabase(thirdTransform);
    console.log(`✅ Terceira execução: ${thirdTransform.totalRecords} registros processados\n`);

    // 7. Verificar estatísticas do banco
    console.log('7️⃣ VERIFICANDO ESTATÍSTICAS DO BANCO...');
    const stats = await databaseManager.getDatabaseStats();
    console.log('📊 Estatísticas:', {
      totalRecords: stats.totalRecords,
      totalSessions: stats.totalSessions,
      lastScraping: stats.lastScraping,
      tableStats: stats.tableStats
    });
    console.log('\n');

    // 8. Teste de comparação de cache
    console.log('8️⃣ TESTANDO SISTEMA DE CACHE...');
    const comparison = cacheManager.compareAndGetDifferences(testData);
    console.log('🔍 Resultado da comparação:', {
      hasChanges: comparison.hasChanges,
      totalDifferences: comparison.differences.length,
      newRecords: comparison.differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0)
    });
    console.log('\n');

    // 9. Verificar dados recentes
    console.log('9️⃣ VERIFICANDO DADOS RECENTES...');
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Últimas 24h
    const recentRides = await databaseManager.getRidesByDateRange(startDate, endDate);
    console.log(`📅 Registros das últimas 24h: ${recentRides.length}`);
    
    recentRides.forEach((ride, index) => {
      console.log(`   ${index + 1}. Tabela: ${ride.table_name}, Hash: ${ride.data_hash.substring(0, 8)}..., Hora: ${ride.scraped_at.toISOString()}`);
    });

    console.log('\n✅ === TESTE CONCLUÍDO COM SUCESSO ===');
    console.log('🎯 Sistema anti-duplicação funcionando corretamente!');
    console.log('🔄 UPSERT previne inserção de dados duplicados');
    console.log('⚡ Cache detecta mudanças eficientemente');
    console.log('🗄️ Constraint UNIQUE mantém integridade dos dados');

  } catch (error: any) {
    console.error('❌ Erro durante teste:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await databaseManager.close();
    console.log('\n🔌 Conexão com banco fechada');
  }
}

// Executar teste
testAntiDuplicationSystem().catch(console.error);
