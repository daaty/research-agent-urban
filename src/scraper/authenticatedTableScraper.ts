import { chromium, Browser, Page } from 'playwright';
import { AuthCredentials, TableSelectors, TableData, AuthenticatedScrapeResult } from '../types/tableTypes';

export class AuthenticatedTableScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  async initialize(headless: boolean = false): Promise<void> {
    this.browser = await chromium.launch({
      headless,
      slowMo: 50
    });
    this.page = await this.browser.newPage();
  }

  async login(credentials: AuthCredentials): Promise<boolean> {
    if (!this.page) throw new Error('Scraper not initialized');

    try {
      // Navegar para a página de login (se especificada) ou usar a URL atual
      if (credentials.loginUrl) {
        await this.page.goto(credentials.loginUrl, { waitUntil: 'networkidle' });
      }

      // Preencher credenciais
      await this.page.fill(credentials.usernameSelector, credentials.username);
      await this.page.fill(credentials.passwordSelector, credentials.password);

      // Fazer login
      await this.page.click(credentials.submitSelector);
      
      // Aguardar redirecionamento após login
      await this.page.waitForTimeout(3000);
      
      // Verificar se o login foi bem-sucedido (você pode ajustar esta lógica)
      const currentUrl = this.page.url();
      const hasLoginError = await this.page.$('.error, .alert-danger, [class*="error"]');
      
      return !hasLoginError;
    } catch (error) {
      console.error('Erro durante o login:', error);
      return false;
    }
  }

  async scrapeTablesFromPage(
    url: string, 
    tableSelectors: TableSelectors,
    manualLogin: boolean = false
  ): Promise<AuthenticatedScrapeResult> {
    if (!this.page) throw new Error('Scraper not initialized');

    await this.page.goto(url, { waitUntil: 'networkidle' });

    if (manualLogin) {
      console.log("🛑 Faça o login manualmente na página aberta. Aguardando 60 segundos...");
      await this.page.waitForTimeout(60000);
    }

    // Aguardar as tabelas carregarem
    await this.page.waitForTimeout(2000);

    const tables = await this.extractTables(tableSelectors);

    return {
      url,
      timestamp: new Date().toISOString(),
      tables,
      totalTables: tables.length,
      emptyTables: tables.filter(table => table.isEmpty).length
    };
  }

  private async extractTables(selectors: TableSelectors): Promise<TableData[]> {
    if (!this.page) throw new Error('Page not available');

    // Encontrar todas as tabelas na página
    const tableElements = await this.page.$$(selectors.tableSelector);
    console.log(`Encontradas ${tableElements.length} tabelas na página`);

    const tables: TableData[] = [];

    for (let i = 0; i < tableElements.length; i++) {
      const tableElement = tableElements[i];
      
      try {
        // Extrair headers
        const headerSelector = selectors.headerSelector || 'thead tr th, thead tr td, tr:first-child th, tr:first-child td';
        const headers = await tableElement.$$eval(headerSelector, (elements) => 
          elements.map(el => el.textContent?.trim() || '')
        ).catch(() => []);

        // Extrair rows (excluindo header se necessário)
        const rowSelector = selectors.rowSelector || 'tbody tr, tr';
        const rows = await tableElement.$$eval(rowSelector, (elements, hasHeaders) => {
          // Se temos headers, pular a primeira linha
          const startIndex = hasHeaders ? 1 : 0;
          return elements.slice(startIndex).map(row => {
            const cells = row.querySelectorAll('td, th');
            return Array.from(cells).map(cell => cell.textContent?.trim() || '');
          });
        }, headers.length > 0).catch(() => []);

        const isEmpty = rows.length === 0 || rows.every(row => row.every(cell => !cell));

        const tableData: TableData = {
          headers,
          rows,
          isEmpty,
          tableName: selectors.tableNames?.[i] || `Tabela ${i + 1}`
        };

        tables.push(tableData);
        console.log(`Tabela ${i + 1}: ${headers.length} colunas, ${rows.length} linhas, vazia: ${isEmpty}`);

      } catch (error) {
        console.error(`Erro ao processar tabela ${i + 1}:`, error);
        tables.push({
          headers: [],
          rows: [],
          isEmpty: true,
          tableName: selectors.tableNames?.[i] || `Tabela ${i + 1} (erro)`
        });
      }
    }

    return tables;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

// Função utilitária para uso simples
export async function scrapeAuthenticatedTables(
  url: string,
  credentials: AuthCredentials | null,
  tableSelectors: TableSelectors,
  options: { headless?: boolean; manualLogin?: boolean } = {}
): Promise<AuthenticatedScrapeResult> {
  const scraper = new AuthenticatedTableScraper();
  
  try {
    await scraper.initialize(options.headless || false);
    
    if (credentials && !options.manualLogin) {
      const loginSuccess = await scraper.login(credentials);
      if (!loginSuccess) {
        throw new Error('Falha no login automático');
      }
    }

    const result = await scraper.scrapeTablesFromPage(url, tableSelectors, options.manualLogin);
    return result;
    
  } finally {
    await scraper.close();
  }
}
