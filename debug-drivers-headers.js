require('dotenv').config();
const { Client } = require('pg');

async function debugDriversData() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('🔗 Conectado ao banco de dados!');

        // Vamos ver os últimos registros com session_info para entender os headers
        const query = `
            SELECT 
                driver_id, name, email, mobile,
                session_info,
                additional_data,
                scraped_at
            FROM drivers_data 
            ORDER BY scraped_at DESC 
            LIMIT 3
        `;
        
        const result = await client.query(query);
        
        console.log('\n🔍 Últimos 3 registros com detalhes:');
        
        result.rows.forEach((row, index) => {
            console.log(`\n━━━ REGISTRO ${index + 1} ━━━`);
            console.log(`❌ DADOS ERRADOS:`);
            console.log(`   driver_id: "${row.driver_id}"`);
            console.log(`   name: "${row.name}"`);
            console.log(`   email: "${row.email}"`);
            console.log(`   mobile: "${row.mobile}"`);
            
            if (row.session_info) {
                console.log(`\n📋 Headers capturados:`);
                console.log(JSON.stringify(row.session_info.headers || [], null, 2));
            }
            
            if (row.additional_data) {
                console.log(`\n📊 Dados adicionais:`);
                console.log(JSON.stringify(row.additional_data, null, 2));
            }
            
            console.log(`\n⏰ Data: ${row.scraped_at}`);
        });

    } catch (error) {
        console.error('❌ Erro:', error.message);
    } finally {
        await client.end();
    }
}

debugDriversData();
