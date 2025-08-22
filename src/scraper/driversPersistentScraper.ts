import { BrowserSessionManager } from '../services/browserSessionManager';
import { DriverCacheManager } from '../services/driverCacheManager';

export interface DriverTableData {
  name: string;
  url: string;
  headers: string[];
  rows: string[][];
  isEmpty: boolean;
}

export interface DriverPerformanceData {
  driver_id: string;
  driver_name: string;
  phone_number: string;
  request_sent: number;
  requests_received: number;
  user_cancelled_rides: number;
  user_cancelled_ride_cash: number;
  user_cancelled_ride_wallet: number;
  driver_cancelled_rides: number;
  driver_cancelled_ride_cash: number;
  driver_cancelled_ride_wallet: number;
  rejected_rides: number;
  success_rides: number;
  missed_rides: number;
  active_days: number;
  online_hours: number;
  d2c_referral: number;
  d2d_referral: number;
  start_end_cheating_rides: number;
  manual_start_end_cheating_rides: number;
  vehicle: string;
}

export interface DriverScrapeResult {
  success: boolean;
  data: DriverTableData[];
  message: string;
  sessionInfo?: {
    isNewLogin: boolean;
    browserStatus: string;
    sessionValid: boolean;
  };
  hasChanges?: boolean;
  onlyNewData?: boolean;
  differences?: any[];
}

export class DriversPersistentScraper {
  private sessionManager: BrowserSessionManager;
  private cacheManager: DriverCacheManager;
  private baseUrl: string;
  private driversPages: Array<{name: string, url: string}>;

  constructor() {
    // 🖥️ Usar a mesma sessão do RidesPersistentScraper para compartilhar login
    this.sessionManager = BrowserSessionManager.getInstance('rides_scraper');
    this.cacheManager = DriverCacheManager.getInstance();
    
    // Extrair domínio base da URL de login (sem barra final)
    const loginUrl = process.env.RIDES_LOGIN_URL || 'https://rides.ec2dashboard.com/#/page/login';
    this.baseUrl = loginUrl.split('#')[0].replace(/\/$/, ''); // Remove barra final se existir
    
    // URLs das páginas de drivers baseado no domínio (URLs corretas)
    this.driversPages = [
      { name: 'Active Drivers', url: `${this.baseUrl}/#/app/active-drivers//` },
      { name: 'Deactive Drivers', url: `${this.baseUrl}/#/app/deactivated-drivers/` },
      { name: 'Drivers Enrollment', url: `${this.baseUrl}#/app/selfEnrolled-driver//` },
      { name: 'Leaderboard', url: `${this.baseUrl}#/app/driver-leaderboard/` },
      { name: 'Driver Performance', url: `${this.baseUrl}#/app/high-cancellations/` }
    ];
  }

