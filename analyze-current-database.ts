import { DatabaseManager } from './src/services/databaseManager';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function analyzeCurrentDatabase() {
  console.log('🔍 ANÁLISE DA ESTRUTURA ATUAL DO BANCO DE DADOS');
  console.log('='.repeat(60));
  
  const dbManager = DatabaseManager.getInstance();
  
  try {
    // 1. Inicializar conexão
    await dbManager.initialize();
    console.log('✅ Conectado ao banco de dados');
    
    // 2. Usar getDatabaseStats que já existe
    console.log('\n📊 ESTATÍSTICAS GERAIS DO BANCO:');
    const stats = await dbManager.getDatabaseStats();
    console.log(JSON.stringify(stats, null, 2));
    
    // 3. Criar conexão direta para queries customizadas
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'rides_db',
      user: process.env.DB_USER || 'rides_user',
      password: process.env.DB_PASSWORD || 'rides_password',
      ssl: process.env.DB_SSL === 'true'
    });
    
    // 4. Verificar estrutura da tabela rides_data
    console.log('\n📋 ESTRUTURA DA TABELA rides_data:');
    const tableStructure = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns 
      WHERE table_name = 'rides_data'
      ORDER BY ordinal_position;
    `);
    
    console.table(tableStructure.rows);
    
    // 5. Verificar constraints
    console.log('\n🔒 CONSTRAINTS DA TABELA:');
    const constraints = await pool.query(`
      SELECT 
        tc.constraint_name, 
        tc.constraint_type,
        string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = 'rides_data'
      GROUP BY tc.constraint_name, tc.constraint_type;
    `);
    
    console.table(constraints.rows);
    
    // 6. Verificar dados existentes - amostra de cada table_name
    console.log('\n📊 AMOSTRA DOS DADOS EXISTENTES:');
    const sampleData = await pool.query(`
      SELECT DISTINCT 
        table_name,
        COUNT(*) as total_records
      FROM rides_data 
      GROUP BY table_name
      ORDER BY table_name;
    `);
    
    console.table(sampleData.rows);
    
    // 7. Verificar estrutura de um registro completo de cada tipo
    console.log('\n🎯 ESTRUTURA DETALHADA DOS DADOS:');
    
    for (const row of sampleData.rows) {
      console.log(`\n--- ${row.table_name} (${row.total_records} registros) ---`);
      
      const sample = await pool.query(`
        SELECT 
          ride_data,
          data_hash,
          scraped_at,
          source
        FROM rides_data 
        WHERE table_name = $1 
        LIMIT 1;
      `, [row.table_name]);
      
      if (sample.rows.length > 0) {
        console.log('📋 Estrutura do ride_data:');
        const rideData = sample.rows[0].ride_data;
        
        if (typeof rideData === 'object' && rideData !== null) {
          console.log('Campos disponíveis:', Object.keys(rideData));
          console.log('Dados de exemplo:');
          console.log(JSON.stringify(rideData, null, 2));
        } else {
          console.log('ride_data:', rideData);
        }
        
        console.log(`Data hash: ${sample.rows[0].data_hash}`);
        console.log(`Scraped at: ${sample.rows[0].scraped_at}`);
        console.log(`Source: ${sample.rows[0].source}`);
      }
    }
    
    // 8. Verificar se existe tabela drivers_data
    console.log('\n👥 VERIFICANDO TABELA DRIVERS_DATA:');
    const driversTableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'drivers_data'
      );
    `);
    
    if (driversTableExists.rows[0].exists) {
      console.log('✅ Tabela drivers_data existe');
      
      const driversStructure = await pool.query(`
        SELECT 
          column_name,
          data_type,
          is_nullable,
          column_default
        FROM information_schema.columns 
        WHERE table_name = 'drivers_data'
        ORDER BY ordinal_position;
      `);
      
      console.table(driversStructure.rows);
      
      const driversCount = await pool.query(`
        SELECT COUNT(*) as total FROM drivers_data;
      `);
      
      console.log(`Total de drivers: ${driversCount.rows[0].total}`);
    } else {
      console.log('❌ Tabela drivers_data não existe');
    }
    
    // 9. Verificar últimas inserções
    console.log('\n🕐 ÚLTIMAS INSERÇÕES:');
    const recentData = await pool.query(`
      SELECT 
        table_name,
        source,
        scraped_at,
        data_hash
      FROM rides_data 
      ORDER BY scraped_at DESC 
      LIMIT 10;
    `);
    
    console.table(recentData.rows);
    
    await pool.end();
    console.log('\n✅ ANÁLISE COMPLETA!');
    
  } catch (error) {
    console.error('❌ Erro durante análise:', error);
  }
}

// Executar análise
analyzeCurrentDatabase().catch(console.error);
