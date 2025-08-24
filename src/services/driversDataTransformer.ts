import { createHash } from 'crypto';
import { DatabaseManager, DriverRecord, ScrapingSession } from './databaseManager';
import { DriverTableData } from '../scraper/driversPersistentScraper';

export interface TransformedDriverData {
  records: DriverRecord[];
  session: ScrapingSession;
  totalRecords: number;
  newRecords: number;
}

export class DriversDataTransformer {
  private static instance: DriversDataTransformer;
  private databaseManager: DatabaseManager;

  private constructor() {
    this.databaseManager = DatabaseManager.getInstance();
  }

  public static getInstance(): DriversDataTransformer {
    if (!DriversDataTransformer.instance) {
      DriversDataTransformer.instance = new DriversDataTransformer();
    }
    return DriversDataTransformer.instance;
  }

  /**
   * Transforma dados do scraping de drivers para formato do banco com IDs únicos
   */
  public transformScrapingData(
    scrapingData: DriverTableData[],
    sessionInfo: any,
    executionSource: string = 'drivers-persistent-scraper',
    hasChanges: boolean = true
  ): TransformedDriverData {
    const records: DriverRecord[] = [];
    let totalRecords = 0;
    let newRecords = 0;

    // Transformar cada tabela em registros do banco
    scrapingData.forEach(table => {
      // Verificar se a tabela tem nome e dados válidos
      if (!table.isEmpty && 
          table.rows.length > 0 && 
          table.name && 
          table.name.trim() !== '') {
        
        // Processar cada linha da tabela como um registro individual
        table.rows.forEach(row => {
          // Extrair informações básicas do driver
          const driverInfo = this.extractDriverInfo(row, table.headers, table.name);
          if (!driverInfo) {
            // Logar erro de mapeamento e pular registro
            console.warn(`[DRIVER SCRAPER] Registro ignorado por mapeamento inválido. Aba: ${table.name}, Row: ${JSON.stringify(row)}`);
            return;
          }
          // Validação extra: driver_id não pode ser telefone
          if (driverInfo.driver_id && /^\d{8,}$/.test(driverInfo.driver_id) && driverInfo.driver_id === driverInfo.mobile) {
            console.warn(`[DRIVER SCRAPER] Registro ignorado: driver_id parece telefone. Aba: ${table.name}, Row: ${JSON.stringify(row)}`);
            return;
          }
          const uniqueId = this.generateDriverUniqueId(driverInfo, table.name);
          const dataHash = this.generateDataHash(uniqueId, row, table.name);
          const dataType = this.mapTableNameToDataType(table.name);
          const additionalData = this.extractAdditionalData(row, table.headers, table.name);
          const record: DriverRecord = {
            driver_id: driverInfo.driver_id,
            name: driverInfo.name || '',
            email: driverInfo.email || null,
            mobile: driverInfo.mobile || null,
            data_type: dataType,
            page_source: table.name,
            additional_data: additionalData,
            data_hash: dataHash,
            session_info: sessionInfo,
            source: executionSource,
            unique_id: uniqueId
          };
          records.push(record);
          totalRecords++;
          if (hasChanges) {
            newRecords++;
          }
        });
      }
    });

    // Criar sessão de scraping
    const session: ScrapingSession = {
      total_records: totalRecords,
      new_records: newRecords,
      has_changes: hasChanges,
      execution_source: executionSource,
      browser_session_id: sessionInfo?.browserSessionId || null
    };

    console.log(`📊 Dados transformados: ${totalRecords} registros de drivers processados`);

    return {
      records,
      session,
      totalRecords,
      newRecords
    };
  }

  /**
   * Extrai informações do driver de uma linha usando DETECÇÃO INTELIGENTE por padrão
   * NOVA ABORDAGEM: detecta dados por padrão, não por posição - SIMPLES E ROBUSTA
   */
  private extractDriverInfo(row: string[], headers: string[], tableName: string = ""): any {
    if (!row || row.length === 0) return null;

    console.log(`[DEBUG] Row completa (${tableName}):`, row);

    // ESTRATÉGIA SIMPLES: Detectar dados por PADRÃO, não por posição
    const driverInfo: any = {};

    // 1. DETECTAR DRIVER ID: Número de 7-8 dígitos
    driverInfo.driver_id = this.findDriverId(row);

    // 2. DETECTAR NOME: Texto com letras que não seja cidade/veículo
    driverInfo.name = this.findDriverName(row);

    // 3. DETECTAR TELEFONE: Formato +55...
    driverInfo.mobile = this.findMobile(row);

    // 4. DETECTAR EMAIL: Contém @
    driverInfo.email = this.findEmail(row);

    // 5. DETECTAR CIDADE: Palavra conhecida como "Matupá"
    driverInfo.city = this.findCity(row);

    console.log(`[DEBUG] Dados extraídos (${tableName}):`, {
      driver_id: driverInfo.driver_id,
      name: driverInfo.name,
      mobile: driverInfo.mobile,
      email: driverInfo.email
    });

    // VALIDAÇÃO CRÍTICA: Se não tem driver_id válido, rejeitar completamente
    if (!driverInfo.driver_id) {
      console.log(`[DEBUG] Registro rejeitado por falta de driver_id válido (${tableName})`);
      return null;
    }

    return driverInfo;
  }

