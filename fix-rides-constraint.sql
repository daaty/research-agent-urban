-- =====================================================
-- 🛠️ SCRIPT DE CORREÇÃO DA TABELA RIDES_DATA NA VPS
-- =====================================================
-- 
-- Este script corrige o problema da constraint UNIQUE ausente
-- que está causando falhas no sistema anti-duplicação.
--
-- EXECUTAR NA VPS:
-- docker exec -it postgres psql -U rides_user -d rides_db -f fix-rides-constraint.sql
--

\echo '🔧 INICIANDO CORREÇÃO DA CONSTRAINT RIDES_DATA...'
\echo ''

-- 1. Verificar estrutura atual
\echo '1️⃣ Verificando estrutura atual da tabela rides_data:'
\d rides_data

-- 2. Verificar constraints existentes
\echo ''
\echo '2️⃣ Verificando constraints atuais:'
SELECT 
  tc.constraint_name, 
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'rides_data'
GROUP BY tc.constraint_name, tc.constraint_type;

-- 3. Verificar se a constraint unique_ride_hash já existe
\echo ''
\echo '3️⃣ Verificando se constraint unique_ride_hash existe:'
SELECT 
  constraint_name 
FROM information_schema.table_constraints 
WHERE table_name = 'rides_data' 
  AND constraint_name = 'unique_ride_hash';

-- 4. Contar registros antes da correção
\echo ''
\echo '4️⃣ Total de registros antes da correção:'
SELECT COUNT(*) as total_records FROM rides_data;

-- 5. Verificar duplicatas existentes (se houver)
\echo ''
\echo '5️⃣ Verificando duplicatas existentes:'
SELECT 
  table_name, 
  data_hash, 
  COUNT(*) as count
FROM rides_data 
GROUP BY table_name, data_hash 
HAVING COUNT(*) > 1
ORDER BY count DESC
LIMIT 10;

-- 6. ADICIONAR CONSTRAINT UNIQUE (se não existir)
\echo ''
\echo '6️⃣ Adicionando constraint UNIQUE...'

-- Primeiro tentar adicionar a constraint
DO $$
BEGIN
    -- Tentar adicionar a constraint
    BEGIN
        ALTER TABLE rides_data 
        ADD CONSTRAINT unique_ride_hash 
        UNIQUE (table_name, data_hash);
        
        RAISE NOTICE '✅ Constraint unique_ride_hash adicionada com sucesso!';
    EXCEPTION 
        WHEN duplicate_table THEN
            RAISE NOTICE '⚠️ Constraint unique_ride_hash já existe!';
        WHEN unique_violation THEN
            RAISE NOTICE '❌ ERRO: Existem duplicatas na tabela!';
            RAISE NOTICE 'Execute primeiro: SELECT table_name, data_hash, COUNT(*) FROM rides_data GROUP BY table_name, data_hash HAVING COUNT(*) > 1;';
            RAISE EXCEPTION 'Duplicatas devem ser removidas antes de adicionar constraint UNIQUE';
        WHEN OTHERS THEN
            RAISE NOTICE '❌ Erro inesperado: %', SQLERRM;
            RAISE EXCEPTION 'Falha ao adicionar constraint: %', SQLERRM;
    END;
END $$;

-- 7. Verificar se a constraint foi criada
\echo ''
\echo '7️⃣ Verificando se constraint foi criada:'
SELECT 
  tc.constraint_name, 
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'rides_data'
  AND tc.constraint_name = 'unique_ride_hash'
GROUP BY tc.constraint_name, tc.constraint_type;

-- 8. Testar inserção duplicada (deve falhar)
\echo ''
\echo '8️⃣ Testando sistema anti-duplicação:'

-- Inserir registro de teste
INSERT INTO rides_data (table_name, data_hash, ride_data, session_info, source)
VALUES ('test_constraint', 'test_hash_123', '{"test": true}', '{"test": true}', 'constraint-test')
ON CONFLICT (table_name, data_hash) 
DO UPDATE SET 
  ride_data = EXCLUDED.ride_data,
  scraped_at = NOW(),
  source = EXCLUDED.source;

\echo '✅ Primeira inserção (deve funcionar)'

-- Tentar inserir o mesmo registro novamente (deve fazer UPDATE)
INSERT INTO rides_data (table_name, data_hash, ride_data, session_info, source)
VALUES ('test_constraint', 'test_hash_123', '{"test": true, "updated": true}', '{"test": true}', 'constraint-test-update')
ON CONFLICT (table_name, data_hash) 
DO UPDATE SET 
  ride_data = EXCLUDED.ride_data,
  scraped_at = NOW(),
  source = EXCLUDED.source;

\echo '✅ Segunda inserção (deve fazer UPDATE sem duplicar)'

-- Verificar resultado do teste
\echo ''
\echo '9️⃣ Resultado do teste anti-duplicação:'
SELECT * FROM rides_data 
WHERE table_name = 'test_constraint' 
  AND data_hash = 'test_hash_123';

-- 10. Limpar dados de teste
DELETE FROM rides_data 
WHERE table_name = 'test_constraint' 
  AND data_hash = 'test_hash_123';

\echo '🧹 Dados de teste removidos'

-- 11. Verificar estrutura final
\echo ''
\echo '🎉 ESTRUTURA FINAL DA TABELA:'
\d rides_data

\echo ''
\echo '✅ CORREÇÃO CONCLUÍDA!'
\echo '📊 A constraint unique_ride_hash deve estar presente'
\echo '🔄 Sistema UPSERT deve funcionar corretamente'
\echo '🚫 Duplicações devem ser impedidas'
\echo ''
