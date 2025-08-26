import { MonitoringService } from './src/services/monitoringService';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function testAdaptedScraper() {
  console.log('🧪 TESTANDO SCRAPER ADAPTADO');
  console.log('='.repeat(50));
  
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'rides_db',
    user: process.env.DB_USER || 'rides_user',
    password: process.env.DB_PASSWORD || 'rides_password',
    ssl: process.env.DB_SSL === 'true'
  });

  try {
    console.log('\n📊 ANTES DO TESTE - Estado atual do banco:');
    const beforeTest = await pool.query(`
      SELECT table_name, COUNT(*) as count, source, MAX(scraped_at) as last_update
      FROM rides_data 
      GROUP BY table_name, source 
      ORDER BY table_name, source;
    `);
    
    console.table(beforeTest.rows);
    
    console.log('\n🚀 EXECUTANDO SCRAPING COM ADAPTAÇÕES...');
    
    // Criar instância do serviço de monitoramento
    const monitoringService = new MonitoringService();
    
    console.log('⚡ Executando scraping único...');
    await monitoringService.runOnce(false); // Primeira execução com login
    
    console.log('\n📊 APÓS TESTE - Verificando novos dados:');
    const afterTest = await pool.query(`
      SELECT table_name, COUNT(*) as count, source, MAX(scraped_at) as last_update
      FROM rides_data 
      GROUP BY table_name, source 
      ORDER BY last_update DESC;
    `);
    
    console.table(afterTest.rows);
    
    console.log('\n🔍 DADOS MAIS RECENTES:');
    const recentData = await pool.query(`
      SELECT 
        id,
        table_name,
        source,
        scraped_at,
        LENGTH(ride_data::text) as data_size
      FROM rides_data 
      WHERE source = 'monitoring-service-adapted'
      ORDER BY scraped_at DESC 
      LIMIT 5;
    `);
    
    console.table(recentData.rows);
    
    // Verificar estrutura dos dados adaptados
    if (recentData.rows.length > 0) {
      console.log('\n🔍 ESTRUTURA DOS DADOS ADAPTADOS:');
      const sampleData = await pool.query(`
        SELECT ride_data 
        FROM rides_data 
        WHERE source = 'monitoring-service-adapted'
        ORDER BY scraped_at DESC 
        LIMIT 1;
      `);
      
      if (sampleData.rows.length > 0) {
        try {
          const parsedData = JSON.parse(sampleData.rows[0].ride_data);
          console.log('✅ Estrutura válida encontrada:');
          console.log(`   tableName: "${parsedData.tableName}"`);
          console.log(`   newRecords: ${parsedData.newRecords?.length || 0} registros`);
          
          if (parsedData.newRecords && parsedData.newRecords.length > 0) {
            const firstRecord = parsedData.newRecords[0];
            console.log(`   Primeiro registro: [${firstRecord.length} campos]`);
            console.log(`   Sample: ${JSON.stringify(firstRecord.slice(0, 3))}`);
          }
        } catch (e: any) {
          console.log('❌ Erro ao parsear dados adaptados:', e.message);
        }
      }
    }
    
    console.log('\n✅ TESTE DE ADAPTAÇÃO CONCLUÍDO!');
    
    // Verificar se anti-duplicação funciona
    console.log('\n🔄 TESTANDO ANTI-DUPLICAÇÃO...');
    console.log('Executando scraping novamente para testar duplicação...');
    
    await monitoringService.runOnce(true); // Segunda execução sem login
    
    const finalCount = await pool.query(`
      SELECT table_name, COUNT(*) as count, source
      FROM rides_data 
      WHERE source = 'monitoring-service-adapted'
      GROUP BY table_name, source 
      ORDER BY table_name;
    `);
    
    console.log('\n📊 CONTAGEM FINAL (após segundo scraping):');
    console.table(finalCount.rows);
    console.log('💡 Se counts não mudaram = anti-duplicação funcionando!');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Erro durante teste:', error);
    await pool.end();
  }
}

// Executar teste
testAdaptedScraper().catch(console.error);
