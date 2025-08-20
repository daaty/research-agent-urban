import { Pool } from 'pg';

async function fixConstraintFinal() {
  console.log('🔧 CORRIGINDO CONSTRAINT PARA MONITORAMENTO FUNCIONAR');
  console.log('==================================================');
  
  // Usar conexão direta
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgres://n8n_user:n8n_pw@148.230.73.27:5432/n8n_db?sslmode=disable'
  });
  
  try {
    await pool.connect();
    console.log('✅ Conectado ao banco');
    
    // 1. Verificar se constraint existe
    console.log('\n📋 Verificando constraints existentes...');
    const constraints = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'rides_data' AND constraint_type = 'UNIQUE';
    `);
    
    console.log('Constraints encontradas:', constraints.rows);
    
    // 2. Verificar estrutura atual da tabela
    console.log('\n📋 Estrutura atual da tabela rides_data:');
    const columns = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'rides_data' 
      ORDER BY ordinal_position;
    `);
    
    columns.rows.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'})`);
    });
    
    // 3. Verificar se tem dados que impediriam a criação da constraint
    console.log('\n📊 Verificando dados existentes...');
    const duplicates = await pool.query(`
      SELECT table_name, data_hash, COUNT(*) as count
      FROM rides_data 
      WHERE table_name IS NOT NULL AND data_hash IS NOT NULL
      GROUP BY table_name, data_hash 
      HAVING COUNT(*) > 1;
    `);
    
    if (duplicates.rows.length > 0) {
      console.log('⚠️ Encontradas linhas duplicadas que impedirão a constraint:');
      duplicates.rows.forEach(dup => {
        console.log(`  - ${dup.table_name} | ${dup.data_hash} | ${dup.count} vezes`);
      });
      
      // Remover duplicatas mantendo apenas a mais recente
      console.log('\n🧹 Removendo duplicatas...');
      await pool.query(`
        DELETE FROM rides_data 
        WHERE id NOT IN (
          SELECT MAX(id) 
          FROM rides_data 
          GROUP BY table_name, data_hash
        );
      `);
      console.log('✅ Duplicatas removidas');
    } else {
      console.log('✅ Nenhuma duplicata encontrada');
    }
    
    // 4. Tentar criar a constraint se não existir
    const hasUniqueConstraint = constraints.rows.some(c => 
      c.constraint_name.includes('unique') || c.constraint_name.includes('rides')
    );
    
    if (!hasUniqueConstraint) {
      console.log('\n🔧 Criando constraint unique_ride_hash...');
      
      try {
        await pool.query(`
          ALTER TABLE rides_data 
          ADD CONSTRAINT unique_ride_hash 
          UNIQUE (table_name, data_hash);
        `);
        console.log('✅ Constraint unique_ride_hash criada com sucesso!');
      } catch (error) {
        console.error('❌ Erro ao criar constraint:', error);
        
        // Tentar versão alternativa sem data_hash se coluna não existir
        console.log('\n🔧 Tentando constraint alternativa...');
        try {
          await pool.query(`
            ALTER TABLE rides_data 
            ADD CONSTRAINT unique_table_ride 
            UNIQUE (table_name, ride_id);
          `);
          console.log('✅ Constraint alternativa criada!');
        } catch (error2) {
          console.error('❌ Erro na constraint alternativa:', error2);
        }
      }
    } else {
      console.log('✅ Constraint única já existe');
    }
    
    // 5. Verificar o resultado final
    console.log('\n📋 Constraints finais:');
    const finalConstraints = await pool.query(`
      SELECT constraint_name, constraint_type 
      FROM information_schema.table_constraints 
      WHERE table_name = 'rides_data';
    `);
    
    finalConstraints.rows.forEach(c => {
      console.log(`  - ${c.constraint_name}: ${c.constraint_type}`);
    });
    
    console.log('\n✅ CORREÇÃO CONCLUÍDA!');
    console.log('O monitoramento deve funcionar agora sem erros de constraint.');
    
  } catch (error) {
    console.error('❌ Erro durante correção:', error);
  } finally {
    await pool.end();
  }
}

fixConstraintFinal().catch(console.error);
