import { BrowserSessionManager } from '../services/browserSessionManager';
import { DriverCacheManager } from '../services/driverCacheManager';

export interface DriverTableData {
  name: string;
  url: string;
  headers: string[];
  rows: string[][];
  isEmpty: boolean;
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
    this.sessionManager = BrowserSessionManager.getInstance();
    this.cacheManager = DriverCacheManager.getInstance();
    
    // Extrair domínio base da URL de login (sem barra final)
    const loginUrl = process.env.RIDES_LOGIN_URL || 'https://rides.ec2dashboard.com/#/page/login';
    this.baseUrl = loginUrl.split('#')[0].replace(/\/$/, ''); // Remove barra final se existir
    
    // URLs das páginas de drivers baseado no domínio (URLs corretas)
    this.driversPages = [
      { name: 'Active Drivers', url: `${this.baseUrl}/#/app/active-drivers//` },
      { name: 'Deactive Drivers', url: `${this.baseUrl}/#/app/deactivated-drivers/` },
      { name: 'Drivers Enrollment', url: `${this.baseUrl}#/app/selfEnrolled-driver//` },
      { name: 'Leaderboard', url: `${this.baseUrl}#/app/driver-leaderboard/` }
      // DESABILITADO TEMPORARIAMENTE: Driver Performance tem problemas no carregamento da tabela
      // { name: 'Driver Performance', url: `${this.baseUrl}#/app/high-cancellations/` }
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
          
          // Aguardar página carregar (reduzido para otimizar velocidade)
          await this.delay(1500);
          
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
        tableSelector = '#datatable2';
        rowSelector = '#datatable2 tbody tr[ng-repeat*="data in TableData"]';
      } else {
        // Fallback genérico para outras páginas
        tableSelector = 'table.t-fancy-table';
        rowSelector = 'table.t-fancy-table tbody tr[ng-repeat*="data in displayData"]';
      }
      
      console.log(`🔍 Usando seletor: ${tableSelector} para ${tableName}`);
      
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
