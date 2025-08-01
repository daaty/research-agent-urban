import { Pool, PoolClient, QueryResult } from 'pg';

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
}

export interface RideRecord {
  id?: number;
  table_name: string;
  data_hash: string;
  ride_data: any;
  scraped_at?: Date;
  session_info?: any;
  source?: string;
}

export interface ScrapingSession {
  id?: number;
  session_start?: Date;
  session_end?: Date;
  total_records: number;
  new_records: number;
  has_changes: boolean;
  execution_source: string;
  browser_session_id?: string;
}

export class DatabaseManager {
  private static instance: DatabaseManager;
  private pool: Pool | null = null;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Inicializa conexão com PostgreSQL
   */
  public async initialize(): Promise<void> {
    try {
      const config: DatabaseConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'rides_db',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        ssl: process.env.DB_SSL === 'true'
      };

      // Se DATABASE_URL está definida, usar ela (comum em produção)
      if (process.env.DATABASE_URL) {
        this.pool = new Pool({
          connectionString: process.env.DATABASE_URL,
          ssl: config.ssl ? { rejectUnauthorized: false } : false
        });
      } else {
        this.pool = new Pool(config);
      }

      // Testar conexão
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.isConnected = true;
      console.log('✅ Conexão com PostgreSQL estabelecida');

      // Criar tabelas se não existirem
      await this.createTablesIfNotExist();

    } catch (error: any) {
      this.isConnected = false;
      console.error('❌ Erro ao conectar com PostgreSQL:', error.message);
      throw error;
    }
  }

  /**
   * Cria as tabelas necessárias se não existirem
   */
  private async createTablesIfNotExist(): Promise<void> {
    if (!this.pool) throw new Error('Pool não inicializado');

    const createRidesDataTable = `
      CREATE TABLE IF NOT EXISTS rides_data (
        id SERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        data_hash VARCHAR(32) NOT NULL,
        ride_data JSONB NOT NULL,
        scraped_at TIMESTAMP DEFAULT NOW(),
        session_info JSONB,
        source VARCHAR(50) DEFAULT 'persistent-scraper'
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
      CREATE INDEX IF NOT EXISTS idx_sessions_start ON scraping_sessions(session_start);
    `;

    try {
      await this.pool.query(createRidesDataTable);
      await this.pool.query(createScrapingSessionsTable);
      await this.pool.query(createIndexes);
      console.log('✅ Tabelas e índices criados/verificados');
    } catch (error: any) {
      console.error('❌ Erro ao criar tabelas:', error.message);
      throw error;
    }
  }

  /**
   * Insere dados de rides no banco
   */
  public async insertRideData(records: RideRecord[]): Promise<void> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Banco de dados não conectado');
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const record of records) {
        const query = `
          INSERT INTO rides_data (table_name, data_hash, ride_data, session_info, source)
          VALUES ($1, $2, $3, $4, $5)
        `;
        
        await client.query(query, [
          record.table_name,
          record.data_hash,
          JSON.stringify(record.ride_data),
          JSON.stringify(record.session_info || {}),
          record.source || 'persistent-scraper'
        ]);
      }

      await client.query('COMMIT');
      console.log(`✅ ${records.length} registros inseridos no banco`);

    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('❌ Erro ao inserir dados:', error.message);
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Cria uma nova sessão de scraping
   */
  public async createScrapingSession(session: ScrapingSession): Promise<number> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Banco de dados não conectado');
    }

    const query = `
      INSERT INTO scraping_sessions (total_records, new_records, has_changes, execution_source, browser_session_id)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `;

    try {
      const result = await this.pool.query(query, [
        session.total_records,
        session.new_records,
        session.has_changes,
        session.execution_source,
        session.browser_session_id
      ]);

      const sessionId = result.rows[0].id;
      console.log(`✅ Sessão de scraping criada: ${sessionId}`);
      return sessionId;

    } catch (error: any) {
      console.error('❌ Erro ao criar sessão:', error.message);
      throw error;
    }
  }

  /**
   * Finaliza uma sessão de scraping
   */
  public async finishScrapingSession(sessionId: number): Promise<void> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Banco de dados não conectado');
    }

    const query = `
      UPDATE scraping_sessions 
      SET session_end = NOW() 
      WHERE id = $1
    `;

    try {
      await this.pool.query(query, [sessionId]);
      console.log(`✅ Sessão de scraping finalizada: ${sessionId}`);
    } catch (error: any) {
      console.error('❌ Erro ao finalizar sessão:', error.message);
      throw error;
    }
  }

  /**
   * Busca registros por período
   */
  public async getRidesByDateRange(startDate: Date, endDate: Date, tableName?: string): Promise<any[]> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Banco de dados não conectado');
    }

    let query = `
      SELECT * FROM rides_data 
      WHERE scraped_at BETWEEN $1 AND $2
    `;
    const params: any[] = [startDate, endDate];

    if (tableName) {
      query += ` AND table_name = $3`;
      params.push(tableName);
    }

    query += ` ORDER BY scraped_at DESC`;

    try {
      const result = await this.pool.query(query, params);
      return result.rows;
    } catch (error: any) {
      console.error('❌ Erro ao buscar dados:', error.message);
      throw error;
    }
  }

  /**
   * Obter estatísticas do banco
   */
  public async getDatabaseStats(): Promise<any> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Banco de dados não conectado');
    }

    try {
      const totalRecordsQuery = 'SELECT COUNT(*) as total FROM rides_data';
      const totalSessionsQuery = 'SELECT COUNT(*) as total FROM scraping_sessions';
      const lastScrapingQuery = 'SELECT MAX(scraped_at) as last_scraping FROM rides_data';
      const tableStatsQuery = `
        SELECT table_name, COUNT(*) as count 
        FROM rides_data 
        GROUP BY table_name 
        ORDER BY count DESC
      `;

      const [totalRecords, totalSessions, lastScraping, tableStats] = await Promise.all([
        this.pool.query(totalRecordsQuery),
        this.pool.query(totalSessionsQuery),
        this.pool.query(lastScrapingQuery),
        this.pool.query(tableStatsQuery)
      ]);

      return {
        totalRecords: parseInt(totalRecords.rows[0].total),
        totalSessions: parseInt(totalSessions.rows[0].total),
        lastScraping: lastScraping.rows[0].last_scraping,
        tableStats: tableStats.rows,
        isConnected: this.isConnected
      };

    } catch (error: any) {
      console.error('❌ Erro ao obter estatísticas:', error.message);
      throw error;
    }
  }

  /**
   * Executa uma query direta no banco (para uso interno dos serviços)
   */
  public async query(text: string, params?: any[]): Promise<any> {
    if (!this.pool || !this.isConnected) {
      throw new Error('Banco de dados não conectado');
    }
    
    try {
      return await this.pool.query(text, params);
    } catch (error: any) {
      console.error('❌ Erro na query:', error.message);
      throw error;
    }
  }

  /**
   * Verifica se está conectado
   */
  public isConnectedToDatabase(): boolean {
    return this.isConnected;
  }

  /**
   * Fecha a conexão
   */
  public async close(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.isConnected = false;
      console.log('✅ Conexão com PostgreSQL fechada');
    }
  }
}
