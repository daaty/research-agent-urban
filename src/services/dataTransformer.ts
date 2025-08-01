import { createHash } from 'crypto';
import { DatabaseManager, RideRecord, ScrapingSession } from './databaseManager';
import { RidesTableData } from '../types/common';
import { DuplicatePreventionService } from './duplicatePreventionService';

export interface TransformedData {
  records: RideRecord[];
  session: ScrapingSession;
  totalRecords: number;
  newRecords: number;
}

export class DataTransformer {
  private static instance: DataTransformer;
  private databaseManager: DatabaseManager;
  private duplicatePreventionService: DuplicatePreventionService;

  private constructor() {
    this.databaseManager = DatabaseManager.getInstance();
    this.duplicatePreventionService = DuplicatePreventionService.getInstance();
  }

  public static getInstance(): DataTransformer {
    if (!DataTransformer.instance) {
      DataTransformer.instance = new DataTransformer();
    }
    return DataTransformer.instance;
  }

  /**
   * Transforma dados do scraping para formato do banco COM prevenção de duplicados
   */
  public async transformScrapingDataWithDeduplication(
    scrapingData: RidesTableData[],
    sessionInfo: any,
    executionSource: string = 'persistent-scraper'
  ): Promise<TransformedData> {
    console.log('🔄 Transformando dados com prevenção de duplicados...');
    
    const records: RideRecord[] = [];
    let totalRecords = 0;
    let newRecords = 0;
    let totalDuplicates = 0;

    // Processar cada tabela com deduplicação
    for (const table of scrapingData) {
      if (!table.isEmpty && 
          table.rows.length > 0 && 
          table.tableName && 
          table.tableName.trim() !== '') {

        console.log(`📊 Processando tabela: ${table.tableName} (${table.rows.length} registros)`);

        // ⭐ NOVA FUNCIONALIDADE: Filtrar duplicados usando Engagement ID
        const deduplicationResult = await this.duplicatePreventionService.filterDuplicates({
          name: table.tableName,
          headers: table.headers,
          rows: table.rows,
          isEmpty: table.isEmpty,
          url: '' // URL não disponível na interface RidesTableData
        });

        const filteredTable = deduplicationResult.filteredTable;
        const stats = deduplicationResult.deduplicationStats;

        // Atualizar estatísticas
        totalRecords += stats.totalRows;
        newRecords += stats.newRows.length;
        totalDuplicates += stats.duplicateRows.length;

        console.log(`   🆕 Novos registros: ${stats.newRows.length}`);
        console.log(`   🔄 Duplicados ignorados: ${stats.duplicateRows.length}`);

        // Só incluir no banco se houver dados novos
        if (filteredTable.rows.length > 0) {
          // Gerar hash sem timestamp para evitar duplicação
          const tableHash = this.generateContentOnlyHash(filteredTable);
          
          // Preparar dados estruturados para o banco
          const structuredData = {
            tableName: filteredTable.name,
            headers: filteredTable.headers,
            rows: filteredTable.rows,
            isEmpty: filteredTable.isEmpty,
            scrapedAt: new Date().toISOString(),
            totalRows: filteredTable.rows.length,
            originalRowCount: stats.totalRows,
            deduplicationApplied: true,
            duplicatesIgnored: stats.duplicateRows.length
          };

          const record: RideRecord = {
            table_name: filteredTable.name,
            data_hash: tableHash,
            ride_data: structuredData,
            session_info: sessionInfo,
            source: executionSource
          };

          records.push(record);
        } else {
          console.log(`   ⏭️ Nenhum dado novo para ${table.tableName} - todos eram duplicados`);
        }
      } else {
        console.log(`🔍 Ignorando tabela: ${table.tableName || 'sem nome'} (isEmpty: ${table.isEmpty}, rows: ${table.rows?.length || 0})`);
      }
    }

    // Criar objeto de sessão
    const session: ScrapingSession = {
      total_records: totalRecords,
      new_records: newRecords,
      has_changes: newRecords > 0,
      execution_source: executionSource,
      browser_session_id: this.generateSessionId()
    };

    console.log(`✅ Transformação concluída:`);
    console.log(`   📊 Total de registros verificados: ${totalRecords}`);
    console.log(`   🆕 Registros novos: ${newRecords}`);
    console.log(`   🔄 Duplicados ignorados: ${totalDuplicates}`);
    console.log(`   📋 Tabelas com dados novos: ${records.length}`);

    return {
      records,
      session,
      totalRecords,
      newRecords
    };
  }

  /**
   * Gera hash baseado apenas no conteúdo (sem timestamp)
   */
  private generateContentOnlyHash(table: any): string {
    const hashData = {
      name: table.name,
      headers: table.headers,
      rowCount: table.rows.length,
      firstRows: table.rows.slice(0, 3) // Primeiras 3 linhas para hash
      // Removido: timestamp para evitar hashes diferentes
    };
    
    return createHash('md5')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Transforma dados do scraping para formato do banco
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
        // Criar hash único para esta tabela
        const tableHash = this.generateTableHash(table);
        
        // Preparar dados estruturados para o banco
        const structuredData = {
          tableName: table.tableName,
          headers: table.headers,
          rows: table.rows,
          isEmpty: table.isEmpty,
          scrapedAt: new Date().toISOString(),
          totalRows: table.rows.length
        };

        const record: RideRecord = {
          table_name: table.tableName,
          data_hash: tableHash,
          ride_data: structuredData,
          session_info: sessionInfo,
          source: executionSource
        };

        records.push(record);
        totalRecords += table.rows.length;
        
        if (hasChanges) {
          newRecords += table.rows.length;
        }
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
   * Gera hash único para uma tabela
   */
  private generateTableHash(table: RidesTableData): string {
    const hashData = {
      name: table.tableName,
      headers: table.headers,
      rowCount: table.rows.length,
      firstRows: table.rows.slice(0, 3), // Primeiras 3 linhas para hash
      timestamp: Date.now()
    };
    
    return createHash('md5')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Gera hash único para diferenças
   */
  private generateDifferenceHash(difference: any): string {
    const hashData = {
      tableName: difference.tableName,
      newRecordsCount: difference.totalNewRecords,
      firstNewRecords: difference.newRecords?.slice(0, 3) || [],
      timestamp: Date.now()
    };
    
    return createHash('md5')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Gera ID único para sessão
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
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
}
