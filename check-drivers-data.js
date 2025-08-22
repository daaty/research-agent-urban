const { Pool } = require('pg');

async function checkDriversData() {
  const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:senha123@localhost:5432/research_agent_urban' 
  });

  try {
    console.log('🔍 Verificando dados da tabela drivers_data...\n');
    
    // Últimos 5 registros
    const result = await pool.query(`
      SELECT driver_id, name, mobile, data_type, page_source, additional_data 
      FROM drivers_data 
      ORDER BY id DESC 
      LIMIT 5
    `);
    
    console.log('📊 Últimos 5 registros da tabela drivers_data:');
    result.rows.forEach((row, i) => {
      console.log(`${i+1}. ID: ${row.driver_id} | Nome: ${row.name} | Mobile: ${row.mobile}`);
      console.log(`   Tipo: ${row.data_type} | Página: ${row.page_source}`);
      console.log(`   Additional: ${JSON.stringify(row.additional_data).substring(0, 100)}...`);
      console.log('');
    });
    
    // Exemplo de Active Drivers
    console.log('\n🔍 Verificando estrutura de Active Drivers...');
    const activeDrivers = await pool.query(`
      SELECT additional_data 
      FROM drivers_data 
      WHERE page_source = 'Active Drivers' 
      LIMIT 1
    `);
    
    if (activeDrivers.rows.length > 0) {
      console.log('📋 Campos disponíveis em Active Drivers:');
      const fields = Object.keys(activeDrivers.rows[0].additional_data);
      fields.forEach(field => console.log(`  - ${field}`));
      
      console.log('\n📋 Exemplo de dados completos:');
      console.log(JSON.stringify(activeDrivers.rows[0].additional_data, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Erro ao consultar banco:', error.message);
  } finally {
    await pool.end();
  }
}

checkDriversData();
