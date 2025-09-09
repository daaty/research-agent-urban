/**
 * 🔍 VERIFICAR ESTRUTURA DA TABELA SCRAPER_STATUS
 */

const { Pool } = require('pg');
require('dotenv').config();

console.log('🔍 [SCHEMA] Verificando estrutura da tabela scraper_status...\n');

async function checkScraperStatusSchema() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    console.log('1️⃣ Conectando ao PostgreSQL...');
    
    // Verificar estrutura da tabela
    console.log('2️⃣ Verificando colunas da tabela scraper_status...');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'scraper_status'
      ORDER BY ordinal_position;
    `);
    
    console.log(`   📊 Encontradas ${columns.rows.length} colunas:\n`);
    columns.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - Nullable: ${col.is_nullable}`);
    });

    // Verificar registros existentes para ver o padrão
    console.log('\n3️⃣ Verificando registros existentes...');
    const data = await pool.query(`SELECT * FROM scraper_status LIMIT 2;`);
    
    if (data.rows.length > 0) {
      console.log('   📋 Exemplo de registro:');
      console.log('   ' + JSON.stringify(data.rows[0], null, 2));
    }

    console.log('\n🎉 [SCHEMA] Verificação concluída!');
    
    return {
      success: true,
      columns: columns.rows,
      sampleData: data.rows[0] || null
    };

  } catch (error) {
    console.error('❌ [SCHEMA] Erro durante verificação:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await pool.end();
  }
}

// Executar verificação
checkScraperStatusSchema()
  .then(result => {
    console.log('\n📋 [SCHEMA] Resultado:', JSON.stringify(result, null, 2));
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ [SCHEMA] Falha crítica:', error);
    process.exit(1);
  });
