/**
 * 🔍 ANÁLISE COMPLETA DAS TABELAS - HÍBRIDO
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 [ANALYZE] Analisando todas as tabelas para encontrar dados do híbrido...\n');

async function analyzeAllTables() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('1️⃣ Conectando ao PostgreSQL VPS...');
    
    // Listar todas as tabelas
    console.log('2️⃣ Listando todas as tabelas...');
    const tables = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log(`   📊 Encontradas ${tables.rows.length} tabelas:\n`);
    tables.rows.forEach((table, index) => {
      console.log(`   ${index + 1}. ${table.table_name}`);
    });

    // Verificar scraper_status em detalhes
    console.log('\n3️⃣ Analisando tabela scraper_status...');
    const scraperStatusCount = await pool.query(`SELECT COUNT(*) FROM scraper_status;`);
    console.log(`   📊 Total de registros: ${scraperStatusCount.rows[0].count}`);
    
    if (parseInt(scraperStatusCount.rows[0].count) > 0) {
      const allScrapers = await pool.query(`
        SELECT scraper_id, scraper_name, status, last_heartbeat 
        FROM scraper_status 
        ORDER BY last_heartbeat DESC
        LIMIT 10;
      `);
      
      console.log('   📋 Últimos scrapers registrados:');
      allScrapers.rows.forEach((scraper, index) => {
        console.log(`      ${index + 1}. ${scraper.scraper_id} - ${scraper.scraper_name} (${scraper.status})`);
      });
    }

    // Verificar se existe alguma menção a 'hybrid' em qualquer lugar
    console.log('\n4️⃣ Procurando qualquer menção a "hybrid"...');
    
    for (const table of tables.rows) {
      try {
        const tableName = table.table_name;
        
        // Tentar procurar 'hybrid' em campos de texto
        const searchResult = await pool.query(`
          SELECT * FROM ${tableName} 
          WHERE CAST(${tableName} AS TEXT) ILIKE '%hybrid%' 
          LIMIT 5;
        `);
        
        if (searchResult.rows.length > 0) {
          console.log(`   🎯 Encontrado "hybrid" na tabela "${tableName}":`);
          searchResult.rows.forEach((row, index) => {
            console.log(`      ${index + 1}. ${JSON.stringify(row)}`);
          });
        }
      } catch (error) {
        // Ignorar erros de tabelas que não podem ser pesquisadas
      }
    }

    // Verificar registros recentes (últimos 10 minutos)
    console.log('\n5️⃣ Verificando registros recentes (últimos 10 min)...');
    
    for (const table of tables.rows) {
      try {
        const tableName = table.table_name;
        
        // Procurar colunas de timestamp
        const columns = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${tableName}' 
          AND data_type IN ('timestamp', 'timestamptz', 'timestamp with time zone', 'timestamp without time zone')
          LIMIT 1;
        `);
        
        if (columns.rows.length > 0) {
          const timestampColumn = columns.rows[0].column_name;
          
          const recentData = await pool.query(`
            SELECT * FROM ${tableName} 
            WHERE ${timestampColumn} > NOW() - INTERVAL '10 minutes'
            LIMIT 3;
          `);
          
          if (recentData.rows.length > 0) {
            console.log(`   🕐 Registros recentes em "${tableName}":`);
            recentData.rows.forEach((row, index) => {
              console.log(`      ${index + 1}. ${JSON.stringify(row).substring(0, 200)}...`);
            });
          }
        }
      } catch (error) {
        // Ignorar erros
      }
    }

    console.log('\n🎉 [ANALYZE] Análise concluída!');
    
    return {
      success: true,
      tablesCount: tables.rows.length,
      scraperStatusCount: parseInt(scraperStatusCount.rows[0].count)
    };

  } catch (error) {
    console.error('❌ [ANALYZE] Erro durante análise:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await pool.end();
  }
}

// Executar análise
analyzeAllTables()
  .then(result => {
    console.log('\n📋 [ANALYZE] Resultado:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ [ANALYZE] Falha crítica:', error);
    process.exit(1);
  });
