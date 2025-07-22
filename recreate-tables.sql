-- ========================================
-- RECRIAR TABELAS RIDES_DATA APÓS DROP ACIDENTAL
-- ========================================

-- Tabela principal de dados de corridas
CREATE TABLE IF NOT EXISTS rides_data (
    id SERIAL PRIMARY KEY,
    table_name VARCHAR(255) NOT NULL,
    data_hash VARCHAR(255) NOT NULL,
    ride_data JSONB NOT NULL,
    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_info TEXT,
    source VARCHAR(100) DEFAULT 'unknown'
);

-- Tabela de sessões de scraping
CREATE TABLE IF NOT EXISTS scraping_sessions (
    id SERIAL PRIMARY KEY,
    total_records INTEGER DEFAULT 0,
    new_records INTEGER DEFAULT 0,
    has_changes BOOLEAN DEFAULT false,
    execution_source VARCHAR(100),
    browser_session_id VARCHAR(255),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'active'
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rides_data_table_name ON rides_data(table_name);
CREATE INDEX IF NOT EXISTS idx_rides_data_scraped_at ON rides_data(scraped_at);
CREATE INDEX IF NOT EXISTS idx_rides_data_data_hash ON rides_data(data_hash);
CREATE INDEX IF NOT EXISTS idx_scraping_sessions_started_at ON scraping_sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_scraping_sessions_source ON scraping_sessions(execution_source);

-- Verificar se as tabelas foram criadas
\dt rides_data;
\dt scraping_sessions;

-- Mostrar estrutura das tabelas
\d rides_data;
\d scraping_sessions;
