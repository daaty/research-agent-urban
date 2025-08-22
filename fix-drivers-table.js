require('dotenv').config();
const { Client } = require('pg');

async function fixDuplicateSequence() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL
    });

    try {
        await client.connect();
        console.log('🔗 Conectado ao PostgreSQL!');

        console.log('\n🔍 Verificando sequências existentes...');
        
        // Verificar se a sequência existe
        const checkSeq = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM pg_class 
                WHERE relname = 'drivers_data_id_seq' 
                AND relkind = 'S'
            ) as seq_exists
        `);
        
        console.log(`Sequência drivers_data_id_seq existe: ${checkSeq.rows[0].seq_exists}`);

        // Verificar se a tabela existe
        const checkTable = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'drivers_data'
            ) as table_exists
        `);
        
        console.log(`Tabela drivers_data existe: ${checkTable.rows[0].table_exists}`);

        if (checkSeq.rows[0].seq_exists) {
            console.log('\n🧹 Removendo sequência duplicada...');
            
            // Primeiro, remover a dependência se existir
            try {
                await client.query('ALTER TABLE IF EXISTS drivers_data ALTER COLUMN id DROP DEFAULT');
                console.log('✅ Default removido da coluna id');
            } catch (err) {
                console.log('⚠️  Coluna id não tinha default ou tabela não existe');
            }
            
            // Remover a sequência
            await client.query('DROP SEQUENCE IF EXISTS drivers_data_id_seq CASCADE');
            console.log('✅ Sequência drivers_data_id_seq removida');
        }

        console.log('\n🔧 Recriando estrutura da tabela drivers_data...');
        
        // Recriar a tabela com estrutura correta
        await client.query(`
            DROP TABLE IF EXISTS drivers_data CASCADE;
            
            CREATE TABLE drivers_data (
                id SERIAL PRIMARY KEY,
                driver_id VARCHAR(50),
                name VARCHAR(255),
                email VARCHAR(255),
                mobile VARCHAR(50),
                data_type VARCHAR(100),
                page_source VARCHAR(255),
                additional_data JSONB,
                data_hash VARCHAR(64),
                scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                session_info JSONB,
                source VARCHAR(255),
                unique_id VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        
        console.log('✅ Tabela drivers_data recriada com sucesso!');

        // Criar índices
        await client.query(`
            CREATE INDEX IF NOT EXISTS idx_drivers_data_driver_id ON drivers_data(driver_id);
            CREATE INDEX IF NOT EXISTS idx_drivers_data_hash ON drivers_data(data_hash);
            CREATE INDEX IF NOT EXISTS idx_drivers_data_scraped_at ON drivers_data(scraped_at);
            CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_data_unique ON drivers_data(unique_id);
        `);
        
        console.log('✅ Índices criados com sucesso!');

        // Verificar se funcionou
        const finalCheck = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'drivers_data' 
            ORDER BY ordinal_position
        `);
        
        console.log('\n📋 Estrutura final da tabela drivers_data:');
        console.table(finalCheck.rows);

        console.log('\n🎉 Correção concluída! O sistema pode ser reiniciado.');

    } catch (error) {
        console.error('❌ Erro:', error.message);
        console.error('Stack:', error.stack);
    } finally {
        await client.end();
    }
}

fixDuplicateSequence();
