import { chromium, Browser, Page } from 'playwright';

export interface RidesTableData {
  tableName: string;
  headers: string[];
  rows: string[][];
  isEmpty: boolean;
}

export interface RidesScrapingResult {
  success: boolean;
  message: string;
  tables: RidesTableData[];
  scrapedAt: string;
}

export class RidesDashboardScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  constructor(
    private loginUrl: string = process.env.RIDES_LOGIN_URL || '',
    private email: string = process.env.RIDES_EMAIL || '',
    private password: string = process.env.RIDES_PASSWORD || '',
    private timeout: number = parseInt(process.env.SCRAPER_TIMEOUT || '30000'),
    private headless: boolean = process.env.HEADLESS_MODE === 'true'
  ) {}

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: this.headless,
      slowMo: 50
    });
    this.page = await this.browser.newPage();
    
    // Configurar timeout padrão
    this.page.setDefaultTimeout(this.timeout);
  }

  async login(): Promise<boolean> {
    if (!this.page) throw new Error('Scraper não foi inicializado');

    try {
      console.log('🔄 Navegando para a página de login...');
      await this.page.goto(this.loginUrl, { waitUntil: 'networkidle' });

      // Aguardar um momento para a página carregar completamente
      await this.page.waitForTimeout(2000);

      console.log('🔍 Procurando campos de login...');
      
      // Tentar diferentes seletores comuns para email/username
      const emailSelectors = [
        'input[type="email"]',
        'input[name="email"]',
        'input[name="username"]',
        'input[id="email"]',
        'input[id="username"]',
        'input[placeholder*="email" i]',
        'input[placeholder*="usuário" i]'
      ];

      const passwordSelectors = [
        'input[type="password"]',
        'input[name="password"]',
        'input[id="password"]',
        'input[placeholder*="senha" i]',
        'input[placeholder*="password" i]'
      ];

      let emailField = null;
      let passwordField = null;

      // Procurar campo de email
      for (const selector of emailSelectors) {
        try {
          emailField = await this.page.waitForSelector(selector, { timeout: 5000 });
          if (emailField) {
            console.log(`✅ Campo de email encontrado: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      // Procurar campo de senha
      for (const selector of passwordSelectors) {
        try {
          passwordField = await this.page.waitForSelector(selector, { timeout: 5000 });
          if (passwordField) {
            console.log(`✅ Campo de senha encontrado: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!emailField || !passwordField) {
        console.log('❌ Não foi possível encontrar os campos de login');
        console.log('🔍 Elementos disponíveis na página:');
        
        // Debug: listar inputs disponíveis
        const inputs = await this.page.$$eval('input', elements => 
          elements.map(el => ({
            type: el.type,
            name: el.name,
            id: el.id,
            placeholder: el.placeholder,
            className: el.className
          }))
        );
        console.log(inputs);
        
        return false;
      }

      console.log('🔐 Preenchendo credenciais...');
      await emailField.fill(this.email);
      await passwordField.fill(this.password);

      // Procurar botão de login
      const loginButtonSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:has-text("Login")',
        'button:has-text("Entrar")',
        'button:has-text("Sign in")',
        '.login-button',
        '#login-button',
        'button[name="login"]'
      ];

      let loginButton = null;
      for (const selector of loginButtonSelectors) {
        try {
          loginButton = await this.page.waitForSelector(selector, { timeout: 3000 });
          if (loginButton) {
            console.log(`✅ Botão de login encontrado: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!loginButton) {
        console.log('❌ Botão de login não encontrado, tentando Enter...');
        await passwordField.press('Enter');
      } else {
        await loginButton.click();
      }

      console.log('⏳ Aguardando redirecionamento após login...');
      
      // Aguardar navegação ou mudança na URL
      try {
        await this.page.waitForNavigation({ timeout: 10000 });
        console.log('✅ Login realizado com sucesso!');
        return true;
      } catch (e) {
        // Se não houve navegação, verificar se houve mudança no conteúdo
        await this.page.waitForTimeout(3000);
        const currentUrl = this.page.url();
        
        if (!currentUrl.includes('login')) {
          console.log('✅ Login aparentemente realizado (URL mudou)!');
          return true;
        } else {
          console.log('❌ Login pode ter falhado - ainda na página de login');
          return false;
        }
      }

    } catch (error) {
      console.error('❌ Erro durante o login:', error);
      return false;
    }
  }

  async scrapeTablesFromPage(pageUrl?: string): Promise<RidesTableData[]> {
    if (!this.page) throw new Error('Scraper não foi inicializado');

    try {
      if (pageUrl) {
        console.log(`🔄 Navegando para: ${pageUrl}`);
        await this.page.goto(pageUrl, { waitUntil: 'networkidle' });
        await this.page.waitForTimeout(3000);
      }

      console.log('🔍 Procurando tabelas na página...');
      
      // Aguardar possíveis tabelas carregarem
      await this.page.waitForTimeout(2000);

      const tables = await this.page.$$eval('table', (tableElements) => {
        return tableElements.map((table, index) => {
          const tableName = `Tabela_${index + 1}`;
          
          // Extrair headers
          const headerElements = table.querySelectorAll('thead tr th, thead tr td, tr:first-child th, tr:first-child td');
          const headers = Array.from(headerElements).map(th => th.textContent?.trim() || '');
          
          // Extrair linhas de dados
          const bodyRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
          const rows = Array.from(bodyRows).map(row => {
            const cells = row.querySelectorAll('td, th');
            return Array.from(cells).map(cell => cell.textContent?.trim() || '');
          }).filter(row => row.some(cell => cell.length > 0)); // Filtrar linhas vazias
          
          return {
            tableName,
            headers: headers.length > 0 ? headers : [`Coluna_1`, `Coluna_2`, `Coluna_3`, `Coluna_4`, `Coluna_5`],
            rows,
            isEmpty: rows.length === 0
          };
        });
      });

      console.log(`✅ Encontradas ${tables.length} tabelas`);
      
      // Limitar a 5 tabelas conforme solicitado
      const limitedTables = tables.slice(0, 5);
      
      limitedTables.forEach((table, index) => {
        console.log(`📊 ${table.tableName}: ${table.rows.length} linhas ${table.isEmpty ? '(vazia)' : ''}`);
      });

      return limitedTables;

    } catch (error) {
      console.error('❌ Erro durante scraping das tabelas:', error);
      throw error;
    }
  }

  async scrapeRidesDashboard(targetPageUrl?: string): Promise<RidesScrapingResult> {
    try {
      await this.initialize();
      
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        return {
          success: false,
          message: 'Falha no login',
          tables: [],
          scrapedAt: new Date().toISOString()
        };
      }

      const tables = await this.scrapeTablesFromPage(targetPageUrl);

      return {
        success: true,
        message: `Scraping concluído com sucesso. ${tables.length} tabelas encontradas.`,
        tables,
        scrapedAt: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Erro geral durante scraping:', error);
      return {
        success: false,
        message: `Erro durante scraping: ${error}`,
        tables: [],
        scrapedAt: new Date().toISOString()
      };
    } finally {
      await this.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

// Função de conveniência para uso rápido
export async function scrapeRidesDashboard(targetPageUrl?: string): Promise<RidesScrapingResult> {
  const scraper = new RidesDashboardScraper();
  return await scraper.scrapeRidesDashboard(targetPageUrl);
}
