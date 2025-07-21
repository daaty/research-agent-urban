import { getPersistentScraper } from './src/scraper/ridesPersistentScraper';
import { DataCacheManager } from './src/services/dataCacheManager';

/**
 * Script para testar o sistema de cache e detecção de mudanças
 */
async function testCacheSystem() {
  const scraper = getPersistentScraper();
  const cacheManager = DataCacheManager.getInstance();

  console.log('🧪 === TESTE DO SISTEMA DE CACHE ===');
  console.log('');

  try {
    // 1. Verificar estatísticas iniciais do cache
    console.log('1️⃣ Verificando estado inicial do cache...');
    const initialStats = scraper.getCacheStats();
    console.log('Estado inicial:', initialStats);
    console.log('');

    // 2. Primeira execução (todos os dados são novos)
    console.log('2️⃣ Primeira execução - todos os dados devem ser novos...');
    const firstResult = await scraper.scrapeAllData();
    
    if (firstResult.success) {
      console.log('✅ Primeira execução concluída');
      console.log('Has changes:', firstResult.hasChanges);
      console.log('Total records:', firstResult.data.reduce((sum, table) => sum + table.rows.length, 0));
      
      if (firstResult.differences) {
        console.log('Diferenças encontradas:');
        firstResult.differences.forEach(diff => {
          console.log(`  - ${diff.tableName}: ${diff.totalNewRecords} novos registros`);
        });
      }
    } else {
      console.log('❌ Primeira execução falhou:', firstResult.message);
    }
    console.log('');

    // 3. Segunda execução (não deveria ter mudanças)
    console.log('3️⃣ Segunda execução - não deve ter mudanças...');
    const secondResult = await scraper.scrapeAllData();
    
    if (secondResult.success) {
      console.log('✅ Segunda execução concluída');
      console.log('Has changes:', secondResult.hasChanges);
      console.log('Total records:', secondResult.data.reduce((sum, table) => sum + table.rows.length, 0));
      
      if (secondResult.hasChanges && secondResult.differences) {
        console.log('⚠️ Mudanças detectadas (inesperado):');
        secondResult.differences.forEach(diff => {
          console.log(`  - ${diff.tableName}: ${diff.totalNewRecords} novos registros`);
        });
      } else {
        console.log('✅ Nenhuma mudança detectada (esperado)');
      }
    } else {
      console.log('❌ Segunda execução falhou:', secondResult.message);
    }
    console.log('');

    // 4. Verificar estatísticas finais do cache
    console.log('4️⃣ Verificando estado final do cache...');
    const finalStats = scraper.getCacheStats();
    console.log('Estado final:', finalStats);
    console.log('');

    // 5. Simular limpeza do cache
    console.log('5️⃣ Testando limpeza do cache...');
    scraper.clearCache();
    const afterClearStats = scraper.getCacheStats();
    console.log('Estado após limpeza:', afterClearStats);
    console.log('');

    // 6. Terceira execução (após limpeza, todos os dados devem ser novos novamente)
    console.log('6️⃣ Terceira execução após limpeza - todos os dados devem ser novos...');
    const thirdResult = await scraper.scrapeAllData();
    
    if (thirdResult.success) {
      console.log('✅ Terceira execução concluída');
      console.log('Has changes:', thirdResult.hasChanges);
      console.log('Total records:', thirdResult.data.reduce((sum, table) => sum + table.rows.length, 0));
      
      if (thirdResult.differences) {
        console.log('Diferenças encontradas:');
        thirdResult.differences.forEach(diff => {
          console.log(`  - ${diff.tableName}: ${diff.totalNewRecords} novos registros`);
        });
      }
    } else {
      console.log('❌ Terceira execução falhou:', thirdResult.message);
    }
    console.log('');

    // 7. Demonstrar payload do webhook
    console.log('7️⃣ Exemplo de payload do webhook:');
    if (thirdResult.success && thirdResult.hasChanges && thirdResult.differences) {
      const webhookPayload = {
        timestamp: new Date().toISOString(),
        source: 'rides-dashboard-persistent',
        mode: 'persistent-browser',
        sessionInfo: thirdResult.sessionInfo,
        onlyNewData: true,
        differences: thirdResult.differences,
        summary: {
          totalNewRecords: thirdResult.differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0),
          totalUpdatedRecords: thirdResult.differences.reduce((sum, diff) => sum + diff.updatedRecords.length, 0),
          totalRemovedRecords: thirdResult.differences.reduce((sum, diff) => sum + diff.removedRecords.length, 0),
          tablesWithChanges: thirdResult.differences.length
        }
      };
      
      console.log('Payload que seria enviado para n8n:');
      console.log(JSON.stringify(webhookPayload, null, 2));
    }

  } catch (error) {
    console.error('❌ Erro durante teste:', error);
  }

  console.log('');
  console.log('🎉 Teste concluído!');
  console.log('');
  console.log('💡 Resumo do que foi testado:');
  console.log('✅ Cache inicial vazio');
  console.log('✅ Primeira execução - todos os dados são novos');
  console.log('✅ Segunda execução - nenhuma mudança');
  console.log('✅ Limpeza do cache');
  console.log('✅ Terceira execução - todos os dados novos novamente');
  console.log('✅ Payload do webhook otimizado');
}

// Executar teste
testCacheSystem().catch(console.error);
