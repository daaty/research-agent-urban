/**
 * 🔍 VERIFICAÇÃO DOS DADOS DO HÍBRIDO NO POSTGRESQL
 * 
 * Verifica se o híbrido realmente salvou dados na tabela scraper_status
 */

const { Pool } = require('pg');
require('dotenv').config(); // Carregar .env

console.log('🔍 [VERIFY] Verificando dados do híbrido no PostgreSQL...\n');

async function verifyHybridInDatabase() {
  // Usar mesma config do híbrido
  let pool;
  
  if (process.env.DATABASE_URL) {
    console.log('   🔗 Usando DATABASE_URL do .env');
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  } else {
    console.log('   🔗 Usando configuração individual');
    pool = new Pool({
      user: process.env.PGUSER || 'postgres',
      host: process.env.PGHOST || 'localhost',
      database: process.env.PGDATABASE || 'rides_db',
      password: process.env.PGPASSWORD || '',
      port: process.env.PGPORT || 5432,
    });
  }

  try {
    console.log('1️⃣ Conectando ao PostgreSQL...');
    
    // Verificar se a tabela existe
    console.log('2️⃣ Verificando tabela scraper_status...');
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'scraper_status'
      );
    `);
    
    if (!tableExists.rows[0].exists) {
      console.log('   ❌ Tabela scraper_status não existe!');
      return { success: false, error: 'Tabela não existe' };
    }
    
    console.log('   ✅ Tabela scraper_status existe\n');

    // Buscar scrapers híbridos
    console.log('3️⃣ Buscando scrapers híbridos...');
    const hybridScrapers = await pool.query(`
      SELECT * FROM scraper_status 
      WHERE scraper_id LIKE 'hybrid-%'
      ORDER BY last_heartbeat DESC;
    `);

    console.log(`   📊 Encontrados ${hybridScrapers.rows.length} scrapers híbridos\n`);

    if (hybridScrapers.rows.length > 0) {
      console.log('4️⃣ Detalhes dos scrapers híbridos:');
      
      hybridScrapers.rows.forEach((scraper, index) => {
        console.log(`\n   🤖 Scraper ${index + 1}:`);
        console.log(`      ID: ${scraper.scraper_id}`);
        console.log(`      Name: ${scraper.scraper_name}`);
        console.log(`      Status: ${scraper.status}`);
        console.log(`      Last Heartbeat: ${new Date(scraper.last_heartbeat).toLocaleString()}`);
        console.log(`      Rides Scraped: ${scraper.rides_scraped}`);
        console.log(`      Drivers Scraped: ${scraper.drivers_scraped}`);
        console.log(`      Errors: ${scraper.errors_count}`);
        console.log(`      Success Rate: ${scraper.success_rate}%`);
        console.log(`      Response Time: ${scraper.response_time_ms}ms`);
        console.log(`      Created At: ${new Date(scraper.created_at).toLocaleString()}`);
        console.log(`      Updated At: ${new Date(scraper.updated_at).toLocaleString()}`);
      });

      // Verificar última atividade
      const lastHeartbeat = new Date(hybridScrapers.rows[0].last_heartbeat);
      const now = new Date();
      const timeDiff = now - lastHeartbeat;
      const minutesAgo = Math.floor(timeDiff / (1000 * 60));

      console.log(`\n   💓 Último heartbeat foi há ${minutesAgo} minutos`);
      
      if (minutesAgo <= 5) {
        console.log('   ✅ Híbrido está ATIVO (heartbeat recente)');
      } else {
        console.log('   ⚠️ Híbrido pode estar INATIVO (heartbeat antigo)');
      }

    } else {
      console.log('   ❌ Nenhum scraper híbrido encontrado no banco!');
    }

    console.log('\n🎉 [VERIFY] Verificação concluída!');
    
    return {
      success: true,
      hybridCount: hybridScrapers.rows.length,
      scrapers: hybridScrapers.rows
    };

  } catch (error) {
    console.error('❌ [VERIFY] Erro durante verificação:', error);
    return {
      success: false,
      error: error.message
    };
  } finally {
    await pool.end();
  }
}

// Executar verificação
verifyHybridInDatabase()
  .then(result => {
    console.log('\n📋 [VERIFY] Resultado:', JSON.stringify(result, null, 2));
    
    if (result.success && result.hybridCount > 0) {
      console.log('\n🎉 SUCESSO: O híbrido está salvando dados no PostgreSQL!');
      console.log('📊 O dashboard pode acessar estes dados da tabela scraper_status');
      console.log('🔗 A integração híbrido ↔ dashboard funciona via PostgreSQL');
    } else if (result.success && result.hybridCount === 0) {
      console.log('\n⚠️ ATENÇÃO: Conexão OK, mas nenhum híbrido encontrado');
    } else {
      console.log('\n❌ ERRO: Problemas de conexão ou consulta');
    }
    
    process.exit(result.success ? 0 : 1);
  })
  .catch(error => {
    console.error('\n❌ [VERIFY] Falha crítica:', error);
    process.exit(1);
  });
