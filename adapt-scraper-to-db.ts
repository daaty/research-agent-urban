import { DatabaseManager } from './src/services/databaseManager';
import { BrowserSessionManager } from './src/services/browserSessionManager';
import { Pool } from 'pg';
import * as dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

async function adaptScraperToCurrentStructure() {
  console.log('🔧 ADAPTANDO SCRAPER PARA ESTRUTURA ATUAL DO BANCO');
  console.log('='.repeat(65));
  
  const dbManager = DatabaseManager.getInstance();
  const sessionManager = BrowserSessionManager.getInstance();
  
  try {
    // 1. Inicializar conexões
    await dbManager.initialize();
    console.log('✅ Conectado ao banco de dados');

    // 2. Mapear estrutura atual vs páginas do scraper
    console.log('\n📋 MAPEAMENTO ATUAL:');
    console.log('Pages do Scraper → Dados na DB:');
    console.log('- "Ongoing Rides" → Podem virar "rides_data" (em andamento)');
    console.log('- "Scheduled Rides" → Podem virar "rides_data" (agendadas)');
    console.log('- "Completed Rides" → Já existe na DB como "Completed Rides"');
    console.log('- "Cancelled Rides" → Já existe na DB como "Cancelled Rides"');
    console.log('- "Missed Rides" → Já existe na DB como "Missed Rides"');

    // 3. Verificar dados atuais para entender padrão
    const pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'rides_db',
      user: process.env.DB_USER || 'rides_user',
      password: process.env.DB_PASSWORD || 'rides_password',
      ssl: process.env.DB_SSL === 'true'
    });

    // 4. Analisar estrutura dos dados de cada tipo
    console.log('\n🔍 ANÁLISE DE ESTRUTURA POR TIPO:');
    
    const types = ['rides_data', 'Completed Rides', 'Cancelled Rides', 'Missed Rides'];
    
    for (const type of types) {
      console.log(`\n--- ANÁLISE: ${type} ---`);
      
      const sample = await pool.query(`
        SELECT ride_data 
        FROM rides_data 
        WHERE table_name = $1 
        LIMIT 1;
      `, [type]);
      
      if (sample.rows.length > 0) {
        const data = sample.rows[0].ride_data;
        
        if (data && data.newRecords && data.newRecords.length > 0) {
          const firstRecord = data.newRecords[0];
          console.log(`✅ Estrutura encontrada: Array com ${firstRecord.length} campos`);
          console.log(`📋 Primeiro registro (primeiros 5 campos):`, firstRecord.slice(0, 5));
          
          // Tentar identificar padrão
          console.log('🎯 Campos identificados:');
          console.log(`   [0] ID: ${firstRecord[0]}`);
          console.log(`   [1] Driver: ${firstRecord[1]}`);
          console.log(`   [2] Passenger: ${firstRecord[2] || 'N/A'}`);
          console.log(`   [3] Phone/Info: ${firstRecord[3] || 'N/A'}`);
          console.log(`   [4] Address/Route: ${firstRecord[4] || 'N/A'}`);
          
          if (firstRecord.length > 10) {
            console.log(`   [9] Status: ${firstRecord[9] || 'N/A'}`);
            console.log(`   [10] Type: ${firstRecord[10] || 'N/A'}`);
          }
        } else {
          console.log('❌ Estrutura não reconhecida ou dados vazios');
        }
      } else {
        console.log('❌ Nenhum dado encontrado para este tipo');
      }
    }

    // 5. Propor mapeamento das páginas do scraper
    console.log('\n🎯 PROPOSTA DE MAPEAMENTO PARA ADAPTAÇÃO:');
    console.log(`
📋 MAPEAMENTO PROPOSTO:
┌─────────────────────────────────────────────────────────────────┐
│ PÁGINA DO SCRAPER        │ TABLE_NAME NA DB    │ DESCRIÇÃO        │
├─────────────────────────────────────────────────────────────────┤
│ "Ongoing Rides"          │ "Ongoing Rides"     │ Corridas ativas  │
│ "Scheduled Rides"        │ "Scheduled Rides"   │ Corridas agendas │
│ "Completed Rides"        │ "Completed Rides"   │ Corridas concluí │
│ "Cancelled Rides"        │ "Cancelled Rides"   │ Corridas cancel  │
│ "Missed Rides"           │ "Missed Rides"      │ Corridas perdidas│
└─────────────────────────────────────────────────────────────────┘

🔧 MUDANÇAS NECESSÁRIAS NO SCRAPER:
1. Manter estrutura de dados atual: {tableName, newRecords: [...]}
2. Usar nome da página como table_name
3. Preservar formato de array para cada registro
4. Continuar usando o mesmo sistema de hash para anti-duplicação
`);

    // 6. Verificar se há dados "rides_data" genéricos que precisam ser migrados
    const genericRides = await pool.query(`
      SELECT COUNT(*) as count 
      FROM rides_data 
      WHERE table_name = 'rides_data';
    `);
    
    if (parseInt(genericRides.rows[0].count) > 0) {
      console.log(`\n⚠️ ENCONTRADOS ${genericRides.rows[0].count} registros com table_name = 'rides_data'`);
      console.log('   Estes podem ser dados importados que precisam ser categorizados');
      
      // Verificar se podemos determinar o tipo pelos dados
      const sampleGeneric = await pool.query(`
        SELECT ride_data 
        FROM rides_data 
        WHERE table_name = 'rides_data' 
        LIMIT 1;
      `);
      
      if (sampleGeneric.rows.length > 0) {
        const data = sampleGeneric.rows[0].ride_data;
        console.log('📋 Amostra dos dados genéricos:');
        console.log('   tableName:', data.tableName);
        console.log('   Tipo de dados:', data.newRecords ? 'Array de registros' : 'Formato desconhecido');
      }
    }

    await pool.end();
    
    console.log('\n✅ ANÁLISE DE ADAPTAÇÃO CONCLUÍDA!');
    console.log('\n🚀 PRÓXIMOS PASSOS:');
    console.log('1. Modificar ridesPersistentScraper para usar nomes das páginas como table_name');
    console.log('2. Manter estrutura {tableName, newRecords} para compatibilidade');
    console.log('3. Adaptar MonitoringService para processar múltiplos tipos');
    console.log('4. Testar com dados reais do scraper');
    
  } catch (error) {
    console.error('❌ Erro durante adaptação:', error);
  }
}

// Executar análise
adaptScraperToCurrentStructure().catch(console.error);
