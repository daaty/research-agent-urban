import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { RideTableData } from '../scraper/ridesPersistentScraper';

export interface CachedData {
  timestamp: number;
  data: RideTableData[];
  dataHash: string;
}

export interface DataDifference {
  tableName: string;
  newRecords: string[][];
  updatedRecords: string[][];
  removedRecords: string[][];
  totalNewRecords: number;
}

export interface WebhookPayload {
  timestamp: string;
  source: string;
  mode: string;
  sessionInfo: any;
  onlyNewData: boolean;
  differences: DataDifference[];
  summary: {
    totalNewRecords: number;
    totalUpdatedRecords: number;
    totalRemovedRecords: number;
    tablesWithChanges: number;
  };
}

export class DataCacheManager {
  private static instance: DataCacheManager;
  private cacheFilePath: string;
  private previousDataPath: string;

  private constructor() {
    this.cacheFilePath = path.join(process.cwd(), 'data', 'cache-data.json');
    this.previousDataPath = path.join(process.cwd(), 'data', 'previous-rides-data.json');
    
    // Garantir que o diretório existe
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  }

  public static getInstance(): DataCacheManager {
    if (!DataCacheManager.instance) {
      DataCacheManager.instance = new DataCacheManager();
    }
    return DataCacheManager.instance;
  }

