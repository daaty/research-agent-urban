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
          const driverInfo = this.extractDriverInfo(row, table.headers);
          const uniqueId = this.generateDriverUniqueId(driverInfo, table.name);
          
          // Gerar hash para detecção de duplicatas
          const dataHash = this.generateDataHash(uniqueId, row, table.name);
          
          // Determinar tipo de dados baseado no nome da tabela
          const dataType = this.mapTableNameToDataType(table.name);
          
          // Preparar dados adicionais específicos da página
          const additionalData = this.extractAdditionalData(row, table.headers, table.name);
          
          const record: DriverRecord = {
            driver_id: driverInfo.driver_id || uniqueId,
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
   * Extrai informações estruturadas do driver de uma linha de dados
   */
  private extractDriverInfo(row: string[], headers: string[]): any {
    const driverInfo: any = {};
    
    // 🔧 CORREÇÃO ESPECÍFICA PARA DIFFERENT TABLES:
    
    // 1️⃣ LEADERBOARD (6 campos) - estrutura correta
    if (headers.length === 6 && headers.includes('Driver ID') && headers.includes('Driver Name') && headers.includes('Rides')) {
      // Headers: ["City", "Driver ID", "Driver Name", "Phone Number", "Rank", "Rides"]  
      // raw_row: ["12146346","Márcio De Oliveira Cabral","+5566996312650","Matupá","0","2"]
      driverInfo.driver_id = row[0];     // Driver ID REAL (número) - posição 0
      driverInfo.name = row[1];          // Driver Name REAL - posição 1
      driverInfo.mobile = row[2];        // Phone Number REAL - posição 2
      driverInfo.city = row[3];          // City (Matupá) - posição 3
      driverInfo.rank = row[4];          // Rank - posição 4
      driverInfo.rides = row[5];         // Rides (número) - posição 5
      
      console.log(`🔧 [LEADERBOARD FIXED V3] ID: ${driverInfo.driver_id}, Nome: ${driverInfo.name}, Mobile: ${driverInfo.mobile}, Rides: ${driverInfo.rides}`);
      
    // 2️⃣ ACTIVE DRIVERS (15 campos) - estrutura correta
    } else if (headers.length === 15 && headers.includes('Driver ID') && headers.includes('Driver Name')) {
      // Headers: ["City","Driver ID","Driver Name","Driver Ratings","Email","Franchise Name","Last Login","Last Ride","Mobile","OTP","Registered On","Rides in Last 30 Days","Rides in Last 7 Days","Status","Vehicle Number"]
      // raw_row: ["12146346","Márcio De Oliveira Cabral","None","Matupá","+5566996312650","eucatur927@hotmail.com","Offline","2025033131-03-2025","HB20 BRANCO - PLACA QCT4E70",...]
      driverInfo.driver_id = row[0];               // Driver ID REAL (número) - posição 0
      driverInfo.name = row[1];                    // Driver Name REAL - posição 1
      driverInfo.city = row[3];                    // City (Matupá) - posição 3
      driverInfo.rating = row[3];                  // Driver Ratings - posição 3
      driverInfo.email = row[5];                   // Email CORRETO - posição 5
      driverInfo.mobile = row[4];                  // Mobile CORRETO - posição 4
      driverInfo.franchise = row[5];               // Franchise Name - posição 5
      driverInfo.last_login = row[6];              // Last Login - posição 6
      driverInfo.last_ride = row[7];               // Last Ride - posição 7
      driverInfo.vehicle = row[8];                 // Vehicle - posição 8
      
      console.log(`🔧 [ACTIVE FIXED V3] ID: ${driverInfo.driver_id}, Nome: ${driverInfo.name}, Email: ${driverInfo.email}, Mobile: ${driverInfo.mobile}`);
      
    // 3️⃣ ENROLLMENT (8 campos) - estrutura específica  
    } else if (headers.length === 8 && headers.includes('Driver ID') && headers.includes('Driver Name') && headers.includes('Phone Number')) {
      // Headers: ["Action","Driver ID","Driver Name","Fleet Id","Last Updated","No of docs uploaded","Phone Number","Registered On"]
      // raw_row: ["17177005","valdiceia santos silva","+5566996356157","202505152030 15-05-2025",">","0 out of 5","---","Remove"]
      driverInfo.driver_id = row[0];               // Driver ID REAL (número) - posição 0
      driverInfo.name = row[1];                    // Driver Name REAL - posição 1  
      driverInfo.mobile = row[2];                  // Phone Number real - posição 2
      driverInfo.fleet_id = row[3];                // Fleet Id - posição 3
      driverInfo.last_updated = row[4];            // Last Updated - posição 4
      driverInfo.docs_uploaded = row[5];           // No of docs uploaded - posição 5
      driverInfo.phone_display = row[6];           // Phone Number (display) - posição 6
      driverInfo.registered_on = row[7];           // Registered On - posição 7
      
      console.log(`🔧 [ENROLLMENT FIXED V2] ID: ${driverInfo.driver_id}, Nome: ${driverInfo.name}, Mobile: ${driverInfo.mobile}`);
      
    } else {
      // Fallback para mapeamento original se a estrutura for diferente
      headers.forEach((header, index) => {
        const value = row[index] || '';
        const headerLower = header.toLowerCase();
        
        // Mapear campos específicos da tabela Active Drivers
        if (headerLower.includes('driver id')) {
          driverInfo.driver_id = value;
        } else if (headerLower.includes('driver name')) {
          driverInfo.name = value;
        } else if (headerLower.includes('city')) {
          driverInfo.city = value;
        } else if (headerLower.includes('mobile') || headerLower.includes('phone')) {
          driverInfo.mobile = value;
        } else if (headerLower.includes('email')) {
          driverInfo.email = value;
        } else if (headerLower.includes('status')) {
          driverInfo.status = value;
        } else if (headerLower.includes('registered on')) {
          driverInfo.registered_on = value;
        } else if (headerLower.includes('vehicle number')) {
          driverInfo.vehicle_number = value;
        } else if (headerLower.includes('rides in last 7 days')) {
          driverInfo.rides_7_days = value;
        } else if (headerLower.includes('rides in last 30 days')) {
          driverInfo.rides_30_days = value;
        } else if (headerLower.includes('last login')) {
          driverInfo.last_login = value;
        } else if (headerLower.includes('last ride')) {
          driverInfo.last_ride = value;
        } else if (headerLower.includes('driver ratings')) {
          driverInfo.rating = value;
        } else if (headerLower.includes('franchise')) {
          driverInfo.franchise = value;
        }
        
        // Adicionar campo genérico também
        const fieldKey = header.toLowerCase().replace(/\s+/g, '_').replace(/[^\w]/g, '');
        driverInfo[fieldKey] = value;
      });
    }

    return driverInfo;
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
    additionalData.headers = headers;
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