  /**
   * Executa scraping de drivers usando sessão persistente (reutiliza sessão das rides)
   */
  public async scrapeAllDriversData(): Promise<DriverScrapeResult> {
    try {
      console.log('🚗 Iniciando scraping de drivers com sessão persistente...');
      
      // Verificar se a sessão está ativa (deve estar devido ao scraping de rides)
      if (!this.sessionManager.isActive()) {
        return {
          success: false,
          data: [],
          message: 'Sessão do browser não está ativa. Execute primeiro o scraping de rides.',
          sessionInfo: {
            isNewLogin: false,
            browserStatus: 'inactive',
            sessionValid: false
          }
        };
      }

      console.log('✅ Usando sessão existente do browser para drivers');
      
      // Extrair dados de todas as páginas de drivers
      const allDriversData: DriverTableData[] = [];
      
      for (const driverPage of this.driversPages) {
        console.log(`👥 Processando: ${driverPage.name}...`);
        
        try {
          // Navegar diretamente para a página (sem verificações de login)
          await this.navigateDirectly(driverPage.url);
          
          // Aguardar página carregar
          if (driverPage.name.includes('Performance')) {
            console.log(`⏳ Driver Performance detectado - será necessário clicar no Search...`);
            await this.delay(2000); // Tempo básico para Performance
          } else {
            await this.delay(1500);
          }
          
          // Aguardar especificamente elementos Angular carregarem
          await this.waitForAngularLoad();
          
          // Aguardar especificamente a tabela de drivers carregar
          const tableData = await this.extractDriverTableData(driverPage.name);
          allDriversData.push(tableData);
          
          const recordCount = tableData.isEmpty ? 0 : tableData.rows.length;
          console.log(`✅ ${driverPage.name}: ${recordCount} registros encontrados`);
          
        } catch (error: any) {
          console.error(`❌ Erro ao processar ${driverPage.name}:`, error.message);
          allDriversData.push({
            name: driverPage.name,
            url: driverPage.url,
            headers: [],
            rows: [],
            isEmpty: true
          });
        }
      }

      const totalRecords = allDriversData.reduce((sum, table) => sum + table.rows.length, 0);
      
      // Comparar com dados anteriores de drivers
      console.log('🔍 Comparando dados de drivers com cache anterior...');
      const comparison = this.cacheManager.compareAndGetDifferences(allDriversData);

      let resultMessage = '';
      if (comparison.hasChanges) {
        const newRecords = comparison.differences.reduce((sum: number, diff: any) => sum + diff.totalNewRecords, 0);
        resultMessage = `✅ Scraping de drivers concluído! ${newRecords} novos registros encontrados de ${totalRecords} total`;
      } else {
        resultMessage = `✅ Scraping de drivers concluído! Nenhuma mudança detectada (${totalRecords} registros existentes)`;
      }

      console.log(resultMessage);
      
      return {
        success: true,
        data: allDriversData,
        message: resultMessage,
        sessionInfo: {
          isNewLogin: false,
          browserStatus: 'active',
          sessionValid: true
        },
        hasChanges: comparison.hasChanges,
        differences: comparison.differences
      };

    } catch (error: any) {
      console.error('❌ Erro durante scraping de drivers:', error.message);
      return {
        success: false,
        data: [],
        message: `Erro durante scraping: ${error.message}`,
        sessionInfo: {
          isNewLogin: false,
          browserStatus: 'error',
          sessionValid: false
        }
      };
    }
  }