  /**
   * Carrega dados anteriores do cache
   */
  private loadPreviousData(): CachedData | null {
    try {
      if (fs.existsSync(this.previousDataPath)) {
        const data = fs.readFileSync(this.previousDataPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('⚠️ Erro ao carregar dados anteriores:', error);
    }
    return null;
  }

  /**
   * Salva dados atuais no cache
   */
  private savePreviousData(data: RideTableData[]): void {
    try {
      const cachedData: CachedData = {
        timestamp: Date.now(),
        data: data,
        dataHash: this.generateDataHash(data)
      };
      
      fs.writeFileSync(this.previousDataPath, JSON.stringify(cachedData, null, 2));
      console.log('✅ Dados salvos no cache');
    } catch (error) {
      console.error('❌ Erro ao salvar dados no cache:', error);
    }
  }

  /**
   * Gera hash único dos dados para comparação rápida
   */
  private generateDataHash(data: RideTableData[]): string {
    const dataString = JSON.stringify(data.map(table => ({
      name: table.name,
      rowCount: table.rows.length,
      rows: table.rows.sort() // Ordenar para hash consistente
    })));
    return createHash('md5').update(dataString).digest('hex');
  }

  /**
   * Gera hash único de uma linha de dados
   */
  private generateRowHash(row: string[]): string {
    return createHash('md5').update(JSON.stringify(row)).digest('hex');
  }

  /**
   * Compara dados atuais com dados anteriores e retorna apenas as diferenças
   */
  public compareAndGetDifferences(currentData: RideTableData[]): {
    hasChanges: boolean;
    differences: DataDifference[];
    webhookPayload: WebhookPayload;
  } {
    console.log('🔍 Comparando dados atuais com dados anteriores...');
    
    const previousData = this.loadPreviousData();
    const differences: DataDifference[] = [];
    
    if (!previousData) {
      console.log('📝 Primeira execução - todos os dados são novos');
      
      // Primeira execução - todos os dados são novos
      currentData.forEach(table => {
        if (!table.isEmpty && table.rows.length > 0) {
          differences.push({
            tableName: table.name,
            newRecords: table.rows,
            updatedRecords: [],
            removedRecords: [],
            totalNewRecords: table.rows.length
          });
        }
      });
      
      // Salvar dados atuais
      this.savePreviousData(currentData);
      
      return {
        hasChanges: differences.length > 0,
        differences,
        webhookPayload: this.createWebhookPayload(differences, true)
      };
    }

    // Comparar hash geral primeiro
    const currentHash = this.generateDataHash(currentData);
    if (currentHash === previousData.dataHash) {
      console.log('✅ Nenhuma mudança detectada (hash igual)');
      return {
        hasChanges: false,
        differences: [],
        webhookPayload: this.createWebhookPayload([], false)
      };
    }

    console.log('📊 Mudanças detectadas, analisando detalhes...');

    // Comparar cada tabela
    currentData.forEach(currentTable => {
      const previousTable = previousData.data.find(t => t.name === currentTable.name);
      
      if (!previousTable) {
        // Tabela nova
        console.log(`📝 Tabela nova encontrada: ${currentTable.name}`);
        if (!currentTable.isEmpty && currentTable.rows.length > 0) {
          differences.push({
            tableName: currentTable.name,
            newRecords: currentTable.rows,
            updatedRecords: [],
            removedRecords: [],
            totalNewRecords: currentTable.rows.length
          });
        }
        return;
      }

      // Comparar linhas da tabela
      const tableDiff = this.compareTableRows(previousTable, currentTable);
      
      if (tableDiff.totalNewRecords > 0 || tableDiff.updatedRecords.length > 0 || tableDiff.removedRecords.length > 0) {
        console.log(`📊 ${currentTable.name}: ${tableDiff.totalNewRecords} novos, ${tableDiff.updatedRecords.length} atualizados, ${tableDiff.removedRecords.length} removidos`);
        differences.push(tableDiff);
      }
    });

    // Salvar dados atuais
    this.savePreviousData(currentData);

    const hasChanges = differences.length > 0;
    console.log(`🔄 Resultado: ${hasChanges ? 'Mudanças detectadas' : 'Nenhuma mudança'}`);

    return {
      hasChanges,
      differences,
      webhookPayload: this.createWebhookPayload(differences, hasChanges)
    };
  }

  /**
   * Compara linhas de uma tabela específica
   */
  private compareTableRows(previousTable: RideTableData, currentTable: RideTableData): DataDifference {
    const newRecords: string[][] = [];
    const updatedRecords: string[][] = [];
    const removedRecords: string[][] = [];

    // Criar mapas de hash para comparação eficiente
    const previousRowHashes = new Set(previousTable.rows.map(row => this.generateRowHash(row)));
    const currentRowHashes = new Set(currentTable.rows.map(row => this.generateRowHash(row)));

    // Encontrar registros novos
    currentTable.rows.forEach(row => {
      const rowHash = this.generateRowHash(row);
      if (!previousRowHashes.has(rowHash)) {
        newRecords.push(row);
      }
    });

    // Encontrar registros removidos
    previousTable.rows.forEach(row => {
      const rowHash = this.generateRowHash(row);
      if (!currentRowHashes.has(rowHash)) {
        removedRecords.push(row);
      }
    });

    // Para esta implementação, não estamos detectando atualizações
    // pois seria necessário uma chave primária para identificar registros únicos

    return {
      tableName: currentTable.name,
      newRecords,
      updatedRecords,
      removedRecords,
      totalNewRecords: newRecords.length
    };
  }

  /**
   * Cria payload para webhook com apenas dados novos
   */
  private createWebhookPayload(differences: DataDifference[], hasChanges: boolean): WebhookPayload {
    const summary = {
      totalNewRecords: differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0),
      totalUpdatedRecords: differences.reduce((sum, diff) => sum + diff.updatedRecords.length, 0),
      totalRemovedRecords: differences.reduce((sum, diff) => sum + diff.removedRecords.length, 0),
      tablesWithChanges: differences.length
    };

    return {
      timestamp: new Date().toISOString(),
      source: 'rides-dashboard-persistent',
      mode: 'persistent-browser',
      sessionInfo: {}, // Será preenchido pelo chamador
      onlyNewData: true,
      differences,
      summary
    };
  }

  /**
   * Limpa cache (útil para testes)
   */
  public clearCache(): void {
    try {
      if (fs.existsSync(this.previousDataPath)) {
        fs.unlinkSync(this.previousDataPath);
        console.log('✅ Cache limpo');
      }
    } catch (error) {
      console.error('❌ Erro ao limpar cache:', error);
    }
  }

  /**
   * Obter estatísticas do cache
   */
  public getCacheStats(): {
    hasCache: boolean;
    lastUpdate: string | null;
    totalTables: number;
    totalRecords: number;
  } {
    const previousData = this.loadPreviousData();
    
    if (!previousData) {
      return {
        hasCache: false,
        lastUpdate: null,
        totalTables: 0,
        totalRecords: 0
      };
    }

    return {
      hasCache: true,
      lastUpdate: new Date(previousData.timestamp).toISOString(),
      totalTables: previousData.data.length,
      totalRecords: previousData.data.reduce((sum, table) => sum + table.rows.length, 0)
    };
  }
}
