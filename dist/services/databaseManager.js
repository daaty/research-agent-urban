"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseManager = void 0;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
// Carregar variáveis de ambiente
dotenv_1.default.config();
class DatabaseManager {
    constructor() {
        this.pool = null;
        this.isConnected = false;
    }
    static getInstance() {
        if (!DatabaseManager.instance) {
            DatabaseManager.instance = new DatabaseManager();
        }
        return DatabaseManager.instance;
    }
    /**
     * Inicializa conexão com PostgreSQL
     */
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const config = {
                    host: process.env.DB_HOST || 'localhost',
                    port: parseInt(process.env.DB_PORT || '5432'),
                    database: process.env.DB_NAME || 'rides_db',
                    user: process.env.DB_USER || 'postgres',
                    password: process.env.DB_PASSWORD || '',
                    ssl: process.env.DB_SSL === 'true'
                };
                // Se DATABASE_URL está definida, usar ela (comum em produção)
                if (process.env.DATABASE_URL) {
                    this.pool = new pg_1.Pool({
                        connectionString: process.env.DATABASE_URL,
                        ssl: config.ssl ? { rejectUnauthorized: false } : false
                    });
                }
                else {
                    this.pool = new pg_1.Pool(config);
                }
                // Testar conexão
                const client = yield this.pool.connect();
                yield client.query('SELECT NOW()');
                client.release();
                this.isConnected = true;
                console.log('✅ Conexão com PostgreSQL estabelecida');
                // Criar tabelas se não existirem
                yield this.createTablesIfNotExist();
            }
            catch (error) {
                this.isConnected = false;
                console.error('❌ Erro ao conectar com PostgreSQL:', error.message);
                throw error;
            }
        });
    }
    /**
     * Cria as tabelas necessárias se não existirem
     */
    createTablesIfNotExist() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool)
                throw new Error('Pool não inicializado');
            const createRidesDataTable = `
      CREATE TABLE IF NOT EXISTS rides_data (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        data_hash VARCHAR(32) NOT NULL,
        ride_data JSONB NOT NULL,
        scraped_at TIMESTAMP DEFAULT NOW(),
        session_info JSONB,
        source VARCHAR(50) DEFAULT 'persistent-scraper',
        CONSTRAINT unique_ride_hash UNIQUE (table_name, data_hash)
      );
    `;
            // Recriar tabela de drivers com campos corrigidos
            const dropDriversTable = `DROP TABLE IF EXISTS drivers_data CASCADE;`;
            const createDriversDataTable = `
      CREATE TABLE IF NOT EXISTS drivers_data (
        id SERIAL PRIMARY KEY,
        driver_id VARCHAR(255) NOT NULL,
        name VARCHAR(500),
        email VARCHAR(255),
        mobile VARCHAR(100),
        data_type VARCHAR(50) NOT NULL, -- 'active', 'deactive', 'enrollment', 'leaderboard', 'performance'
        page_source VARCHAR(255) NOT NULL, -- nome da página origem
        additional_data JSONB, -- JSON para campos específicos de cada página
        data_hash VARCHAR(32) NOT NULL,
        scraped_at TIMESTAMP DEFAULT NOW(),
        session_info JSONB,
        source VARCHAR(50) DEFAULT 'drivers-persistent-scraper',
        unique_id VARCHAR(255) NOT NULL,
        CONSTRAINT unique_driver_hash UNIQUE (data_type, driver_id, data_hash)
      );
    `;
            const createScrapingSessionsTable = `
      CREATE TABLE IF NOT EXISTS scraping_sessions (
        id SERIAL PRIMARY KEY,
        session_start TIMESTAMP DEFAULT NOW(),
        session_end TIMESTAMP,
        total_records INTEGER,
        new_records INTEGER,
        has_changes BOOLEAN,
        execution_source VARCHAR(50),
        browser_session_id VARCHAR(100)
      );
    `;
            const createIndexes = `
      CREATE INDEX IF NOT EXISTS idx_rides_data_scraped_at ON rides_data(scraped_at);
      CREATE INDEX IF NOT EXISTS idx_rides_data_table_name ON rides_data(table_name);
      CREATE INDEX IF NOT EXISTS idx_rides_data_hash ON rides_data(data_hash);
      CREATE INDEX IF NOT EXISTS idx_drivers_data_scraped_at ON drivers_data(scraped_at);
      CREATE INDEX IF NOT EXISTS idx_drivers_data_page_source ON drivers_data(page_source);
      CREATE INDEX IF NOT EXISTS idx_drivers_data_data_type ON drivers_data(data_type);
      CREATE INDEX IF NOT EXISTS idx_drivers_data_driver_id ON drivers_data(driver_id);
      CREATE INDEX IF NOT EXISTS idx_drivers_data_hash ON drivers_data(data_hash);
      CREATE INDEX IF NOT EXISTS idx_sessions_start ON scraping_sessions(session_start);
    `;
            try {
                yield this.pool.query(createRidesDataTable);
                // Recriar tabela de drivers para garantir campos corretos
                yield this.pool.query(dropDriversTable);
                yield this.pool.query(createDriversDataTable);
                yield this.pool.query(createScrapingSessionsTable);
                yield this.pool.query(createIndexes);
                console.log('✅ Tabelas de rides, drivers (recriada) e índices criados/verificados');
            }
            catch (error) {
                console.error('❌ Erro ao criar tabelas:', error.message);
                throw error;
            }
        });
    }
    /**
     * Insere dados de rides no banco usando UPSERT (INSERT ... ON CONFLICT)
     * Evita duplicação baseada na constraint unique_ride_hash
     */
    insertRideData(records) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool || !this.isConnected) {
                throw new Error('Banco de dados não conectado');
            }
            const client = yield this.pool.connect();
            try {
                yield client.query('BEGIN');
                let insertedCount = 0;
                let updatedCount = 0;
                for (const record of records) {
                    const query = `
          INSERT INTO rides_data (table_name, data_hash, ride_data, session_info, source)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT (table_name, data_hash) 
          DO UPDATE SET 
            ride_data = EXCLUDED.ride_data,
            scraped_at = NOW(),
            session_info = EXCLUDED.session_info,
            source = EXCLUDED.source
          RETURNING (xmax = 0) AS inserted
        `;
                    const result = yield client.query(query, [
                        record.table_name,
                        record.data_hash,
                        JSON.stringify(record.ride_data),
                        JSON.stringify(record.session_info || {}),
                        record.source || 'persistent-scraper'
                    ]);
                    // xmax = 0 significa INSERT, xmax > 0 significa UPDATE
                    if (result.rows[0].inserted) {
                        insertedCount++;
                    }
                    else {
                        updatedCount++;
                    }
                }
                yield client.query('COMMIT');
                console.log(`✅ Dados processados: ${insertedCount} inseridos, ${updatedCount} atualizados`);
            }
            catch (error) {
                yield client.query('ROLLBACK');
                console.error('❌ Erro ao inserir dados:', error.message);
                throw error;
            }
            finally {
                client.release();
            }
        });
    }
    /**
     * Insere dados de drivers no banco usando UPSERT (INSERT ... ON CONFLICT)
     * Evita duplicação baseada na constraint unique_driver_hash
     */
    insertDriverData(records) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool || !this.isConnected) {
                throw new Error('Banco de dados não conectado');
            }
            const client = yield this.pool.connect();
            try {
                yield client.query('BEGIN');
                let insertedCount = 0;
                let updatedCount = 0;
                for (const record of records) {
                    const query = `
          INSERT INTO drivers_data (
            driver_id, name, email, mobile, data_type, page_source, 
            additional_data, data_hash, session_info, source, unique_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (data_type, driver_id, data_hash) 
          DO UPDATE SET 
            name = EXCLUDED.name,
            email = EXCLUDED.email,
            mobile = EXCLUDED.mobile,
            additional_data = EXCLUDED.additional_data,
            scraped_at = NOW(),
            session_info = EXCLUDED.session_info,
            source = EXCLUDED.source
          RETURNING (xmax = 0) AS inserted
        `;
                    const result = yield client.query(query, [
                        record.driver_id,
                        record.name,
                        record.email || null,
                        record.mobile || null,
                        record.data_type,
                        record.page_source,
                        JSON.stringify(record.additional_data || {}),
                        record.data_hash,
                        JSON.stringify(record.session_info || {}),
                        record.source || 'drivers-persistent-scraper',
                        record.unique_id
                    ]);
                    // xmax = 0 significa INSERT, xmax > 0 significa UPDATE
                    if (result.rows[0].inserted) {
                        insertedCount++;
                    }
                    else {
                        updatedCount++;
                    }
                }
                yield client.query('COMMIT');
                console.log(`✅ Dados de drivers processados: ${insertedCount} inseridos, ${updatedCount} atualizados`);
            }
            catch (error) {
                yield client.query('ROLLBACK');
                console.error('❌ Erro ao inserir dados de drivers:', error.message);
                throw error;
            }
            finally {
                client.release();
            }
        });
    }
    /**
     * Salva dados específicos de Driver Performance de forma estruturada
     */
    saveDriverPerformanceData(performanceData) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool || !this.isConnected) {
                throw new Error('Banco de dados não conectado');
            }
            if (!performanceData || performanceData.length === 0) {
                console.log('⚠️ Nenhum dado de Driver Performance para salvar');
                return;
            }
            console.log(`💾 Salvando ${performanceData.length} registros de Driver Performance...`);
            const client = yield this.pool.connect();
            try {
                yield client.query('BEGIN');
                let insertedCount = 0;
                let updatedCount = 0;
                for (const data of performanceData) {
                    // Criar hash único baseado nos dados principais
                    const hashData = `${data.driver_id}-${data.driver_name}-${data.phone_number}-${data.request_sent}-${data.success_rides}`;
                    const dataHash = require('crypto').createHash('md5').update(hashData).digest('hex');
                    // Estruturar dados para salvar
                    const driverRecord = {
                        driver_id: data.driver_id,
                        name: data.driver_name,
                        email: null, // Driver Performance não tem email
                        mobile: data.phone_number,
                        data_type: 'performance',
                        page_source: 'Driver Performance',
                        additional_data: {
                            request_sent: data.request_sent,
                            requests_received: data.requests_received,
                            user_cancelled_rides: data.user_cancelled_rides,
                            user_cancelled_ride_cash: data.user_cancelled_ride_cash,
                            user_cancelled_ride_wallet: data.user_cancelled_ride_wallet,
                            driver_cancelled_rides: data.driver_cancelled_rides,
                            driver_cancelled_ride_cash: data.driver_cancelled_ride_cash,
                            driver_cancelled_ride_wallet: data.driver_cancelled_ride_wallet,
                            rejected_rides: data.rejected_rides,
                            success_rides: data.success_rides,
                            missed_rides: data.missed_rides,
                            active_days: data.active_days,
                            online_hours: data.online_hours,
                            d2c_referral: data.d2c_referral,
                            d2d_referral: data.d2d_referral,
                            start_end_cheating_rides: data.start_end_cheating_rides,
                            manual_start_end_cheating_rides: data.manual_start_end_cheating_rides,
                            vehicle: data.vehicle,
                            // Métricas calculadas
                            success_rate: data.requests_received > 0 ? (data.success_rides / data.requests_received * 100).toFixed(2) : 0,
                            cancellation_rate: data.requests_received > 0 ? ((data.user_cancelled_rides + data.driver_cancelled_rides) / data.requests_received * 100).toFixed(2) : 0,
                            rejection_rate: data.requests_received > 0 ? (data.rejected_rides / data.requests_received * 100).toFixed(2) : 0
                        },
                        data_hash: dataHash,
                        session_info: {
                            extracted_at: new Date().toISOString(),
                            source_page: 'high-cancellations',
                            data_type: 'driver-performance'
                        },
                        source: 'drivers-performance-scraper',
                        unique_id: `performance-${data.driver_id}-${Date.now()}`
                    };
                    const query = `
          INSERT INTO drivers_data (
            driver_id, name, email, mobile, data_type, page_source, 
            additional_data, data_hash, session_info, source, unique_id
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT (data_type, driver_id, data_hash) 
          DO UPDATE SET 
            name = EXCLUDED.name,
            mobile = EXCLUDED.mobile,
            additional_data = EXCLUDED.additional_data,
            scraped_at = NOW(),
            session_info = EXCLUDED.session_info,
            source = EXCLUDED.source
          RETURNING (xmax = 0) AS inserted
        `;
                    const result = yield client.query(query, [
                        driverRecord.driver_id,
                        driverRecord.name,
                        driverRecord.email,
                        driverRecord.mobile,
                        driverRecord.data_type,
                        driverRecord.page_source,
                        JSON.stringify(driverRecord.additional_data),
                        driverRecord.data_hash,
                        JSON.stringify(driverRecord.session_info),
                        driverRecord.source,
                        driverRecord.unique_id
                    ]);
                    if (result.rows[0].inserted) {
                        insertedCount++;
                    }
                    else {
                        updatedCount++;
                    }
                }
                yield client.query('COMMIT');
                console.log(`✅ Driver Performance processado: ${insertedCount} inseridos, ${updatedCount} atualizados`);
            }
            catch (error) {
                yield client.query('ROLLBACK');
                console.error('❌ Erro ao inserir dados de Driver Performance:', error.message);
                throw error;
            }
            finally {
                client.release();
            }
        });
    }
    /**
     * Cria uma nova sessão de scraping
     */
    createScrapingSession(session) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool || !this.isConnected) {
                throw new Error('Banco de dados não conectado');
            }
            const query = `
      INSERT INTO scraping_sessions (total_records, new_records, has_changes, execution_source, browser_session_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;
            try {
                const result = yield this.pool.query(query, [
                    session.total_records,
                    session.new_records,
                    session.has_changes,
                    session.execution_source,
                    session.browser_session_id
                ]);
                const sessionId = result.rows[0].id;
                console.log(`✅ Sessão de scraping criada: ${sessionId}`);
                return sessionId;
            }
            catch (error) {
                console.error('❌ Erro ao criar sessão:', error.message);
                throw error;
            }
        });
    }
    /**
     * Finaliza uma sessão de scraping
     */
    finishScrapingSession(sessionId) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool || !this.isConnected) {
                throw new Error('Banco de dados não conectado');
            }
            const query = `
      UPDATE scraping_sessions 
      SET session_end = NOW() 
      WHERE id = $1
    `;
            try {
                yield this.pool.query(query, [sessionId]);
                console.log(`✅ Sessão de scraping finalizada: ${sessionId}`);
            }
            catch (error) {
                console.error('❌ Erro ao finalizar sessão:', error.message);
                throw error;
            }
        });
    }
    /**
     * Busca registros por período
     */
    getRidesByDateRange(startDate, endDate, tableName) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool || !this.isConnected) {
                throw new Error('Banco de dados não conectado');
            }
            let query = `
      SELECT * FROM rides_data 
      WHERE scraped_at BETWEEN $1 AND $2
    `;
            const params = [startDate, endDate];
            if (tableName) {
                query += ` AND table_name = $3`;
                params.push(tableName);
            }
            query += ` ORDER BY scraped_at DESC`;
            try {
                const result = yield this.pool.query(query, params);
                return result.rows;
            }
            catch (error) {
                console.error('❌ Erro ao buscar dados:', error.message);
                throw error;
            }
        });
    }
    /**
     * Obter estatísticas do banco
     */
    getDatabaseStats() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.pool || !this.isConnected) {
                throw new Error('Banco de dados não conectado');
            }
            try {
                const totalRecordsQuery = 'SELECT COUNT(*) as total FROM rides_data';
                const totalDriversQuery = 'SELECT COUNT(*) as total FROM drivers_data';
                const totalSessionsQuery = 'SELECT COUNT(*) as total FROM scraping_sessions';
                const lastScrapingQuery = 'SELECT MAX(scraped_at) as last_scraping FROM rides_data';
                const lastDriversScrapingQuery = 'SELECT MAX(scraped_at) as last_scraping FROM drivers_data';
                const tableStatsQuery = `
        SELECT table_name, COUNT(*) as count 
        FROM rides_data 
        GROUP BY table_name 
        ORDER BY count DESC
      `;
                const driversStatsQuery = `
        SELECT data_type, COUNT(*) as count 
        FROM drivers_data 
        GROUP BY data_type 
        ORDER BY count DESC
      `;
                const [totalRecords, totalDrivers, totalSessions, lastScraping, lastDriversScraping, tableStats, driversStats] = yield Promise.all([
                    this.pool.query(totalRecordsQuery),
                    this.pool.query(totalDriversQuery),
                    this.pool.query(totalSessionsQuery),
                    this.pool.query(lastScrapingQuery),
                    this.pool.query(lastDriversScrapingQuery),
                    this.pool.query(tableStatsQuery),
                    this.pool.query(driversStatsQuery)
                ]);
                return {
                    totalRecords: parseInt(totalRecords.rows[0].total),
                    totalDrivers: parseInt(totalDrivers.rows[0].total),
                    totalSessions: parseInt(totalSessions.rows[0].total),
                    lastScraping: lastScraping.rows[0].last_scraping,
                    lastDriversScraping: lastDriversScraping.rows[0].last_scraping,
                    tableStats: tableStats.rows,
                    driversStats: driversStats.rows,
                    isConnected: this.isConnected
                };
            }
            catch (error) {
                console.error('❌ Erro ao obter estatísticas:', error.message);
                throw error;
            }
        });
    }
    /**
     * Verifica se está conectado
     */
    isConnectedToDatabase() {
        return this.isConnected;
    }
    /**
     * Fecha a conexão
     */
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.pool) {
                yield this.pool.end();
                this.isConnected = false;
                console.log('✅ Conexão com PostgreSQL fechada');
            }
        });
    }
}
exports.DatabaseManager = DatabaseManager;
