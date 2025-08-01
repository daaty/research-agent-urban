// ==================================================
// DUPLICATE PREVENTION SERVICE - MELHORADO V2.0
// Prevenção de duplicados usando Engagement ID
// ==================================================

import { createHash } from 'crypto';
import { DatabaseManager } from './databaseManager';

export interface RideRow {
  engagementId: string;
  corporateName: string;
  driverName: string;
  status: string;
  userName: string;
  action?: string;
  rawData: string[]; // Dados originais da linha
}

export interface DuplicateCheckResult {
  isNew: boolean;
  existingId?: number;
  rideHash: string;
  engagementId: string;
}

export interface DeduplicationResult {
  totalRows: number;
  newRows: RideRow[];
  duplicateRows: RideRow[];
  skippedRows: number;
}

export class DuplicatePreventionService {
  private static instance: DuplicatePreventionService;
  private databaseManager: DatabaseManager;

  private constructor() {
    this.databaseManager = DatabaseManager.getInstance();
  }

  public static getInstance(): DuplicatePreventionService {
    if (!DuplicatePreventionService.instance) {
      DuplicatePreventionService.instance = new DuplicatePreventionService();
    }
    return DuplicatePreventionService.instance;
  }

  /**
   * Extrai Engagement ID de uma linha de dados
   */
  private extractEngagementId(row: string[], headers: string[]): string | null {
    // Procurar pelo índice da coluna "Engagement ID"
    const engagementIdIndex = headers.findIndex(header => 
      header.toLowerCase().includes('engagement') && header.toLowerCase().includes('id')
    );

    if (engagementIdIndex !== -1 && row[engagementIdIndex]) {
      return row[engagementIdIndex].trim();
    }

    // Fallback: procurar por padrões como RIDE001, ENG123, etc.
    for (const cell of row) {
      if (/^(RIDE|ENG|ID)\d+$/i.test(cell)) {
        return cell.trim();
      }
    }

    return null;
  }

  /**
   * Converte linha de tabela em objeto RideRow
   */
  private convertRowToRideRow(row: string[], headers: string[]): RideRow | null {
    const engagementId = this.extractEngagementId(row, headers);
    
    if (!engagementId) {
      console.log('⚠️ Linha sem Engagement ID válido:', row);
      return null;
    }

    // Mapear colunas conhecidas
    const getColumnValue = (columnNames: string[]): string => {
      for (const colName of columnNames) {
        const index = headers.findIndex(h => h.toLowerCase().includes(colName.toLowerCase()));
        if (index !== -1 && row[index]) {
          return row[index].trim();
        }
      }
      return '';
    };

    return {
      engagementId,
      corporateName: getColumnValue(['corporate', 'company', 'corp']),
      driverName: getColumnValue(['driver', 'motorista']),
      status: getColumnValue(['status', 'situacao', 'estado']),
      userName: getColumnValue(['user', 'usuario', 'passenger', 'passageiro']),
      action: getColumnValue(['action', 'acao']),
      rawData: [...row] // Cópia dos dados originais
    };
  }

  /**
   * Gera hash único para uma corrida baseado no conteúdo (sem timestamp)
   */
  private generateRideHash(rideRow: RideRow): string {
    const hashData = {
      engagementId: rideRow.engagementId,
      corporateName: rideRow.corporateName,
      driverName: rideRow.driverName,
      status: rideRow.status,
      userName: rideRow.userName
      // Removido: timestamp para evitar hashes diferentes
    };
    
    return createHash('md5')
      .update(JSON.stringify(hashData))
      .digest('hex');
  }

