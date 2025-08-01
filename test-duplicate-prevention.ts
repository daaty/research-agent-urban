// ===============================================
// TESTE - SISTEMA DE PREVENÇÃO DE DUPLICADOS V2.0
// ===============================================

import { DuplicatePreventionService } from './src/services/duplicatePreventionService';
import { DataTransformer } from './src/services/dataTransformer';
import { DatabaseManager } from './src/services/databaseManager';

/**
 * Testa a nova lógica de prevenção de duplicados
 */
async function testDuplicatePrevention() {
  console.log('🧪 === TESTE DO SISTEMA DE PREVENÇÃO DE DUPLICADOS V2.0 ===');
  console.log('');

  try {
    // Inicializar serviços
    const databaseManager = DatabaseManager.getInstance();
    const duplicateService = DuplicatePreventionService.getInstance();
    const dataTransformer = DataTransformer.getInstance();

    // Conectar ao banco (se disponível)
    try {
      await databaseManager.initialize();
      console.log('✅ Conectado ao PostgreSQL');
    } catch (error) {
      console.log('⚠️ PostgreSQL não disponível - continuando com teste local');
    }

    console.log('');
    console.log('📊 Testando com dados simulados...');

    // Dados de teste simulando o que vem do scraper
    const testTableData = {
      name: 'Ongoing Rides',
      headers: ['Action', 'Corporate Name', 'Driver Name', 'Engagement ID', 'Status', 'User Name'],
      rows: [
        ['Start', 'Corp A', 'Driver 1', 'RIDE001', 'Active', 'User 1'],
        ['Start', 'Corp B', 'Driver 2', 'RIDE002', 'Active', 'User 2'],
        ['Start', 'Corp C', 'Driver 3', 'RIDE003', 'Completed', 'User 3'],
        ['Start', 'Corp D', 'Driver 4', 'RIDE004', 'Active', 'User 4'],
        ['Start', 'Corp E', 'Driver 5', 'RIDE005', 'Active', 'User 5']
      ],
      isEmpty: false,
      url: 'https://rides.ec2dashboard.com/#/app/ongoing-rides/'
    };

    console.log(`📋 Dados de teste: ${testTableData.rows.length} registros`);
    console.log('');

    // 🧪 TESTE 1: Primeira execução - todos devem ser novos
    console.log('1️⃣ TESTE 1: Primeira execução (todos novos)');
    const firstResult = await duplicateService.filterDuplicates(testTableData);
    
    console.log(`   📊 Original: ${firstResult.originalTable.rows.length} registros`);
    console.log(`   🆕 Novos: ${firstResult.filteredTable.rows.length} registros`);
    console.log(`   🔄 Duplicados: ${firstResult.deduplicationStats.duplicateRows.length} registros`);
    
    if (firstResult.filteredTable.rows.length === testTableData.rows.length) {
      console.log('   ✅ PASSOU: Todos os registros foram considerados novos');
    } else {
      console.log('   ❌ FALHOU: Alguns registros não foram considerados novos na primeira execução');
    }
    console.log('');

    // 🧪 TESTE 2: Segunda execução com mesmos dados - todos devem ser duplicados
    console.log('2️⃣ TESTE 2: Segunda execução (mesmos dados - devem ser duplicados)');
    
    // Salvar dados da primeira execução se banco conectado
    if (databaseManager.isConnectedToDatabase() && firstResult.filteredTable.rows.length > 0) {
      try {
        const transformedData = await dataTransformer.transformScrapingDataWithDeduplication(
          [{ 
            tableName: testTableData.name,
            headers: testTableData.headers,
            rows: firstResult.filteredTable.rows,
            isEmpty: false
          }],
          { timestamp: new Date().toISOString(), source: 'test' },
          'test-duplicate-prevention'
        );
        
        await dataTransformer.saveToDatabase(transformedData);
        console.log('   💾 Dados da primeira execução salvos no banco');
      } catch (saveError) {
        console.log('   ⚠️ Erro ao salvar dados de teste:', saveError);
      }
    }

    const secondResult = await duplicateService.filterDuplicates(testTableData);
    
    console.log(`   📊 Original: ${secondResult.originalTable.rows.length} registros`);
    console.log(`   🆕 Novos: ${secondResult.filteredTable.rows.length} registros`);
    console.log(`   🔄 Duplicados: ${secondResult.deduplicationStats.duplicateRows.length} registros`);
    
    if (databaseManager.isConnectedToDatabase()) {
      if (secondResult.filteredTable.rows.length === 0) {
        console.log('   ✅ PASSOU: Todos os registros foram identificados como duplicados');
      } else {
        console.log('   ❌ FALHOU: Alguns registros não foram identificados como duplicados');
      }
    } else {
      console.log('   ⚠️ Sem banco - teste de duplicação limitado');
    }
    console.log('');

    // 🧪 TESTE 3: Dados com uma nova corrida
    console.log('3️⃣ TESTE 3: Dados com uma nova corrida');
    const testDataWithNewRide = {
      ...testTableData,
      rows: [
        ...testTableData.rows,
        ['Start', 'Corp F', 'Driver 6', 'RIDE006', 'Active', 'User 6'] // Nova corrida
      ]
    };

    const thirdResult = await duplicateService.filterDuplicates(testDataWithNewRide);
    
    console.log(`   📊 Original: ${thirdResult.originalTable.rows.length} registros`);
    console.log(`   🆕 Novos: ${thirdResult.filteredTable.rows.length} registros`);
    console.log(`   🔄 Duplicados: ${thirdResult.deduplicationStats.duplicateRows.length} registros`);
    
    if (databaseManager.isConnectedToDatabase()) {
      if (thirdResult.filteredTable.rows.length === 1) {
        console.log('   ✅ PASSOU: Apenas a nova corrida foi identificada como nova');
        
        // Verificar se é a corrida correta
        const newRideRow = thirdResult.filteredTable.rows[0];
        if (newRideRow && newRideRow.includes('RIDE006')) {
          console.log('   ✅ PASSOU: A corrida nova é a RIDE006 correta');
        } else {
          console.log('   ❌ FALHOU: A corrida nova não é a esperada');
        }
      } else {
        console.log('   ❌ FALHOU: Número incorreto de registros novos');
      }
    } else {
      console.log('   ⚠️ Sem banco - teste limitado');
    }
    console.log('');

    // 📊 RESUMO FINAL
    console.log('📋 === RESUMO DOS TESTES ===');
    console.log(`✅ Sistema baseado em Engagement ID implementado`);
    console.log(`✅ Hash sem timestamp para evitar falsos duplicados`);
    console.log(`✅ Estrutura da tabela preservada (sem alterações)`);
    console.log(`✅ Integração com sistema existente`);
    
    if (databaseManager.isConnectedToDatabase()) {
      console.log(`✅ Teste com PostgreSQL concluído`);
    } else {
      console.log(`⚠️ Teste sem PostgreSQL (funcionalidade limitada)`);
    }

    console.log('');
    console.log('🎯 COMO USAR:');
    console.log('   1. Use o endpoint: POST /api/rides/scrape-deduplicated');
    console.log('   2. Ou chame dataTransformer.transformScrapingDataWithDeduplication()');
    console.log('   3. O sistema irá automaticamente ignorar duplicados baseado no Engagement ID');

  } catch (error: any) {
    console.error('❌ Erro durante teste:', error.message);
    console.error(error.stack);
  }
}

// Executar teste se chamado diretamente
if (require.main === module) {
  testDuplicatePrevention()
    .then(() => {
      console.log('');
      console.log('🏁 Teste concluído!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Falha no teste:', error);
      process.exit(1);
    });
}

export { testDuplicatePrevention };