  /**
   * Extrai dados específicos da tabela de drivers com seletores otimizados
   */
  private async extractDriverTableData(tableName: string): Promise<DriverTableData> {
    const page = this.sessionManager.getPage();
    if (!page) {
      throw new Error('Browser não está inicializado');
    }

    const currentUrl = page.url();

    try {
      // Determinar qual seletor usar baseado no tipo de página
      let tableSelector = '';
      let rowSelector = '';
      
      if (tableName.includes('Active')) {
        tableSelector = '#activeDriver';
        rowSelector = '#activeDriver tbody tr[ng-repeat*="data in displayData"]';
      } else if (tableName.includes('Deactive')) {
        tableSelector = '#deactivatedDriver';
        rowSelector = '#deactivatedDriver tbody tr[ng-repeat*="data in displayData"]';
      } else if (tableName.includes('Enrollment')) {
        tableSelector = '#manUploaded';
        rowSelector = '#manUploaded tbody tr[ng-repeat*="value in displayData"]';
      } else if (tableName.includes('Leaderboard')) {
        tableSelector = '#datatable2';
        rowSelector = '#datatable2 tbody tr[ng-repeat*="data in TableData"]';
      } else if (tableName.includes('Performance')) {
        // Driver Performance pode usar seletor diferente
        tableSelector = '#datatable2, table.t-fancy-table, .dataTables_wrapper table';
        rowSelector = '#datatable2 tbody tr[ng-repeat*="data in TableData"], table.t-fancy-table tbody tr[ng-repeat*="data"]';
      } else {
        // Fallback genérico para outras páginas
        tableSelector = 'table.t-fancy-table';
        rowSelector = 'table.t-fancy-table tbody tr[ng-repeat*="data in displayData"]';
      }
      
      console.log(`🔍 Usando seletor: ${tableSelector} para ${tableName}`);
      
      // Tratamento especial para Driver Performance
      if (tableName.includes('Performance')) {
        return await this.extractPerformanceTableData(tableName, currentUrl);
      }
      
      // Aguardar a tabela específica de drivers carregar (timeout otimizado)
      await page.waitForSelector(tableSelector, { timeout: 5000 });
      
      // Aguardar dados carregarem na tabela (reduzido)
      await page.waitForTimeout(1500);
      
      // Aguardar especificamente pelos dados nas linhas (timeout otimizado)
      try {
        await page.waitForSelector(`${tableSelector} tbody tr`, { timeout: 3000 });
      } catch (error) {
        console.log(`⚠️ Nenhuma linha encontrada em ${tableName} - tabela pode estar vazia`);
      }
      
      // Verificar se a tabela existe
      const tableExists = await page.$(tableSelector);
      if (!tableExists) {
        return {
          name: tableName,
          url: currentUrl,
          headers: [],
          rows: [],
          isEmpty: true
        };
      }

      // Extrair headers da tabela de drivers
      const headers = await page.$$eval(`${tableSelector} thead th`, ths => 
        ths.map(th => {
          // Limpar texto dos headers removendo elementos internos
          const text = th.textContent?.trim() || '';
          return text.replace(/\s+/g, ' ').trim();
        }).filter(header => header !== '') // Remover headers vazios
      );

      console.log(`📋 Headers encontrados para ${tableName}:`, headers);

      // Verificar se a tabela está vazia (com mensagem "No drivers found !!!")
      const emptyMessage = await page.$eval(`${tableSelector} tbody`, tbody => {
        const emptyCell = tbody.querySelector('.dataTables_empty');
        return emptyCell ? emptyCell.textContent?.trim() : null;
      }).catch(() => null);

      if (emptyMessage && emptyMessage.includes('No drivers found')) {
        console.log(`⚠️ Tabela ${tableName} está vazia: ${emptyMessage}`);
        return {
          name: tableName,
          url: currentUrl,
          headers: headers,
          rows: [],
          isEmpty: true
        };
      }

      // Verificar se há dados na tabela
      const hasData = await page.$$(rowSelector);
      
      if (hasData.length === 0) {
        console.log(`⚠️ Nenhuma linha de dados encontrada em ${tableName}`);
        return {
          name: tableName,
          url: currentUrl,
          headers: headers,
          rows: [],
          isEmpty: true
        };
      }

      // Extrair dados das linhas específicas de drivers
      const rows = await page.$$eval(rowSelector, trs => 
        trs.map(tr => {
          const tds = tr.querySelectorAll('td');
          return Array.from(tds).map(td => {
            // Extrair texto limpo, ignorando elementos filho como spans
            let text = '';
            
            // Verificar se há span com label (status)
            const statusSpan = td.querySelector('span.label');
            if (statusSpan) {
              text = statusSpan.textContent?.trim() || '';
            } else {
              // Para outros campos, pegar todo o texto
              text = td.textContent?.trim() || '';
            }
            
            // Limpar texto extra (como spans ocultos)
            text = text.replace(/\s+/g, ' ').trim();
            return text;
          });
        })
      );

      console.log(`📊 Extraídas ${rows.length} linhas de dados de ${tableName}`);
      
      // Log da primeira linha para debug
      if (rows.length > 0) {
        console.log(`🔍 Primeira linha de exemplo:`, rows[0]);
      }

      return {
        name: tableName,
        url: currentUrl,
        headers: headers,
        rows: rows,
        isEmpty: rows.length === 0
      };

    } catch (error) {
      console.error(`❌ Erro ao extrair dados da tabela ${tableName}:`, error);
      return {
        name: tableName,
        url: currentUrl,
        headers: [],
        rows: [],
        isEmpty: true
      };
    }
  }