  /**
   * Verifica se uma corrida já existe no banco (por Engagement ID e conteúdo)
   */
  public async checkForDuplicate(rideRow: RideRow, tableName: string): Promise<DuplicateCheckResult> {
    if (!this.databaseManager.isConnectedToDatabase()) {
      // Se DB não conectado, considerar como novo (fallback)
      return {
        isNew: true,
        rideHash: this.generateRideHash(rideRow),
        engagementId: rideRow.engagementId
      };
    }

    try {
      const rideHash = this.generateRideHash(rideRow);

      // Buscar no banco por registros similares
      // Usar JSONB query para buscar pelo engagement_id dentro do ride_data
      const query = `
        SELECT id, data_hash, ride_data
        FROM rides_data 
        WHERE table_name = $1
        AND (
          data_hash = $2 
          OR ride_data->'rows' @> $3
        )
        ORDER BY scraped_at DESC
        LIMIT 1
      `;

      // Buscar por linha que contenha o engagement ID
      const engagementSearch = JSON.stringify([[rideRow.engagementId]]);

      const result = await this.databaseManager.query(query, [
        tableName,
        rideHash,
        engagementSearch
      ]);

      if (result.rows.length > 0) {
        const existingRecord = result.rows[0];
        
        // Verificar se é realmente duplicado analisando o conteúdo
        const existingData = typeof existingRecord.ride_data === 'string' 
          ? JSON.parse(existingRecord.ride_data) 
          : existingRecord.ride_data;

        // Procurar pelo engagement ID nos dados existentes
        const hasMatchingEngagement = existingData.rows?.some((row: string[]) => 
          row.includes(rideRow.engagementId)
        );

        if (hasMatchingEngagement) {
          console.log(`🔄 Corrida duplicada detectada: ${rideRow.engagementId} (${rideRow.status})`);
          return {
            isNew: false,
            existingId: existingRecord.id,
            rideHash,
            engagementId: rideRow.engagementId
          };
        }
      }

      return {
        isNew: true,
        rideHash,
        engagementId: rideRow.engagementId
      };

    } catch (error: any) {
      console.error('❌ Erro ao verificar duplicata:', error.message);
      // Em caso de erro, considerar como novo para não bloquear o sistema
      return {
        isNew: true,
        rideHash: this.generateRideHash(rideRow),
        engagementId: rideRow.engagementId
      };
    }
  }

  /**
   * Processa uma tabela inteira removendo duplicados
   */
  public async deduplicateTableData(
    tableData: { headers: string[]; rows: string[][]; },
    tableName: string
  ): Promise<DeduplicationResult> {
    const newRows: RideRow[] = [];
    const duplicateRows: RideRow[] = [];
    let skippedRows = 0;

    console.log(`🔍 Verificando duplicados para tabela: ${tableName}`);
    console.log(`📊 Total de linhas para verificar: ${tableData.rows.length}`);

    for (const row of tableData.rows) {
      // Converter linha em objeto estruturado
      const rideRow = this.convertRowToRideRow(row, tableData.headers);
      
      if (!rideRow) {
        skippedRows++;
        continue;
      }

      // Verificar se é duplicado
      const duplicateCheck = await this.checkForDuplicate(rideRow, tableName);
      
      if (duplicateCheck.isNew) {
        newRows.push(rideRow);
      } else {
        duplicateRows.push(rideRow);
      }
    }

    const result = {
      totalRows: tableData.rows.length,
      newRows,
      duplicateRows,
      skippedRows
    };

    console.log(`✅ Resultado da deduplicação:`);
    console.log(`   📊 Total: ${result.totalRows}`);
    console.log(`   🆕 Novos: ${result.newRows.length}`);
    console.log(`   🔄 Duplicados: ${result.duplicateRows.length}`);
    console.log(`   ⏭️ Pulados: ${result.skippedRows}`);

    return result;
  }

  /**
   * Converte RideRows de volta para formato original da tabela
   */
  public convertRideRowsToTableFormat(
    rideRows: RideRow[], 
    originalHeaders: string[]
  ): { headers: string[]; rows: string[][]; } {
    return {
      headers: originalHeaders,
      rows: rideRows.map(rideRow => rideRow.rawData)
    };
  }

  /**
   * Método principal: filtra dados de uma tabela removendo duplicados
   */
  public async filterDuplicates(
    tableData: { name: string; headers: string[]; rows: string[][]; isEmpty: boolean; url: string }
  ): Promise<{ 
    originalTable: any; 
    filteredTable: any; 
    deduplicationStats: DeduplicationResult 
  }> {
    if (tableData.isEmpty || tableData.rows.length === 0) {
      return {
        originalTable: tableData,
        filteredTable: tableData,
        deduplicationStats: {
          totalRows: 0,
          newRows: [],
          duplicateRows: [],
          skippedRows: 0
        }
      };
    }

    // Processar deduplicação
    const deduplicationResult = await this.deduplicateTableData(
      { headers: tableData.headers, rows: tableData.rows },
      tableData.name
    );

    // Criar tabela filtrada apenas com dados novos
    const filteredTableData = this.convertRideRowsToTableFormat(
      deduplicationResult.newRows,
      tableData.headers
    );

    const filteredTable = {
      ...tableData,
      rows: filteredTableData.rows,
      isEmpty: filteredTableData.rows.length === 0
    };

    return {
      originalTable: tableData,
      filteredTable,
      deduplicationStats: deduplicationResult
    };
  }
}
