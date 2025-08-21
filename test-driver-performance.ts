import { DriversPersistentScraper } from './src/scraper/driversPersistentScraper';
import { DatabaseManager } from './src/services/databaseManager';

/**
 * Teste específico para Driver Performance
 * Verifica se a página está sendo processada corretamente
 */

async function testDriverPerformance() {
  console.log('🧪 TESTE ESPECÍFICO - DRIVER PERFORMANCE');
  console.log('=========================================');

  try {
    // 1. Inicializar banco de dados
    console.log('🗄️ Inicializando banco de dados...');
    const dbManager = DatabaseManager.getInstance();
    await dbManager.initialize();
    console.log('✅ Banco de dados conectado');

    // 2. Criar instância do scraper
    console.log('🚗 Inicializando scraper de drivers...');
    const scraper = new DriversPersistentScraper();
    
    // 3. Mostrar páginas configuradas
    const pages = scraper.getDriversPages();
    console.log('📋 Páginas de drivers configuradas:');
    pages.forEach((page, index) => {
      console.log(`   ${index + 1}. ${page.name} - ${page.url}`);
    });

    // 4. Verificar se Driver Performance está na lista
    const performancePage = pages.find(page => page.name === 'Driver Performance');
    if (performancePage) {
      console.log('✅ Driver Performance encontrado na configuração');
      console.log(`   URL: ${performancePage.url}`);
    } else {
      console.log('❌ Driver Performance NÃO encontrado na configuração');
      return;
    }

    // 5. Executar scraping
    console.log('');
    console.log('🔄 Executando scraping de drivers...');
    const result = await scraper.scrapeAllDriversData();

    if (result.success) {
      console.log('✅ Scraping concluído com sucesso');
      console.log(`📊 Total de tabelas extraídas: ${result.data.length}`);
      
      // 6. Verificar dados de Driver Performance
      for (const table of result.data) {
        console.log(`📋 Tabela: ${table.name}`);
        console.log(`   URL: ${table.url}`);
        console.log(`   Headers: ${table.headers.length}`);
        console.log(`   Linhas: ${table.rows.length}`);
        console.log(`   Vazia: ${table.isEmpty ? 'Sim' : 'Não'}`);
        
        if (table.name === 'Driver Performance') {
          console.log('🎯 ANÁLISE ESPECÍFICA - DRIVER PERFORMANCE:');
          console.log(`   Headers encontrados: ${table.headers.join(', ')}`);
          console.log(`   Primeira linha: ${table.rows[0] ? table.rows[0].join(' | ') : 'Nenhuma'}`);
          
          if (!table.isEmpty && table.rows.length > 0) {
            // 7. Processar dados estruturados
            console.log('🔄 Processando dados estruturados...');
            const processedData = scraper.processDriverPerformanceData(table);
            console.log(`✅ ${processedData.length} registros processados`);
            
            if (processedData.length > 0) {
              console.log('📄 Exemplo de registro processado:');
              console.log(JSON.stringify(processedData[0], null, 2));
              
              // 8. Salvar no banco
              try {
                console.log('💾 Salvando no banco de dados...');
                await dbManager.saveDriverPerformanceData(processedData);
                console.log('✅ Dados salvos com sucesso');
              } catch (saveError: any) {
                console.error('❌ Erro ao salvar no banco:', saveError.message);
              }
            }
          }
        }
        console.log('');
      }
      
    } else {
      console.log('❌ Falha no scraping:', result.message);
    }

  } catch (error: any) {
    console.error('❌ Erro no teste:', error.message);
    console.error(error.stack);
  }
}

// Executar teste
if (require.main === module) {
  testDriverPerformance().catch(error => {
    console.error('❌ Falha crítica no teste:', error);
    process.exit(1);
  });
}

export { testDriverPerformance };
