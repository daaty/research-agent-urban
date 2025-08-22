import { createHash } from 'crypto';
import { DatabaseManager, RideRecord, ScrapingSession, DriverPersonalDetailsRecord } from './databaseManager';
import { RidesTableData } from '../types/common';

export interface TransformedData {
  records: RideRecord[];
  session: ScrapingSession;
  totalRecords: number;
  newRecords: number;
}

export class DataTransformer {
  private static instance: DataTransformer;
  private databaseManager: DatabaseManager;

  private constructor() {
    this.databaseManager = DatabaseManager.getInstance();
  }

  public static getInstance(): DataTransformer {
    if (!DataTransformer.instance) {
      DataTransformer.instance = new DataTransformer();
    }
    return DataTransformer.instance;
  }

  /**
   * Transforma dados do scraping para formato do banco com IDs únicos
   */
  public transformScrapingData(
    scrapingData: RidesTableData[],
    sessionInfo: any,
    executionSource: string = 'persistent-scraper',
    hasChanges: boolean = true
  ): TransformedData {
    const records: RideRecord[] = [];
    let totalRecords = 0;
    let newRecords = 0;

    // Transformar cada tabela em registros do banco
    scrapingData.forEach(table => {
      // Verificar se a tabela tem nome e dados válidos
      if (!table.isEmpty && 
          table.rows.length > 0 && 
          table.tableName && 
          table.tableName.trim() !== '') {
        
        // Processar cada linha da tabela como um registro individual
        table.rows.forEach(row => {
          // Extrair ID único da corrida
          const rideId = this.extractRideId(row, table.headers);
          
          // Preparar dados estruturados para o banco
          const structuredData = {
            tableName: table.tableName,
            headers: table.headers,
            rideId: rideId,
            rowData: row,
            scrapedAt: new Date().toISOString()
          };

          // Usar combinação de table_name + ride_id como hash único
          const uniqueHash = createHash('md5')
            .update(`${table.tableName}|${rideId}`)
            .digest('hex');

          const record: RideRecord = {
            table_name: table.tableName,
            data_hash: uniqueHash, // Hash baseado em table + ride_id (sem timestamp)
            ride_data: structuredData,
            session_info: sessionInfo,
            source: executionSource
          };

          records.push(record);
          totalRecords++;
          
          if (hasChanges) {
            newRecords++;
          }
        });
      } else {
        // Log para debug de tabelas vazias ou inválidas
        console.log(`🔍 Ignorando tabela: ${table.tableName || 'sem nome'} (isEmpty: ${table.isEmpty}, rows: ${table.rows?.length || 0})`);
      }
    });

    // Criar objeto de sessão
    const session: ScrapingSession = {
      total_records: totalRecords,
      new_records: newRecords,
      has_changes: hasChanges,
      execution_source: executionSource,
      browser_session_id: this.generateSessionId()
    };

    return {
      records,
      session,
      totalRecords,
      newRecords
    };
  }

  /**
   * Transforma apenas dados novos (diferenças) para o banco
   */
  public transformDifferencesData(
    differences: any[],
    sessionInfo: any,
    executionSource: string = 'persistent-scraper'
  ): TransformedData {
    const records: RideRecord[] = [];
    let totalRecords = 0;
    let newRecords = 0;

    differences.forEach(diff => {
      // Verificar se há dados válidos e tableName não é nulo
      if (diff.newRecords && 
          diff.newRecords.length > 0 && 
          diff.tableName && 
          diff.tableName.trim() !== '') {
        // Criar estrutura apenas com dados novos
        const newDataStructure = {
          tableName: diff.tableName,
          newRecords: diff.newRecords,
          totalNewRecords: diff.totalNewRecords,
          updatedRecords: diff.updatedRecords || [],
          removedRecords: diff.removedRecords || [],
          scrapedAt: new Date().toISOString(),
          isDifferentialUpdate: true
        };

        const tableHash = this.generateDifferenceHash(diff);

        const record: RideRecord = {
          table_name: diff.tableName,
          data_hash: tableHash,
          ride_data: newDataStructure,
          session_info: sessionInfo,
          source: `${executionSource}-differential`
        };

        records.push(record);
        newRecords += diff.totalNewRecords;
        totalRecords += diff.totalNewRecords;
      } else {
        // Log para debug de diferenças inválidas
        console.log(`🔍 Ignorando diferença: ${diff.tableName || 'sem nome'} (newRecords: ${diff.newRecords?.length || 0})`);
      }
    });

    const session: ScrapingSession = {
      total_records: totalRecords,
      new_records: newRecords,
      has_changes: newRecords > 0,
      execution_source: `${executionSource}-differential`,
      browser_session_id: this.generateSessionId()
    };

    return {
      records,
      session,
      totalRecords,
      newRecords
    };
  }

