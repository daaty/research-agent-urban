-- ========================================
-- MIGRAÇÃO: Adicionar constraint UNIQUE para evitar duplicação
-- ========================================

-- 1. Primeiro, verificar se já existe a constraint
DO $$
BEGIN
    -- Tentar adicionar a constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_ride_hash'
    ) THEN
        -- Remover duplicatas existentes (manter apenas o mais recente de cada hash)
        DELETE FROM rides_data 
        WHERE id NOT IN (
            SELECT DISTINCT ON (table_name, data_hash) id
            FROM rides_data
            ORDER BY table_name, data_hash, scraped_at DESC
        );
        
        -- Adicionar a constraint UNIQUE
        ALTER TABLE rides_data 
        ADD CONSTRAINT unique_ride_hash UNIQUE (table_name, data_hash);
        
        RAISE NOTICE 'Constraint unique_ride_hash adicionada com sucesso!';
    ELSE
        RAISE NOTICE 'Constraint unique_ride_hash já existe.';
    END IF;
END
$$;

-- 2. Verificar se a constraint foi criada
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'unique_ride_hash';

-- 3. Mostrar estatísticas após limpeza
SELECT 
    table_name,
    COUNT(*) as total_records,
    COUNT(DISTINCT data_hash) as unique_hashes,
    MIN(scraped_at) as first_scrape,
    MAX(scraped_at) as last_scrape
FROM rides_data 
GROUP BY table_name
ORDER BY table_name;

-- 4. Verificar se há duplicatas restantes (deve retornar 0)
SELECT 
    table_name, 
    data_hash, 
    COUNT(*) as duplicates
FROM rides_data 
GROUP BY table_name, data_hash 
HAVING COUNT(*) > 1;
