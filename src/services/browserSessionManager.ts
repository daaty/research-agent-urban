import { Browser, Page, chromium, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';

export interface SessionData {
  isLoggedIn: boolean;
  loginTimestamp: number;
  sessionExpiry: number;
  userData: any;
}

export class BrowserSessionManager {
  private static instance: BrowserSessionManager;
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private sessionData: SessionData;
  private sessionFilePath: string;
  private userDataDir: string;
  private isHeadless: boolean;
  
  // URLs de configuração
  private loginUrl: string = 'https://rides.ec2dashboard.com/#/page/login';
  private email: string = 'herbert@urbandobrasil.com.br';
  private password: string = 'herbert@urban25';
  
  private constructor() {
    this.isHeadless = process.env.HEADLESS_MODE === 'true';
    this.userDataDir = path.join(process.cwd(), 'browser-data');
    this.sessionFilePath = path.join(process.cwd(), 'session-data.json');
    this.sessionData = this.loadSessionData();
    
    // Garantir que o diretório de dados do browser existe
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }
  }

  public static getInstance(): BrowserSessionManager {
    if (!BrowserSessionManager.instance) {
      BrowserSessionManager.instance = new BrowserSessionManager();
    }
    return BrowserSessionManager.instance;
  }

  /**
   * Carrega dados da sessão do arquivo local
   */
  private loadSessionData(): SessionData {
    try {
      if (fs.existsSync(this.sessionFilePath)) {
        const data = fs.readFileSync(this.sessionFilePath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.log('⚠️ Erro ao carregar dados da sessão, criando nova sessão');
    }
    
    return {
      isLoggedIn: false,
      loginTimestamp: 0,
      sessionExpiry: 0,
      userData: null
    };
  }

  /**
   * Salva dados da sessão no arquivo local
   */
  private saveSessionData(): void {
    try {
      fs.writeFileSync(this.sessionFilePath, JSON.stringify(this.sessionData, null, 2));
    } catch (error) {
      console.error('❌ Erro ao salvar dados da sessão:', error);
    }
  }

  /**
   * Verifica se a sessão ainda é válida (não expirou)
   */
  private isSessionValid(): boolean {
    const now = Date.now();
    return this.sessionData.isLoggedIn && 
           this.sessionData.sessionExpiry > now &&
           (now - this.sessionData.loginTimestamp) < (2 * 60 * 60 * 1000); // 2 horas
  }
  /**
   * Inicializa o navegador com dados persistentes
   */
  public async initializeBrowser(): Promise<void> {
    if (this.context && this.page) {
      // Verificar se o context ainda está ativo
      try {
        await this.page.title(); // Teste se a página ainda responde
        console.log('✅ Browser já inicializado e ativo');
        return;
      } catch (error) {
        // Context/Page não está mais válido, reinicializar
        console.log('⚠️ Sessão anterior inválida, reinicializando...');
      }
    }

    console.log('🚀 Inicializando browser com persistência...');
    
    try {
      this.context = await chromium.launchPersistentContext(this.userDataDir, {
        headless: this.isHeadless,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding'
        ],
        viewport: { width: 1366, height: 768 }
      });

      // Pegar a página existente ou criar uma nova
      const pages = this.context.pages();
      this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
      
      console.log('✅ Browser inicializado com sucesso');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar browser:', error);
      throw error;
    }
  }
  /**
   * Verifica e executa login se necessário
   */
  public async ensureLogin(): Promise<boolean> {
    if (!this.context || !this.page) {
      await this.initializeBrowser();
    }

    // Verificar se já está logado e sessão é válida
    if (this.isSessionValid()) {
      console.log('✅ Sessão válida encontrada, pulando login');
      
      // Verificar se ainda está na página correta
      const currentUrl = this.page!.url();
      if (!currentUrl.includes('login')) {
        return true;
      }
    }

    console.log('🔑 Realizando login...');
    return await this.performLogin();
  }

  /**
   * Executa o processo de login
   */
  private async performLogin(): Promise<boolean> {
    try {
      console.log('📍 Navegando para página de login...');
      await this.page!.goto(this.loginUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      await this.page!.waitForTimeout(3000);

      // Preencher credenciais
      console.log('📝 Preenchendo credenciais...');
      await this.page!.fill('#exampleInputEmail1', this.email);
      await this.page!.fill('#exampleInputPassword1', this.password);

      // Fazer login
      console.log('🚪 Fazendo login...');
      await this.page!.press('#exampleInputPassword1', 'Enter');
      await this.page!.waitForTimeout(8000);

      // Verificar se login foi bem-sucedido
      const currentUrl = this.page!.url();
      const isLoggedIn = !currentUrl.includes('login');

      if (isLoggedIn) {
        // Atualizar dados da sessão
        const now = Date.now();
        this.sessionData = {
          isLoggedIn: true,
          loginTimestamp: now,
          sessionExpiry: now + (2 * 60 * 60 * 1000), // 2 horas de validade
          userData: { email: this.email }
        };
        this.saveSessionData();
        
        console.log('✅ Login realizado com sucesso!');
        return true;
      } else {
        console.log('❌ Falha no login - ainda na página de login');
        return false;
      }

    } catch (error) {
      console.error('❌ Erro durante login:', error);
      return false;
    }
  }
  /**
   * Navega para uma página específica
   */
  public async navigateToPage(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser não está inicializado');
    }

    console.log(`📍 Navegando para: ${url}`);
    
    try {
      // Tentar com networkidle primeiro
      await this.page.goto(url, { 
        waitUntil: 'networkidle',
        timeout: 20000 
      });
    } catch (error) {
      console.log(`⚠️ Timeout com networkidle, tentando com domcontentloaded...`);
      // Se der timeout, tentar com domcontentloaded
      await this.page.goto(url, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
    }
    
    await this.page.waitForTimeout(3000);
  }

  /**
   * Extrai dados de uma tabela na página atual
   */
  public async extractTableData(tableName: string): Promise<{
    name: string;
    url: string;
    headers: string[];
    rows: string[][];
    isEmpty: boolean;
  }> {
    if (!this.page) {
      throw new Error('Browser não está inicializado');
    }

    const currentUrl = this.page.url();

    try {
      // Tentar encontrar a tabela
      const tableExists = await this.page.$('table.t-fancy-table');
      
      if (!tableExists) {
        return {
          name: tableName,
          url: currentUrl,
          headers: [],
          rows: [],
          isEmpty: true
        };
      }

      // Extrair headers
      const headers = await this.page.$$eval('table.t-fancy-table thead th', ths => 
        ths.map(th => th.textContent?.trim() || '')
      );

      // Verificar se há dados na tabela
      const noDataMessage = await this.page.$('td.dataTables_empty');
      
      if (noDataMessage) {
        return {
          name: tableName,
          url: currentUrl,
          headers: headers,
          rows: [],
          isEmpty: true
        };
      }

      // Extrair dados das linhas
      let rows = await this.page.$$eval('table.t-fancy-table tbody tr:not(.odd):not(.even)', trs => 
        trs.map(tr => {
          const tds = tr.querySelectorAll('td');
          return Array.from(tds).map(td => td.textContent?.trim() || '');
        })
      );

      // Se não encontrou linhas, tentar outro seletor
      if (rows.length === 0) {
        rows = await this.page.$$eval('table.t-fancy-table tbody tr', trs => 
          trs.map(tr => {
            const tds = tr.querySelectorAll('td');
            return Array.from(tds).map(td => td.textContent?.trim() || '');
          })
        );
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
   * Obtém a página atual para operações customizadas
   */
  public getPage(): Page | null {
    return this.page;
  }
  /**
   * Verifica se o browser está ativo
   */
  public isActive(): boolean {
    return this.context !== null && this.page !== null;
  }

  /**
   * Limpa dados da sessão
   */
  public clearSession(): void {
    this.sessionData = {
      isLoggedIn: false,
      loginTimestamp: 0,
      sessionExpiry: 0,
      userData: null
    };
    this.saveSessionData();
    
    // Remover arquivo de sessão
    if (fs.existsSync(this.sessionFilePath)) {
      fs.unlinkSync(this.sessionFilePath);
    }
  }
  /**
   * Fecha o navegador (só usar quando realmente necessário)
   */
  public async closeBrowser(): Promise<void> {
    if (this.context) {
      console.log('🔒 Fechando navegador...');
      await this.context.close();
      this.context = null;
      this.page = null;
    }
  }

  /**
   * Força um novo login (limpa cache e faz login novamente)
   */
  public async forceRelogin(): Promise<boolean> {
    console.log('🔄 Forçando novo login...');
    this.clearSession();
    return await this.ensureLogin();
  }
}
