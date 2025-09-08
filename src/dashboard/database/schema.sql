-- 📊 SCHEMA DO DASHBOARD - TABELAS DE MONITORAMENTO
-- 
-- Este arquivo cria as tabelas necessárias para o dashboard de monitoramento
-- dos scrapers, incluindo status, métricas e histórico de alertas.

-- 🚨 Tabela de Status dos Scrapers
CREATE TABLE IF NOT EXISTS scraper_status (
    id SERIAL PRIMARY KEY,
    scraper_id VARCHAR(100) UNIQUE NOT NULL,
    scraper_name VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('ONLINE_ACTIVE', 'ONLINE_IDLE', 'OFFLINE', 'ERROR', 'STARTING')),
    last_heartbeat TIMESTAMP,
    last_activity TIMESTAMP,
    last_error TEXT,
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 📈 Tabela de Métricas dos Scrapers
CREATE TABLE IF NOT EXISTS scraper_metrics (
    id SERIAL PRIMARY KEY,
    scraper_id VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
    rides_scraped INTEGER DEFAULT 0,
    drivers_scraped INTEGER DEFAULT 0,
    errors_count INTEGER DEFAULT 0,
    response_time_ms INTEGER,
    success_rate DECIMAL(5,2) DEFAULT 100.00,
    memory_usage_mb INTEGER,
    cpu_usage_percent DECIMAL(5,2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- 🚨 Tabela de Alertas e Notificações
CREATE TABLE IF NOT EXISTS scraper_alerts (
    id SERIAL PRIMARY KEY,
    scraper_id VARCHAR(100) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    severity VARCHAR(10) NOT NULL CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'ACKNOWLEDGED', 'RESOLVED')),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP,
    acknowledged_at TIMESTAMP
);

-- 🔧 Tabela de Configurações do Dashboard
CREATE TABLE IF NOT EXISTS dashboard_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) UNIQUE NOT NULL,
    config_value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 📊 ÍNDICES PARA PERFORMANCE

-- Índices para scraper_status
CREATE INDEX IF NOT EXISTS idx_scraper_status_id ON scraper_status(scraper_id);
CREATE INDEX IF NOT EXISTS idx_scraper_status_updated ON scraper_status(updated_at DESC);

-- Índices para scraper_metrics
CREATE INDEX IF NOT EXISTS idx_scraper_metrics_timestamp ON scraper_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_metrics_id_time ON scraper_metrics(scraper_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_metrics_scraper_id ON scraper_metrics(scraper_id);

-- Índices para scraper_alerts
CREATE INDEX IF NOT EXISTS idx_scraper_alerts_scraper_id ON scraper_alerts(scraper_id);
CREATE INDEX IF NOT EXISTS idx_scraper_alerts_created ON scraper_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scraper_alerts_status ON scraper_alerts(status);
CREATE INDEX IF NOT EXISTS idx_scraper_alerts_severity ON scraper_alerts(severity);

-- Índices para dashboard_config
CREATE INDEX IF NOT EXISTS idx_dashboard_config_key ON dashboard_config(config_key);

-- 🔄 FUNÇÕES AUXILIARES

-- Função para atualizar timestamp automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers para auto-update de timestamps
DROP TRIGGER IF EXISTS update_scraper_status_updated_at ON scraper_status;
CREATE TRIGGER update_scraper_status_updated_at 
    BEFORE UPDATE ON scraper_status 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_dashboard_config_updated_at ON dashboard_config;
CREATE TRIGGER update_dashboard_config_updated_at 
    BEFORE UPDATE ON dashboard_config 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 📋 CONFIGURAÇÕES PADRÃO DO DASHBOARD
INSERT INTO dashboard_config (config_key, config_value, description) VALUES
('dashboard_settings', '{"refresh_interval": 30, "auto_refresh": true, "theme": "dark"}', 'Configurações gerais do dashboard'),
('alert_thresholds', '{"offline_timeout": 900, "error_rate_threshold": 50, "response_time_threshold": 5000}', 'Thresholds para alertas automáticos'),
('notification_settings', '{"enable_browser_notifications": true, "enable_sound": false, "cooldown_minutes": 5}', 'Configurações de notificações')
ON CONFLICT (config_key) DO NOTHING;

-- 🎯 VIEWS ÚTEIS PARA O DASHBOARD

-- View com status atual de todos os scrapers
CREATE OR REPLACE VIEW v_scrapers_current_status AS
SELECT 
    s.scraper_id,
    s.scraper_name,
    s.status,
    s.last_heartbeat,
    s.last_activity,
    s.last_error,
    s.performance_metrics,
    EXTRACT(EPOCH FROM (NOW() - s.last_heartbeat)) AS seconds_since_heartbeat,
    EXTRACT(EPOCH FROM (NOW() - s.last_activity)) AS seconds_since_activity,
    CASE 
        WHEN s.last_heartbeat IS NULL THEN 'UNKNOWN'
        WHEN EXTRACT(EPOCH FROM (NOW() - s.last_heartbeat)) > 900 THEN 'OFFLINE'  -- 15 min
        WHEN EXTRACT(EPOCH FROM (NOW() - s.last_activity)) < 1800 THEN 'ONLINE_ACTIVE'  -- 30 min
        ELSE 'ONLINE_IDLE'
    END AS computed_status
FROM scraper_status s;

-- View com métricas das últimas 24 horas
CREATE OR REPLACE VIEW v_scrapers_24h_metrics AS
SELECT 
    scraper_id,
    COUNT(*) as total_records,
    AVG(rides_scraped) as avg_rides,
    AVG(drivers_scraped) as avg_drivers,
    AVG(success_rate) as avg_success_rate,
    MAX(timestamp) as last_update,
    SUM(errors_count) as total_errors
FROM scraper_metrics 
WHERE timestamp >= NOW() - INTERVAL '24 hours'
GROUP BY scraper_id;

-- View com alertas ativos
CREATE OR REPLACE VIEW v_active_alerts AS
SELECT 
    scraper_id,
    alert_type,
    severity,
    title,
    message,
    created_at,
    EXTRACT(EPOCH FROM (NOW() - created_at)) AS age_seconds
FROM scraper_alerts 
WHERE status = 'ACTIVE'
ORDER BY created_at DESC;

-- ✅ COMENTÁRIOS FINAIS
COMMENT ON TABLE scraper_status IS 'Status atual e informações de cada scraper';
COMMENT ON TABLE scraper_metrics IS 'Métricas históricas de performance dos scrapers';
COMMENT ON TABLE scraper_alerts IS 'Histórico de alertas e notificações';
COMMENT ON TABLE dashboard_config IS 'Configurações do dashboard';

-- Verificar se as tabelas foram criadas
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'scraper_%' OR table_name = 'dashboard_config'
ORDER BY table_name;