  /**
   * Detecta Driver ID: número de 7-8 dígitos
   */
  private findDriverId(row: string[]): string | null {
    for (const cell of row) {
      if (cell && /^\d{7,8}$/.test(cell.trim())) {
        return cell.trim();
      }
    }
    return null;
  }

  /**
   * Detecta nome do driver: texto com letras que não seja cidade/veículo/status
   */
  private findDriverName(row: string[]): string | null {
    const excludePatterns = [
      /^\+55/, // telefone
      /^\d+$/, // só números
      /@/, // email
      /^(Matupá|Online|Offline|Remove|Driver|View OTP|None)$/i, // palavras específicas
      /PLACA|CARRO|GOL|ONIX|CORSA|HB20|SIENA|FIESTA|KWID|COROLLA|HYUNDAI|NISSAN/i, // veículos
      /^\d{1,2}\/\d{1,2}\/\d{4}/, // datas formato dd/mm/yyyy
      /\d{4}\d{2}\d{2}\d{4}-\d{2}-\d{4}/, // datas formato estranho do sistema
      /^\d{8}\d{4}-\d{2}-\d{2}/, // timestamp malformado
      /out of/i, // "1 out of 5"
      /^[\d\s\-\.]+$/, // só números, espaços e pontuação
      /^.{0,2}$/, // muito curto (0-2 caracteres)
      /No data available/i // mensagem padrão da tabela
    ];

    for (const cell of row) {
      if (!cell || cell.trim() === '') continue;
      
      const cleanCell = cell.trim();
      
      // Verificar se contém letras
      if (!/[a-zA-ZÀ-ÿ]/.test(cleanCell)) continue;
      
      // Verificar se NÃO bate com padrões excluídos
      const isExcluded = excludePatterns.some(pattern => pattern.test(cleanCell));
      if (isExcluded) continue;
      
      // Se passou em todas as verificações, é provavelmente um nome
      if (cleanCell.length >= 3) {
        return cleanCell;
      }
    }
    
    return null;
  }

  /**
   * Detecta telefone: formato +55...
   */
  private findMobile(row: string[]): string | null {
    for (const cell of row) {
      if (cell && /^\+55\d{11,13}$/.test(cell.trim())) {
        return cell.trim();
      }
    }
    return null;
  }

