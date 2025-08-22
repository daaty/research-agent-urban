-- Schema para tabela de dados pessoais dos motoristas
-- Utilizado pelo sistema híbrido para armazenar informações extraídas

CREATE TABLE IF NOT EXISTS driver_personal_details (
    id SERIAL PRIMARY KEY,
    driver_id VARCHAR(50) NOT NULL UNIQUE,
    
    -- Dados pessoais básicos
    full_name VARCHAR(255),
    cpf VARCHAR(20),
    rg VARCHAR(30),
    birthdate DATE,
    phone VARCHAR(20),
    email VARCHAR(255),
    
    -- Endereço
    address_street VARCHAR(255),
    address_number VARCHAR(20),
    address_complement VARCHAR(100),
    address_neighborhood VARCHAR(100),
    address_city VARCHAR(100),
    address_state VARCHAR(50),
    address_zipcode VARCHAR(15),
    
    -- Dados bancários
    bank_name VARCHAR(100),
    bank_agency VARCHAR(20),
    bank_account VARCHAR(30),
    bank_account_type VARCHAR(20), -- corrente, poupança
    pix_key VARCHAR(255),
    
    -- Status do motorista
    status VARCHAR(50), -- ativo, inativo, suspenso, bloqueado
    registration_date DATE,
    last_activity_date DATE,
    vehicle_plate VARCHAR(20),
    vehicle_model VARCHAR(100),
    vehicle_year INTEGER,
    
    -- Documentação
    cnh_number VARCHAR(30),
    cnh_category VARCHAR(10),
    cnh_expiry_date DATE,
    profile_photo_url VARCHAR(500),
    
    -- Dados de pagamento/crédito
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    total_earned DECIMAL(10,2) DEFAULT 0.00,
    total_rides INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2),
    
    -- Metadados do sistema
    extracted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    extraction_source VARCHAR(50) DEFAULT 'hybrid_system',
    data_quality_score INTEGER DEFAULT 0, -- 0-100, baseado na completude dos dados
    verification_status VARCHAR(30) DEFAULT 'pending', -- pending, verified, failed
    
    -- Campos JSON para dados extras
    additional_data JSONB,
    extraction_metadata JSONB,
    
    CONSTRAINT driver_personal_details_driver_id_key UNIQUE (driver_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_driver_personal_details_driver_id ON driver_personal_details (driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_personal_details_cpf ON driver_personal_details (cpf);
CREATE INDEX IF NOT EXISTS idx_driver_personal_details_status ON driver_personal_details (status);
CREATE INDEX IF NOT EXISTS idx_driver_personal_details_extracted_at ON driver_personal_details (extracted_at);
CREATE INDEX IF NOT EXISTS idx_driver_personal_details_verification_status ON driver_personal_details (verification_status);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_driver_personal_details_updated_at 
    BEFORE UPDATE ON driver_personal_details 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentários na tabela
COMMENT ON TABLE driver_personal_details IS 'Dados pessoais completos dos motoristas extraídos pelo sistema híbrido';
COMMENT ON COLUMN driver_personal_details.driver_id IS 'ID único do motorista no sistema';
COMMENT ON COLUMN driver_personal_details.data_quality_score IS 'Score de 0-100 baseado na completude dos dados extraídos';
COMMENT ON COLUMN driver_personal_details.verification_status IS 'Status de verificação dos dados: pending, verified, failed';
COMMENT ON COLUMN driver_personal_details.extraction_metadata IS 'Metadados sobre o processo de extração (tempo, versão, etc)';
COMMENT ON COLUMN driver_personal_details.additional_data IS 'Dados extras em formato JSON flexível';

-- View para dados básicos (sem informações sensíveis)
CREATE OR REPLACE VIEW driver_basic_info AS
SELECT 
    driver_id,
    full_name,
    phone,
    email,
    address_city,
    address_state,
    status,
    registration_date,
    vehicle_plate,
    vehicle_model,
    current_balance,
    total_rides,
    average_rating,
    extracted_at,
    verification_status
FROM driver_personal_details;

-- View para estatísticas da extração
CREATE OR REPLACE VIEW extraction_statistics AS
SELECT 
    DATE(extracted_at) as extraction_date,
    COUNT(*) as total_extracted,
    COUNT(CASE WHEN verification_status = 'verified' THEN 1 END) as verified_count,
    COUNT(CASE WHEN verification_status = 'failed' THEN 1 END) as failed_count,
    AVG(data_quality_score) as avg_quality_score,
    COUNT(CASE WHEN data_quality_score >= 80 THEN 1 END) as high_quality_count
FROM driver_personal_details
GROUP BY DATE(extracted_at)
ORDER BY extraction_date DESC;
