import { Pool } from 'pg';
import * as crypto from 'crypto';

export interface RideDataResult {
  savedCount: number;
  duplicatesCount: number;
  savedRides: any[];
  duplicates: string[];
}

export class RideDataService {
  private pool: Pool;
  
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'n8n_postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USERNAME || 'n8n_user',
      password: process.env.DB_PASSWORD || 'n8n_pw',
      database: process.env.DB_NAME || 'n8n_db',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  
  /**
   * Salva dados de corridas verificando duplicados por hash
   */
  async saveRidesData(ridesData: any[], tableName: string): Promise<RideDataResult> {
    const savedRides: any[] = [];
    const duplicates: string[] = [];
    
    for (const ride of ridesData) {
      const hash = this.createDataHash(ride);
      
      try {
        // Verificar se hash já existe
        const existsQuery = 'SELECT id FROM rides_data WHERE data_hash = $1';
        const existsResult = await this.pool.query(existsQuery, [hash]);
        
        if (existsResult.rows.length > 0) {
          // Hash já existe - é duplicata
          duplicates.push(hash);
          continue;
        }
        
        // Inserir novo registro
        const insertQuery = `
          INSERT INTO rides_data (table_name, data_hash, ride_data, scraped_at, source)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;
        
        const insertResult = await this.pool.query(insertQuery, [
          tableName,
          hash,
          JSON.stringify(ride),
          new Date(),
          'auto-scraper-v3.0'
        ]);
        
        if (insertResult.rows.length > 0) {
          savedRides.push(ride);
        }
        
      } catch (error: any) {
        console.error(`❌ Erro ao salvar ride:`, error.message);
        // Contar como duplicata para não parar o processo
        duplicates.push(hash);
      }
    }
    
    return {
      savedCount: savedRides.length,
      duplicatesCount: duplicates.length,
      savedRides,
      duplicates
    };
  }
  
  /**
   * Cria hash MD5 para os dados
   */
  private createDataHash(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('md5').update(dataString).digest('hex');
  }
  
  /**
   * Testa conexão com o banco
   */
  async testConnection(): Promise<boolean> {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ Conexão com base de dados OK');
      return true;
    } catch (error: any) {
      console.error('❌ Erro de conexão com base de dados:', error.message);
      return false;
    }
  }
  
  /**
   * Fecha conexões
   */
  async disconnect(): Promise<void> {
    await this.pool.end();
  }
}