  /**
   * Detecta email: contém @ e formato válido
   */
  private findEmail(row: string[]): string | null {
    for (const cell of row) {
      if (cell && /@/.test(cell) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cell.trim())) {
        return cell.trim();
      }
    }
    return null;
  }

  /**
   * Detecta cidade: palavras conhecidas
   */
  private findCity(row: string[]): string | null {
    const knownCities = ['Matupá', 'São Paulo', 'Rio de Janeiro'];
    
    for (const cell of row) {
      if (cell && knownCities.includes(cell.trim())) {
        return cell.trim();
      }
    }
    return null;
  }

  /**
   * Mapeia nome da tabela para tipo de dados
   */
  private mapTableNameToDataType(tableName: string): string {
    const mapping: Record<string, string> = {
      'Active Drivers': 'active',
      'Deactive Drivers': 'deactive', 
      'Drivers Enrollment': 'enrollment',
      'Leaderboard': 'leaderboard',
      'Driver Performance': 'performance'
    };
    
    return mapping[tableName] || tableName.toLowerCase().replace(/\s+/g, '_');
  }

  /**
   * Extrai dados adicionais específicos de cada página
   */
  private extractAdditionalData(row: string[], headers: string[], tableName: string): any {
    const additionalData: any = {};
    
    // Mapear todos os campos que não são básicos (nome, email, mobile)
    headers.forEach((header, index) => {
      const value = row[index] || '';
      const headerKey = header.toLowerCase().replace(/\s+/g, '_');
      
      // Pular campos básicos que já estão na estrutura principal
      if (!['name', 'nome', 'email', 'e-mail', 'mobile', 'telefone', 'celular'].includes(headerKey)) {
        additionalData[headerKey] = value;
      }
    });
    
    // Adicionar informações específicas por tipo de página
    switch (tableName) {
      case 'Active Drivers':
      case 'Deactive Drivers':
        // Campos específicos de status de drivers
        break;
      case 'Leaderboard':
        // Campos de ranking, pontuação, etc.
        break;
      case 'Driver Performance':
        // Métricas de performance
        break;
      case 'Drivers Enrollment':
        // Dados de cadastro/enrollment
        break;
    }
    
    additionalData.raw_row = row;
  // Padronizar headers: lowercase, sem espaços extras, com underscores
  additionalData.headers = headers.map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
    additionalData.scraped_timestamp = new Date().toISOString();
    
    return additionalData;
  }

  /**
   * Gera ID único para um driver baseado nos dados disponíveis
   */
  private generateDriverUniqueId(driverInfo: any, tableName: string): string {
    const idComponents: string[] = [];
    
    // Usar driver_id como campo principal (mais estável)
    if (driverInfo.driver_id) {
      idComponents.push(`id:${driverInfo.driver_id}`);
    }
    
    // Campos adicionais para robustez
    if (driverInfo.email && !driverInfo.email.includes('temp_')) {
      idComponents.push(`email:${driverInfo.email}`);
    }
    if (driverInfo.mobile) {
      idComponents.push(`mobile:${driverInfo.mobile}`);
    }
    if (driverInfo.name) {
      idComponents.push(`name:${driverInfo.name}`);
    }
    
    // Se não conseguirmos extrair informações suficientes, usar hash da linha inteira
    if (idComponents.length === 0) {
      const fallbackData = JSON.stringify(driverInfo);
      const fallbackHash = createHash('md5').update(fallbackData).digest('hex').substring(0, 8);
      idComponents.push(`hash:${fallbackHash}`);
    }
    
    // Incluir tipo de tabela para evitar conflitos
    const baseUniqueId = `${tableName.replace(/\s+/g, '_')}_${idComponents.join('_')}`;
    
    // Se o ID for muito longo (>200 chars), usar hash para encurtá-lo
    if (baseUniqueId.length > 200) {
      const idHash = createHash('md5').update(baseUniqueId).digest('hex');
      return `${tableName.replace(/\s+/g, '_')}_${idHash}`;
    }
    
    return baseUniqueId;
  }

  /**
   * Gera hash para detecção de duplicatas
   */
  private generateDataHash(uniqueId: string, row: string[], tableName: string): string {
    // Gerar hash baseado APENAS nos dados (SEM timestamp para evitar duplicação)
    const hashData = {
      unique_id: uniqueId,
      table_name: tableName,
      data: row.join('|')
      // ⭐ REMOVIDO TIMESTAMP - estava causando duplicações na DB
    };
    
    const dataString = JSON.stringify(hashData);
    return createHash('md5').update(dataString).digest('hex');
  }

  /**
   * Salva dados transformados no banco de dados
   */
  public async saveToDatabase(transformedData: TransformedDriverData): Promise<void> {
    try {
      console.log('💾 Salvando dados de drivers no banco...');
      
      // Criar sessão
      const sessionId = await this.databaseManager.createScrapingSession(transformedData.session);
      
      // Inserir dados usando UPSERT
      if (transformedData.records.length > 0) {
        await this.databaseManager.insertDriverData(transformedData.records);
      }
      
      // Finalizar sessão
      await this.databaseManager.finishScrapingSession(sessionId);
      
      console.log(`✅ Dados de drivers salvos: ${transformedData.totalRecords} registros processados`);
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar dados de drivers:', error.message);
      throw error;
    }
  }

  /**
   * Transforma e salva dados de scraping de drivers
   */
  public async transformAndSave(
    scrapingData: DriverTableData[],
    sessionInfo: any,
    executionSource: string = 'drivers-persistent-scraper',
    hasChanges: boolean = true
  ): Promise<TransformedDriverData> {
    
    // Transformar dados
    const transformedData = this.transformScrapingData(
      scrapingData,
      sessionInfo,
      executionSource,
      hasChanges
    );

    // Salvar no banco
    await this.saveToDatabase(transformedData);

    return transformedData;
  }
}
