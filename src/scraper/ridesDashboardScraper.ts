import puppeteer, { Browser, Page } from 'puppeteer';
import { BrowserSessionManager } from '../browser/browserSessionManager.js';

/**
 * Scraper específico para o dashboard do Rides
 * Realiza login, verifica cidade e extrai dados de motoristas
 */
export class RidesDashboardScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private sessionManager: BrowserSessionManager;
  private currentCity: string = '';

  constructor() {
    this.sessionManager = BrowserSessionManager.getInstance();
  }

  /**
   * Inicializa o navegador e faz login
   */
  async initialize(): Promise<void> {
    console.log('🚀 Inicializando scraper do Rides Dashboard...');
    
    try {
      // Usar o BrowserSessionManager para obter navegador configurado
      this.browser = await this.sessionManager.getBrowser();
      this.page = await this.browser.newPage();

      // Configurar page
      await this.page.setViewport({ width: 1366, height: 768 });
      await this.page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      console.log('✅ Navegador inicializado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao inicializar navegador:', error);
      throw error;
    }
  }

  /**
   * Realiza login no dashboard do Rides
   */
  async login(): Promise<boolean> {
    if (!this.page) {
      throw new Error('Página não inicializada');
    }

    const loginUrl = process.env.RIDES_LOGIN_URL || 'https://rides.ec2dashboard.com/#/page/login';
    const username = process.env.RIDES_USERNAME;
    const password = process.env.RIDES_PASSWORD;

    if (!username || !password) {
      throw new Error('Credenciais não configuradas nas variáveis de ambiente');
    }

    console.log('🔐 Iniciando login no Rides Dashboard...');
    console.log(`📍 URL: ${loginUrl}`);

    try {
      // Navegar para página de login
      await this.page.goto(loginUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      console.log('⏳ Aguardando campos de login aparecerem...');
      
      // Aguardar campos de login (usando seletores comuns)
      await this.page.waitForSelector('input[type="text"], input[type="email"], input[name="username"], input[name="email"]', {
        timeout: 15000
      });

      await this.page.waitForSelector('input[type="password"], input[name="password"]', {
        timeout: 15000
      });

      console.log('📝 Preenchendo credenciais...');

      // Preencher username (tentar diferentes seletores)
      const usernameSelectors = [
        'input[name="username"]',
        'input[name="email"]', 
        'input[type="email"]',
        'input[type="text"]'
      ];

      let usernameFound = false;
      for (const selector of usernameSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await element.type(username, { delay: 100 });
            usernameFound = true;
            console.log(`✅ Username preenchido via seletor: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!usernameFound) {
        throw new Error('Campo de username não encontrado');
      }

      // Preencher password
      const passwordSelectors = [
        'input[name="password"]',
        'input[type="password"]'
      ];

      let passwordFound = false;
      for (const selector of passwordSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            await element.type(password, { delay: 100 });
            passwordFound = true;
            console.log(`✅ Password preenchido via seletor: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!passwordFound) {
        throw new Error('Campo de password não encontrado');
      }

      console.log('🔄 Procurando botão de login...');

      // Procurar e clicar no botão de login
      const loginButtonSelectors = [
        'button[type="submit"]',
        'input[type="submit"]',
        'button:contains("Login")',
        'button:contains("Entrar")',
        '.btn-login',
        '#loginButton',
        '[ng-click*="login"]'
      ];

      let loginClicked = false;
      for (const selector of loginButtonSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element) {
            await element.click();
            loginClicked = true;
            console.log(`✅ Botão de login clicado via seletor: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!loginClicked) {
        // Tentar pressionar Enter como fallback
        await this.page.keyboard.press('Enter');
        console.log('⚡ Tentativa de login via Enter');
      }

      console.log('⏳ Aguardando redirecionamento após login...');

      // Aguardar redirecionamento para dashboard
      try {
        await this.page.waitForFunction(
          () => {
            return window.location.href.includes('/app/dashboard/') || 
                   window.location.href.includes('/dashboard') ||
                   document.querySelector('.dashboard') !== null ||
                   document.querySelector('[ng-controller*="dashboard"]') !== null;
          },
          { timeout: 30000 }
        );

        console.log('✅ Login realizado com sucesso!');
        console.log(`📍 URL atual: ${this.page.url()}`);
        return true;

      } catch (timeoutError) {
        // Verificar se houve erro de login
        const currentUrl = this.page.url();
        console.log(`⚠️ URL após tentativa de login: ${currentUrl}`);

        // Verificar se ainda está na página de login (possível erro)
        if (currentUrl.includes('/login') || currentUrl.includes('/page/login')) {
          console.log('❌ Ainda na página de login - possível erro de credenciais');
          
          // Tentar detectar mensagem de erro
          try {
            const errorElement = await this.page.$('.error, .alert-danger, .text-danger, [class*="error"]');
            if (errorElement) {
              const errorText = await errorElement.textContent();
              console.log(`🚨 Mensagem de erro detectada: ${errorText}`);
            }
          } catch (e) {
            console.log('⚠️ Não foi possível detectar mensagem de erro específica');
          }

          return false;
        }

        // Se não está na página de login, assumir que o login foi bem-sucedido
        console.log('✅ Login aparentemente bem-sucedido (fora da página de login)');
        return true;
      }

    } catch (error) {
      console.error('❌ Erro durante login:', error);
      return false;
    }
  }

  /**
   * Detecta a cidade atual do dashboard
   */
  async detectCity(): Promise<string> {
    if (!this.page) {
      throw new Error('Página não inicializada');
    }

    console.log('🏙️ Detectando cidade do dashboard...');

    try {
      // Navegar para página de active drivers para detectar cidade
      const activeDriversUrl = process.env.RIDES_ACTIVE_DRIVERS_URL || 
        'https://rides.ec2dashboard.com/#/app/active-drivers/';
      
      console.log(`📍 Navegando para: ${activeDriversUrl}`);
      await this.page.goto(activeDriversUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      console.log('🔍 Procurando elemento da cidade...');

      // Aguardar elemento da cidade aparecer
      await this.page.waitForSelector('.select2-chosen, [class*="select"], [class*="city"]', {
        timeout: 15000
      });

      // Tentar diferentes seletores para encontrar a cidade
      const citySelectors = [
        'span.select2-chosen .ng-binding',
        '.select2-chosen .ng-scope',
        '.select2-chosen span',
        '.select2-chosen',
        '[ng-transclude] .ng-binding',
        '.city-name',
        '[class*="city"] .ng-binding'
      ];

      for (const selector of citySelectors) {
        try {
          const cityElement = await this.page.$(selector);
          if (cityElement) {
            const cityText = await cityElement.textContent();
            if (cityText && cityText.trim() && cityText.trim() !== '') {
              this.currentCity = cityText.trim();
              console.log(`✅ Cidade detectada: ${this.currentCity}`);
              return this.currentCity;
            }
          }
        } catch (e) {
          continue;
        }
      }

      // Se não encontrou via seletores específicos, tentar buscar por texto
      try {
        const cityText = await this.page.evaluate(() => {
          // Procurar por elementos que podem conter o nome da cidade
          const possibleElements = document.querySelectorAll(
            '.select2-chosen, .ng-binding, .city, [class*="city"], [class*="select"]'
          );
          
          for (const element of possibleElements) {
            const text = element.textContent?.trim();
            if (text && text.length > 2 && text.length < 50 && 
                !text.includes('Select') && !text.includes('Choose')) {
              return text;
            }
          }
          
          return null;
        });

        if (cityText) {
          this.currentCity = cityText;
          console.log(`✅ Cidade detectada via busca geral: ${this.currentCity}`);
          return this.currentCity;
        }
      } catch (e) {
        console.log('⚠️ Erro na busca geral por cidade:', e);
      }

      console.log('⚠️ Não foi possível detectar a cidade automaticamente');
      this.currentCity = 'Cidade Não Detectada';
      return this.currentCity;

    } catch (error) {
      console.error('❌ Erro ao detectar cidade:', error);
      this.currentCity = 'Erro na Detecção';
      return this.currentCity;
    }
  }

  /**
   * Navega para o dashboard e busca dados de um motorista
   */
  async getDriverData(driverId: string): Promise<any> {
    if (!this.page) {
      throw new Error('Página não inicializada');
    }

    console.log(`🔍 Buscando dados do motorista: ${driverId}`);

    try {
      // Navegar para dashboard
      const dashboardUrl = process.env.RIDES_DASHBOARD_URL || 
        'https://rides.ec2dashboard.com/#/app/dashboard/';
      
      console.log(`📍 Navegando para dashboard: ${dashboardUrl}`);
      await this.page.goto(dashboardUrl, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });

      console.log('⏳ Aguardando campo de busca aparecer...');

      // Aguardar campo de input do driver ID
      await this.page.waitForSelector('#driverId, input[placeholder*="User ID"], input[placeholder*="Phone"], input[placeholder*="Email"]', {
        timeout: 15000
      });

      // Encontrar e preencher campo de driver ID
      const driverIdInput = await this.page.$('#driverId') || 
        await this.page.$('input[placeholder*="User ID"]') ||
        await this.page.$('input[placeholder*="Phone"]') ||
        await this.page.$('input[placeholder*="Email"]');

      if (!driverIdInput) {
        throw new Error('Campo de driver ID não encontrado');
      }

      console.log('📝 Preenchendo ID do motorista...');
      await driverIdInput.click();
      await driverIdInput.type(driverId, { delay: 100 });

      console.log('🔍 Procurando botão "Details Driver"...');

      // Procurar botão "Details Driver"
      const detailsButtonSelectors = [
        'button:contains("Details Driver")',
        '[ng-click="getDriverInfo"]',
        '[ng-click*="getDriverInfo"]',
        '.driver-button button',
        'button[type="submit"]'
      ];

      let buttonFound = false;
      for (const selector of detailsButtonSelectors) {
        try {
          const button = await this.page.$(selector);
          if (button) {
            console.log(`✅ Botão encontrado via seletor: ${selector}`);
            await button.click();
            buttonFound = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (!buttonFound) {
        // Tentar pressionar Enter como fallback
        await this.page.keyboard.press('Enter');
        console.log('⚡ Tentativa de busca via Enter');
      }

      console.log('⏳ Aguardando dados do motorista carregarem...');

      // Aguardar dados aparecerem (aguardar um tempo para o carregamento)
      await this.page.waitForTimeout(3000);

      // Extrair dados do motorista
      const driverData = await this.page.evaluate(() => {
        // Tentar extrair dados da página
        const data: any = {
          timestamp: new Date().toISOString(),
          driverId: '',
          name: '',
          phone: '',
          email: '',
          status: '',
          city: '',
          additionalInfo: {}
        };

        // Procurar por elementos que contêm dados do motorista
        const textElements = document.querySelectorAll('*');
        const allText: string[] = [];
        
        textElements.forEach(element => {
          const text = element.textContent?.trim();
          if (text && text.length > 0 && text.length < 200) {
            allText.push(text);
          }
        });

        // Tentar extrair informações específicas
        try {
          // Procurar por padrões de dados
          allText.forEach(text => {
            // Nome (geralmente depois de "Name:" ou similar)
            if (text.match(/name\s*:?\s*(.+)/i)) {
              const match = text.match(/name\s*:?\s*(.+)/i);
              if (match && match[1]) data.name = match[1].trim();
            }
            
            // Telefone
            if (text.match(/phone\s*:?\s*(.+)/i) || text.match(/\+?[\d\s\-\(\)]{8,}/)) {
              const match = text.match(/phone\s*:?\s*(.+)/i) || text.match(/\+?[\d\s\-\(\)]{8,}/);
              if (match) data.phone = match[0].trim();
            }
            
            // Email
            if (text.match(/email\s*:?\s*(.+)/i) || text.match(/[\w\.-]+@[\w\.-]+\.\w+/)) {
              const match = text.match(/email\s*:?\s*(.+)/i) || text.match(/[\w\.-]+@[\w\.-]+\.\w+/);
              if (match) data.email = match[0].trim();
            }
            
            // Status
            if (text.match(/status\s*:?\s*(.+)/i)) {
              const match = text.match(/status\s*:?\s*(.+)/i);
              if (match && match[1]) data.status = match[1].trim();
            }
          });

          // Capturar todo o conteúdo visível como backup
          data.rawContent = allText.join(' | ');
          
        } catch (error) {
          console.error('Erro ao extrair dados:', error);
        }

        return data;
      });

      // Adicionar informações do contexto
      driverData.driverId = driverId;
      driverData.city = this.currentCity;
      driverData.url = this.page.url();

      console.log('✅ Dados do motorista extraídos:', JSON.stringify(driverData, null, 2));
      return driverData;

    } catch (error) {
      console.error('❌ Erro ao buscar dados do motorista:', error);
      return {
        driverId,
        city: this.currentCity,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Executa o processo completo: login → detectar cidade → buscar motorista
   */
  async scrapeDriverData(driverId: string): Promise<any> {
    console.log(`🚀 Iniciando scraping completo para motorista: ${driverId}`);

    try {
      // 1. Inicializar navegador
      await this.initialize();

      // 2. Fazer login
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        throw new Error('Falha no login');
      }

      // 3. Detectar cidade
      await this.detectCity();

      // 4. Buscar dados do motorista
      const driverData = await this.getDriverData(driverId);

      console.log('✅ Scraping completo realizado com sucesso!');
      return driverData;

    } catch (error) {
      console.error('❌ Erro durante scraping:', error);
      throw error;
    }
  }

  /**
   * Fecha o navegador
   */
  async close(): Promise<void> {
    try {
      if (this.page) {
        await this.page.close();
        this.page = null;
      }
      
      // O browser é gerenciado pelo BrowserSessionManager
      console.log('✅ Scraper fechado');
    } catch (error) {
      console.error('❌ Erro ao fechar scraper:', error);
    }
  }

  /**
   * Obtém a cidade atual detectada
   */
  getCurrentCity(): string {
    return this.currentCity;
  }

  /**
   * Verifica se está logado
   */
  async isLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const currentUrl = this.page.url();
      return !currentUrl.includes('/login') && 
             (currentUrl.includes('/dashboard') || currentUrl.includes('/app/'));
    } catch {
      return false;
    }
  }
}
