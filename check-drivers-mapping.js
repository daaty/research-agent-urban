require('dotenv').config();
const { Client } = require('pg');

async function checkDriversTable() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('🔗 Conectado ao banco de dados!');

        // Primeiro, vamos ver uma amostra dos dados para descobrir as colunas
        const sampleQuery = 'SELECT * FROM drivers_data LIMIT 1';
        const sampleResult = await client.query(sampleQuery);
        
        if (sampleResult.rows.length > 0) {
            console.log('\n📋 Colunas disponíveis na tabela drivers_data:');
            const columns = Object.keys(sampleResult.rows[0]);
            columns.forEach((col, index) => {
                console.log(`${index + 1}. ${col}`);
            });

            console.log('\n📊 Amostra dos dados:');
            console.table([sampleResult.rows[0]]);
        }

        // Agora vamos ver os últimos 5 registros com as colunas corretas
        const dataQuery = 'SELECT * FROM drivers_data ORDER BY created_at DESC LIMIT 5';
        const dataResult = await client.query(dataQuery);
        
        console.log('\n🔍 Últimos 5 registros:');
        console.table(dataResult.rows);

        // Verificar se há problemas nos dados
        console.log('\n🧐 Análise dos dados:');
        dataResult.rows.forEach((row, index) => {
            console.log(`\nRegistro ${index + 1}:`);
            console.log(`- ID: ${row.driver_id}`);
            console.log(`- Nome: ${row.name}`);
            console.log(`- Telefone: ${row.phone_no || 'N/A'}`);
            console.log(`- Cidade: ${row.city || 'N/A'}`);
            
            // Verificar se o ID está no campo nome (problema de mapeamento)
            if (row.name && /^\d+$/.test(row.name)) {
                console.log(`⚠️  PROBLEMA: Nome parece ser um ID numérico: ${row.name}`);
            }
            
            // Verificar se há nome no campo ID
            if (row.driver_id && isNaN(row.driver_id)) {
                console.log(`⚠️  PROBLEMA: driver_id parece ser texto: ${row.driver_id}`);
            }
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await client.end();
    }
}

checkDriversTable();