  /**
   * Salva dados transformados no banco
   */
  public async saveToDatabase(transformedData: TransformedData): Promise<number | null> {
    try {
      // Verificar se o banco está disponível
      if (!this.databaseManager.isConnectedToDatabase()) {
        console.log('⚠️ Banco não conectado - dados não salvos no PostgreSQL');
        return null;
      }

      // Criar sessão de scraping
      const sessionId = await this.databaseManager.createScrapingSession(transformedData.session);

      // Inserir registros se houver dados
      if (transformedData.records.length > 0) {
        await this.databaseManager.insertRideData(transformedData.records);
      }

      // Finalizar sessão
      await this.databaseManager.finishScrapingSession(sessionId);

      console.log(`✅ Dados salvos no PostgreSQL - Sessão: ${sessionId}`);
      console.log(`   📊 Total de registros: ${transformedData.totalRecords}`);
      console.log(`   📈 Novos registros: ${transformedData.newRecords}`);

      return sessionId;

    } catch (error: any) {
      console.error('❌ Erro ao salvar no banco:', error.message);
      return null;
    }
  }

  /**
   * Processa dados completos do scraping (primeira execução ou força completa)
   */
  public async processFullScrapingData(
    scrapingData: RidesTableData[],
    sessionInfo: any,
    executionSource: string = 'initial-execution'
  ): Promise<number | null> {
    console.log('💾 Processando dados completos para PostgreSQL...');
    
    const transformedData = this.transformScrapingData(scrapingData, sessionInfo, executionSource, true);
    return await this.saveToDatabase(transformedData);
  }

  /**
   * Processa apenas diferenças (execuções subsequentes)
   */
  public async processDifferentialData(
    differences: any[],
    sessionInfo: any,
    executionSource: string = 'scheduler'
  ): Promise<number | null> {
    if (!differences || differences.length === 0) {
      console.log('ℹ️ Nenhuma diferença para salvar no PostgreSQL');
      return null;
    }

    console.log('💾 Processando diferenças para PostgreSQL...');
    
    const transformedData = this.transformDifferencesData(differences, sessionInfo, executionSource);
    return await this.saveToDatabase(transformedData);
  }