  /**
   * Navega diretamente para uma URL sem verificações de login
   * (usado para drivers após login já ter sido confirmado no scraping de rides)
   */
  private async navigateDirectly(url: string): Promise<void> {
    const page = this.sessionManager.getPage();
    if (!page) {
      throw new Error('Browser não está inicializado');
    }

    console.log(`📍 Navegando para: ${url}`);
    
    try {
      // Navegação direta sem verificações de login
      await page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 20000 
      });
    } catch (error) {
      console.log(`⚠️ Timeout com networkidle, tentando com domcontentloaded...`);
      // Se der timeout, tentar com domcontentloaded
      await page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
    }
    
    await page.waitForTimeout(1500);
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Aguarda carregamento específico do Angular
   */
  private async waitForAngularLoad(): Promise<void> {
    const page = this.sessionManager.getPage();
    if (!page) return;

    try {
      // Aguardar Angular carregar (verificação genérica - timeout reduzido)
      await page.waitForFunction(
        () => (window as any).angular && (window as any).angular.element,
        { timeout: 6000 }
      );
      
      // Aguardar dados serem carregados (verificar se há loading spinners - timeout reduzido)
      await page.waitForFunction(
        () => !document.querySelector('.loading, .spinner, [ng-show*="loading"]'),
        { timeout: 3000 }
      ).catch(() => {
        // Ignorar timeout aqui, continuar mesmo se ainda houver loading
      });
      
      // Delay reduzido para garantir
      await this.delay(500);
    } catch (error) {
      console.log('⚠️ Timeout aguardando Angular - continuando...');
    }
  }

  /**
   * Aguarda carregamento específico da página Driver Performance
   */
  /**
   * Extração específica para página Driver Performance
   */
  private async extractPerformanceTableData(tableName: string, currentUrl: string): Promise<DriverTableData> {
    const page = this.sessionManager.getPage();
    if (!page) {
      throw new Error('Browser não está inicializado');
    }

    try {
      console.log('🎯 Iniciando extração específica para Driver Performance...');
      
      // 🔍 PRIMEIRO: Procurar e clicar no botão Search para carregar os dados
      console.log('🔍 Procurando botão Search para carregar dados...');
      
      const searchButtonSelectors = [
        'button.fancyButton[ng-click="High_Cancellation()"]',
        'button[ng-click="High_Cancellation()"]',
        'button.fancyButton:has-text("Search")',
        'button:has-text("Search")',
        '.fancyButton:has-text("Search")'
      ];
      
      let searchButtonFound = false;
      
      for (const selector of searchButtonSelectors) {
        try {
          const button = await page.$(selector);
          if (button) {
            console.log(`🔍 Botão Search encontrado: ${selector}`);
            console.log('⚡ Clicando no botão Search para carregar dados...');
            await button.click();
            searchButtonFound = true;
            
            // Aguardar dados carregarem após o clique
            console.log('⏳ Aguardando carregamento dos dados após clique...');
            await this.delay(3000); // Aguardar 3 segundos para carregar
            break;
          }
        } catch (error) {
          console.log(`⚠️ Seletor de botão ${selector} não funcionou`);
        }
      }
      
      if (!searchButtonFound) {
        console.log('⚠️ Botão Search não encontrado - tentando aguardar dados direto...');
      } else {
        console.log('✅ Botão Search clicado com sucesso!');
      }
      
      // 🔍 SEGUNDO: Aguardar elementos da tabela carregarem
      console.log('🔍 Aguardando tabela Driver Performance carregar...');
      
      // Seletores específicos para Driver Performance baseado no HTML real
      const possibleSelectors = [
        '#datatable2', // ID principal da tabela
        'table#datatable2.table.t-fancy-table.table-striped', // Seletor completo
        '.dataTables_wrapper table#datatable2', // Dentro do wrapper do DataTables
        'table.t-fancy-table.table-striped.dataTable', // Classes da tabela
        '.dataTables_scrollBody table', // Tabela dentro do scroll
        'table[aria-describedby="datatable2_info"]' // Por atributo aria
      ];
      
      let workingSelector = '';
      let tableElement = null;
      
      // Aguardar especificamente elementos da Driver Performance
      try {
        console.log('🔍 Aguardando wrapper da tabela...');
        await page.waitForSelector('#datatable2_wrapper', { timeout: 10000 });
        console.log('✅ Driver Performance: wrapper da tabela encontrado');
        
        // Aguardar dados carregarem (tempo maior após o clique)
        console.log('🔍 Aguardando dados da tabela...');
        await page.waitForSelector('#datatable2 tbody tr', { timeout: 8000 });
        console.log('✅ Driver Performance: dados da tabela carregados');
      } catch (error) {
        console.log('⚠️ Driver Performance: timeout aguardando carregamento, tentando continuar...');
      }
      
      // 🔍 TERCEIRO: Encontrar qual seletor funciona
      for (const selector of possibleSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 3000 });
          tableElement = await page.$(selector);
          if (tableElement) {
            workingSelector = selector;
            console.log(`✅ Driver Performance: usando seletor ${selector}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Seletor ${selector} não encontrado`);
        }
      }
      
      if (!workingSelector || !tableElement) {
        console.log('❌ Nenhuma tabela encontrada na página Driver Performance');
        console.log('🔄 Tentando recarregar a página e repetir o processo...');
        
        try {
          // Usar método reload() nativo do Playwright que é mais confiável
          console.log('⚡ Executando reload forçado da página...');
          await page.reload({ waitUntil: 'networkidle' });
          
          // Aguardar um pouco após o reload
          console.log('⏳ Aguardando página recarregar completamente...');
          await this.delay(4000);
          
          // Verificar se ainda estamos na página correta, se não, navegar novamente
          const reloadUrl = page.url();
          console.log(`🔍 URL após reload: ${reloadUrl}`);
          
          if (!reloadUrl.includes('high-cancellations')) {
            console.log('📍 Navegando novamente para Driver Performance...');
            await page.goto('https://rides.ec2dashboard.com/#/app/high-cancellations/', { waitUntil: 'networkidle' });
            await this.delay(2000);
          }
          
          // SEGUNDA TENTATIVA: Procurar e clicar no botão Search novamente
          console.log('🔍 SEGUNDA TENTATIVA: Procurando botão Search...');
          let searchButtonFound = false;
          
          for (const selector of searchButtonSelectors) {
            try {
              const button = await page.$(selector);
              if (button) {
                console.log(`🔍 Botão Search encontrado (2ª tentativa): ${selector}`);
                console.log('⚡ Clicando no botão Search novamente...');
                await button.click();
                searchButtonFound = true;
                
                // Aguardar dados carregarem após o clique
                console.log('⏳ Aguardando carregamento dos dados (2ª tentativa)...');
                await this.delay(5000); // Mais tempo na segunda tentativa
                break;
              }
            } catch (error) {
              console.log(`⚠️ Seletor de botão ${selector} não funcionou (2ª tentativa)`);
            }
          }
          
          if (searchButtonFound) {
            console.log('✅ Botão Search clicado na segunda tentativa!');
            
            // Tentar encontrar a tabela novamente
            for (const selector of possibleSelectors) {
              try {
                await page.waitForSelector(selector, { timeout: 5000 });
                tableElement = await page.$(selector);
                if (tableElement) {
                  workingSelector = selector;
                  console.log(`✅ Driver Performance: tabela encontrada na 2ª tentativa com seletor ${selector}`);
                  break;
                }
              } catch (error) {
                console.log(`⚠️ Seletor ${selector} não encontrado (2ª tentativa)`);
              }
            }
          }
          
        } catch (reloadError: any) {
          console.log('⚠️ Erro durante reload da página:', reloadError.message || reloadError);
        }
        
        // Se ainda não encontrou a tabela após a segunda tentativa
        if (!workingSelector || !tableElement) {
          console.log('❌ Driver Performance: tabela não encontrada mesmo após reload');
          return {
            name: tableName,
            url: currentUrl,
            headers: [],
            rows: [],
            isEmpty: true
          };
        }
      }
      
      // Aguardar dados carregarem especificamente
      await this.delay(2000);
      
      // Extrair headers
      const headers = await page.$$eval(`${workingSelector} thead th, ${workingSelector} th`, ths => 
        ths.map(th => {
          const text = th.textContent?.trim() || '';
          return text.replace(/\s+/g, ' ').replace(/\n/g, ' ');
        }).filter(text => text.length > 0)
      ).catch(() => {
        console.log('⚠️ Headers não encontrados para Driver Performance');
        return [];
      });
      
      // Extrair dados das linhas usando múltiplos seletores
      const rowSelectors = [
        `${workingSelector} tbody tr[ng-repeat*="data"]`,
        `${workingSelector} tbody tr[ng-repeat*="TableData"]`,
        `${workingSelector} tbody tr`,
        `${workingSelector} tr:not(:first-child)` // fallback
      ];
      
      let rows: string[][] = [];
      
      for (const rowSelector of rowSelectors) {
        try {
          rows = await page.$$eval(rowSelector, trs => 
            trs.map(tr => {
              const cells = tr.querySelectorAll('td');
              return Array.from(cells).map(td => {
                const text = td.textContent?.trim() || '';
                return text.replace(/\s+/g, ' ').replace(/\n/g, ' ');
              }).filter(text => text.length > 0);
            }).filter(row => row.length > 0)
          );
          
          if (rows.length > 0) {
            console.log(`✅ Driver Performance: ${rows.length} linhas extraídas com seletor ${rowSelector}`);
            break;
          }
        } catch (error) {
          console.log(`⚠️ Erro com seletor de linhas ${rowSelector}`);
        }
      }
      
      console.log(`📊 Driver Performance - Headers: ${headers.length}, Rows: ${rows.length}`);
      
      return {
        name: tableName,
        url: currentUrl,
        headers: headers,
        rows: rows,
        isEmpty: rows.length === 0
      };
      
    } catch (error: any) {
      console.error(`❌ Erro na extração específica da Driver Performance:`, error.message);
      return {
        name: tableName,
        url: currentUrl,
        headers: [],
        rows: [],
        isEmpty: true
      };
    }
  }

  /**
   * Processa dados de Driver Performance em formato estruturado
   */
  public processDriverPerformanceData(tableData: DriverTableData): DriverPerformanceData[] {
    const performanceData: DriverPerformanceData[] = [];
    
    if (!tableData || tableData.isEmpty || tableData.rows.length === 0) {
      console.log('⚠️ Nenhum dado de performance para processar');
      return performanceData;
    }

    console.log(`🔄 Processando ${tableData.rows.length} registros de Driver Performance...`);
    
    // Headers esperados da tabela Driver Performance (baseado no HTML fornecido)
    const expectedHeaders = [
      'Driver ID', 'Driver Name', 'Phone Number', 'Request Sent', 'Requests Received',
      'User Cancelled Rides', 'User Cancelled Ride (cash)', 'User Cancelled Ride (wallet)',
      'Driver Cancelled Rides', 'Driver Cancelled Ride (cash)', 'Driver Cancelled Ride (wallet)',
      'Rejected Rides', 'Success Rides', 'Missed Rides', 'Active Days', 'Online Hours',
      'D2C Referral', 'D2D Referral', 'Start End Cheating Rides', 'Manual Start End Cheating Rides',
      'Vehicle'
    ];

    // Verificar se headers correspondem
    console.log(`📋 Headers encontrados: ${tableData.headers.length}`);
    console.log(`📋 Headers esperados: ${expectedHeaders.length}`);
    
    for (const row of tableData.rows) {
      try {
        // Garantir que temos pelo menos os dados mínimos (primeiros 3 campos)
        if (row.length < 3) {
          console.log('⚠️ Linha com dados insuficientes ignorada:', row);
          continue;
        }

        const performance: DriverPerformanceData = {
          driver_id: row[0] || '',
          driver_name: row[1] || '',
          phone_number: row[2] || '',
          request_sent: parseInt(row[3]) || 0,
          requests_received: parseInt(row[4]) || 0,
          user_cancelled_rides: parseInt(row[5]) || 0,
          user_cancelled_ride_cash: parseInt(row[6]) || 0,
          user_cancelled_ride_wallet: parseInt(row[7]) || 0,
          driver_cancelled_rides: parseInt(row[8]) || 0,
          driver_cancelled_ride_cash: parseInt(row[9]) || 0,
          driver_cancelled_ride_wallet: parseInt(row[10]) || 0,
          rejected_rides: parseInt(row[11]) || 0,
          success_rides: parseInt(row[12]) || 0,
          missed_rides: parseInt(row[13]) || 0,
          active_days: parseInt(row[14]) || 0,
          online_hours: parseFloat(row[15]) || 0,
          d2c_referral: parseInt(row[16]) || 0,
          d2d_referral: parseInt(row[17]) || 0,
          start_end_cheating_rides: parseInt(row[18]) || 0,
          manual_start_end_cheating_rides: parseInt(row[19]) || 0,
          vehicle: row[20] || ''
        };

        // Validar dados mínimos
        if (performance.driver_id && performance.driver_name) {
          performanceData.push(performance);
        } else {
          console.log('⚠️ Registro inválido ignorado - falta ID ou nome:', performance);
        }

      } catch (error: any) {
        console.log('❌ Erro processando linha de performance:', error.message, row);
      }
    }

    console.log(`✅ ${performanceData.length} registros de Driver Performance processados`);
    return performanceData;
  }

  /**
   * Obtém as páginas de drivers configuradas
   */
  public getDriversPages(): Array<{name: string, url: string}> {
    return this.driversPages;
  }

  /**
   * Fecha a sessão do browser (compartilhada com rides)
   */
  public async cleanup(): Promise<void> {
    console.log('🧹 Cleanup de drivers (sessão compartilhada)...');
    // Não fechamos o browser aqui pois é compartilhado com rides
  }
}

/**
 * Função principal para scraping de drivers (interface compatível com rides)
 */
export async function scrapeAllDriversDataPersistent(): Promise<DriverScrapeResult> {
  const scraper = new DriversPersistentScraper();
  return await scraper.scrapeAllDriversData();
}