  /**
   * Gera hash único para uma tabela (SEM timestamp para evitar duplicação)
   */
  private generateTableHash(table: RidesTableData): string {
    const hashData = {
      name: table.tableName,
      headers: table.headers,
      rowCount: table.rows.length,
      firstRows: table.rows.slice(0, 3).sort(), // Primeiras 3 linhas ordenadas para hash consistente
      dataContent: table.rows.sort() // Ordenar dados para hash consistente
    };
    
    return createHash('md5')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Gera hash único para diferenças (SEM timestamp para evitar duplicação)
   */
  private generateDifferenceHash(difference: any): string {
    const hashData = {
      tableName: difference.tableName,
      newRecordsCount: difference.totalNewRecords,
      firstNewRecords: difference.newRecords?.slice(0, 3).sort() || [], // Ordenar para consistência
      dataContent: difference.newRecords?.sort() || [] // Dados ordenados
    };
    
    return createHash('md5')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Gera ID único de sessão
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extrai ID único de uma corrida baseado nos dados disponíveis
   */
  private extractRideId(rideRow: string[], headers: string[]): string {
    // Tentar encontrar campos que podem ser IDs únicos
    const possibleIdFields = ['id', 'ride_id', 'booking_id', 'trip_id', 'request_id'];
    const possibleDateFields = ['date', 'data', 'created_at', 'timestamp'];
    const possibleTimeFields = ['time', 'hora', 'hour'];
    
    let idComponents: string[] = [];
    
    // 1. Procurar por campos de ID explícitos
    headers.forEach((header, index) => {
      const headerLower = header.toLowerCase();
      if (possibleIdFields.some(field => headerLower.includes(field)) && rideRow[index]) {
        idComponents.push(`id:${rideRow[index]}`);
      }
    });
    
    // 2. Se não encontrou ID explícito, usar combinação de campos únicos
    if (idComponents.length === 0) {
      headers.forEach((header, index) => {
        const headerLower = header.toLowerCase();
        const value = rideRow[index];
        
        if (value) {
          // Adicionar campos de data/hora
          if (possibleDateFields.some(field => headerLower.includes(field))) {
            idComponents.push(`date:${value}`);
          }
          if (possibleTimeFields.some(field => headerLower.includes(field))) {
            idComponents.push(`time:${value}`);
          }
          // Adicionar outros campos importantes (motorista, passageiro, rota)
          if (headerLower.includes('driver') || headerLower.includes('motorista')) {
            idComponents.push(`driver:${value}`);
          }
          if (headerLower.includes('passenger') || headerLower.includes('passageiro')) {
            idComponents.push(`passenger:${value}`);
          }
          if (headerLower.includes('route') || headerLower.includes('rota') || headerLower.includes('origin') || headerLower.includes('destination')) {
            idComponents.push(`route:${value}`);
          }
        }
      });
    }
    
    // 3. Se ainda não temos componentes suficientes, usar toda a linha
    if (idComponents.length < 2) {
      idComponents = rideRow.filter(cell => cell && cell.trim() !== '').slice(0, 4);
    }
    
    // 4. Gerar hash MD5 dos componentes
    const combinedKey = idComponents.join('|');
    return createHash('md5').update(combinedKey).digest('hex').substring(0, 16);
  }

  /**
   * Obter estatísticas do banco
   */
  public async getDatabaseStats(): Promise<any> {
    try {
      if (!this.databaseManager.isConnectedToDatabase()) {
        return {
          error: 'Banco não conectado',
          isConnected: false
        };
      }

      return await this.databaseManager.getDatabaseStats();
    } catch (error: any) {
      console.error('❌ Erro ao obter estatísticas:', error.message);
      return {
        error: error.message,
        isConnected: false
      };
    }
  }

  /**
   * Salva dados pessoais detalhados de um motorista no banco
   */
  public async saveDriverPersonalDetails(extractedData: any): Promise<boolean> {
    try {
      // Verificar se o banco está disponível
      if (!this.databaseManager.isConnectedToDatabase()) {
        console.log('⚠️ Banco não conectado - dados pessoais não salvos no PostgreSQL');
        return false;
      }

      // Gerar hash único baseado no conteúdo dos dados
      const dataString = JSON.stringify({
        driverId: extractedData.driverId,
        personalData: extractedData.data.personal_data,
        ridesHistory: extractedData.data.rides_history,
        walletTransactions: extractedData.data.wallet_transactions,
        subscriptionHistory: extractedData.data.subscription_history
      });
      
      const dataHash = createHash('md5').update(dataString).digest('hex');

      // Verificar se os dados já existem (evitar duplicação)
      const existingData = await this.databaseManager.getDriverPersonalDetails(extractedData.driverId);
      if (existingData && existingData.data_hash === dataHash) {
        console.log(`ℹ️ Dados pessoais do motorista ${extractedData.driverId} já estão atualizados (hash: ${dataHash})`);
        return true;
      }

      // Preparar registro para inserção
      const record = {
        driver_id: extractedData.driverId,
        city: extractedData.city,
        personal_data: extractedData.data.personal_data,
        rides_history: extractedData.data.rides_history || [],
        wallet_transactions: extractedData.data.wallet_transactions || [],
        subscription_history: extractedData.data.subscription_history || [],
        additional_info: extractedData.data.additional_info || {},
        data_hash: dataHash,
        extraction_source: 'hybrid_scraper'
      };

      // Salvar no banco
      await this.databaseManager.insertDriverPersonalDetails(record);
      
      console.log(`💾 Dados pessoais do motorista ${extractedData.driverId} salvos no PostgreSQL`);
      console.log(`   📊 Corridas no histórico: ${extractedData.data.rides_history?.length || 0}`);
      console.log(`   💰 Transações da carteira: ${extractedData.data.wallet_transactions?.length || 0}`);
      console.log(`   📋 Histórico de assinaturas: ${extractedData.data.subscription_history?.length || 0}`);
      
      return true;

    } catch (error: any) {
      console.error(`❌ Erro ao salvar dados pessoais do motorista ${extractedData.driverId}:`, error.message);
      return false;
    }
  }
}
