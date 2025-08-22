import { Browser, Page, chromium, BrowserContext } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { EnvironmentDetector } from '../config/environmentDetector';
import { Logger } from '../utils/logger';
import { WindowManager } from './windowManager';
import WindowPositioner from '../utils/windowPositioner';

export interface SessionData {
  isLoggedIn: boolean;
  loginTimestamp: number;
  sessionExpiry: number;
  userData: any;
}

export class BrowserSessionManager {
  private static instances: Map<string, BrowserSessionManager> = new Map();
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private sessionData: SessionData;
  private sessionFilePath: string;
  private userDataDir: string;
  private isHeadless: boolean;
  private instanceName: string; // 🆕 Nome da instância
  private logger: Logger; // ⭐ SISTEMA DE LOGGING
  private windowManager: WindowManager; // 🖥️ GERENCIADOR DE JANELAS
  
  // 🔄 Cache de status para evitar verificações excessivas
  private lastLoginCheck: number = 0;
  private lastLoginStatus: boolean = false;
  private loginCheckCacheDuration: number = 30000; // 30 segundos
  
  // URLs de configuração (usando variáveis de ambiente)
  private loginUrl: string = process.env.RIDES_LOGIN_URL || 'https://rides.ec2dashboard.com/#/page/login';
  private email: string = process.env.RIDES_USERNAME || '';
  private password: string = process.env.RIDES_PASSWORD || '';
  
  /**
   * 🖥️ Obter posição da janela baseada na instância para VNC split-screen
   */
  private getWindowPosition(instanceName: string): { x: number, y: number, width: number, height: number } {
    // 🎯 LÓGICA CORRIGIDA: Posições distintas para cada instância
    const positions: { [key: string]: { x: number, y: number, width: number, height: number } } = {
      // LADO ESQUERDO (rides, monitoramento)
      'default': { x: 0, y: 0, width: 800, height: 1170 },
      'rides_scraper': { x: 0, y: 0, width: 800, height: 1170 },
      'hybrid_operation': { x: 0, y: 0, width: 800, height: 1170 },
      
      // LADO DIREITO (drivers, híbrido)  
      'drivers_scraper': { x: 800, y: 0, width: 800, height: 1170 },
      'hybrid_scraper': { x: 800, y: 0, width: 800, height: 1170 }
    };
    
    const position = positions[instanceName] || positions['default'];
    console.log(`📍 [${instanceName}] → Posição: (${position.x}, ${position.y}) Tamanho: ${position.width}x${position.height}`);
    return position;
  }
  
  private constructor(instanceName: string = 'default') {
    this.instanceName = instanceName;
    this.isHeadless = process.env.HEADLESS_MODE === 'true';
    this.logger = Logger.getInstance(); // ⭐ INICIALIZAR LOGGER
    this.windowManager = WindowManager.getInstance(); // 🖥️ INICIALIZAR WINDOW MANAGER
    
    // 🆕 Diretórios específicos por instância
    this.userDataDir = path.join(process.cwd(), 'browser-data', instanceName);
    this.sessionFilePath = path.join(process.cwd(), `session-data-${instanceName}.json`);
    this.sessionData = this.loadSessionData();
    
    // 🔍 Detectar ambiente e configurar adequadamente
    const envDetector = EnvironmentDetector.getInstance();
    const envConfig = envDetector.getConfig();
    
    // Log do ambiente detectado (apenas para a primeira instância)
    if (instanceName === 'default') {
      envDetector.logEnvironmentInfo();
    }
    
    // Ajustar headless baseado no ambiente
    if (envConfig.displayMode === 'headless') {
      this.isHeadless = true;
    } else if (envConfig.displayMode === 'vnc' || envConfig.displayMode === 'xvfb') {
      this.isHeadless = false;
    }
    
    this.logger.info('BROWSER', `Browser [${instanceName}] configurado para modo: ${envConfig.displayMode.toUpperCase()}`);
    this.logger.info('BROWSER', `Headless [${instanceName}]: ${this.isHeadless ? 'SIM' : 'NÃO'}`);
    
    // Garantir que o diretório de dados do browser existe
    if (!fs.existsSync(this.userDataDir)) {
      fs.mkdirSync(this.userDataDir, { recursive: true });
    }
  }

  /**
   * 🖥️ Arranjar todas as janelas automaticamente para split-screen
   */
  public static async arrangeAllWindowsForSplitScreen(): Promise<void> {
    const windowManager = WindowManager.getInstance();
    
    console.log('🖥️ Arranjando janelas para split-screen...');
    await windowManager.arrangeWindowsForSplitScreen();
  }

  /**
   * � Organiza todas as janelas em split-screen (função estática)
   */
  public static async arrangeAllWindows(): Promise<void> {
    try {
      console.log('🎯 [BROWSER] Organizando todas as janelas em split-screen...');
      const positioner = WindowPositioner.getInstance();
      await positioner.arrangeAllWindows();
    } catch (error) {
      console.error('❌ [BROWSER] Erro ao organizar janelas:', error);
    }
  }

  /**
   * �🆕 Obtém instância nomeada do BrowserSessionManager
   */
  public static getInstance(instanceName: string = 'default'): BrowserSessionManager {
    if (!BrowserSessionManager.instances.has(instanceName)) {
      BrowserSessionManager.instances.set(instanceName, new BrowserSessionManager(instanceName));
    }
    return BrowserSessionManager.instances.get(instanceName)!;
  }

  /**
   * 🆕 Lista todas as instâncias ativas
   */
  public static getActiveInstances(): string[] {
    return Array.from(BrowserSessionManager.instances.keys());
  }

  /**
   * 🆕 Obtém nome da instância atual
   */
  public getInstanceName(): string {
    return this.instanceName;
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
   * Verifica se o usuário está logado no navegador (detecta login manual)
   */
  private async isCurrentlyLoggedIn(verbose: boolean = true): Promise<boolean> {
    if (!this.page) return false;
    
    // 🔄 Usar cache durante scraping para evitar verificações excessivas
    const now = Date.now();
    if (!verbose && (now - this.lastLoginCheck) < this.loginCheckCacheDuration) {
      return this.lastLoginStatus;
    }
    
    try {
      const currentUrl = this.page.url();
      if (verbose) {
        console.log('🔍 Verificando URL atual:', currentUrl);
      }
      
      // Se está na página de login, definitivamente não está logado
      if (currentUrl.includes('login')) {
        if (verbose) {
          console.log('❌ Ainda na página de login');
        }
        this.lastLoginCheck = now;
        this.lastLoginStatus = false;
        return false;
      }
      
      // Se não está na página de login, verificar se realmente está no dashboard
      if (currentUrl.includes('dashboard') || currentUrl.includes('app/')) {
        if (verbose) {
          console.log('✅ URL indica dashboard');
        }
        
        // Aguardar um pouco para elementos carregarem (apenas se verbose)
        if (verbose) {
          await this.page.waitForTimeout(3000);
        }
        
        // Verificações específicas para o site rides.ec2dashboard.com
        try {
          // Verificar se há elementos específicos do dashboard Urban
          const specificChecks = await Promise.all([
            // Verificar se há tabelas de dados (principal indicador)
            this.page.$('table.t-fancy-table').then(el => !!el),
            // Verificar se há título do dashboard Urban
            this.page.$eval('title', el => el.textContent).then(title => 
              title?.includes('Dashboard') || title?.includes('Urban')
            ).catch(() => false),
            // Verificar se há elementos de navegação específicos
            this.page.$('.navbar, .nav-menu, .sidebar').then(el => !!el),
            // Verificar se NÃO há formulário de login
            this.page.$('#exampleInputEmail1').then(el => !el),
            // Verificar se há conteúdo da página logada
            this.page.$eval('body', el => el.textContent).then(text => 
              text && text.length > 1000 && !text.includes('Login')
            ).catch(() => false)
          ]);
          
          if (verbose) {
            console.log('🔍 Verificações específicas:', {
              hasTable: specificChecks[0],
              hasTitle: specificChecks[1],
              hasNavigation: specificChecks[2],
              noLoginForm: specificChecks[3],
              hasContent: specificChecks[4]
            });
          }
          
          // Para considerar logado, deve passar em pelo menos 3 verificações
          // E OBRIGATORIAMENTE não deve ter formulário de login
          const positiveChecks = specificChecks.filter(Boolean).length;
          const hasLoginForm = !specificChecks[3]; // Inverter pois specificChecks[3] é "NÃO há formulário"
          
          if (verbose) {
            console.log(`🔍 Resultado: ${positiveChecks}/5 verificações positivas`);
            console.log(`🔍 Formulário de login presente: ${hasLoginForm ? 'SIM' : 'NÃO'}`);
          }
          
          // Regra: pelo menos 3 verificações positivas E sem formulário de login
          const isLoggedIn = positiveChecks >= 3 && !hasLoginForm;
          
          if (verbose) {
            if (isLoggedIn) {
              console.log('✅ Login confirmado por verificações específicas');
            } else {
              console.log('❌ Login não confirmado pelas verificações');
            }
          }
          
          // 🔄 Atualizar cache
          this.lastLoginCheck = now;
          this.lastLoginStatus = isLoggedIn;
          
          return isLoggedIn;
          
        } catch (error) {
          console.log('⚠️ Erro ao verificar elementos específicos:', error);
          this.lastLoginCheck = now;
          this.lastLoginStatus = false;
          return false;
        }
      }
      
      // Se não está nem em login nem em dashboard, algo está errado
      console.log('⚠️ URL não reconhecida, assumindo não logado');
      this.lastLoginCheck = now;
      this.lastLoginStatus = false;
      return false;
      
    } catch (error) {
      console.log('⚠️ Erro ao verificar status de login:', error);
      this.lastLoginCheck = now;
      this.lastLoginStatus = false;
      return false;
    }
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

    this.logger.info('BROWSER', 'Inicializando browser com persistência...');
    
    try {
      // 🔍 Obter configuração de browser baseada no ambiente
      const envDetector = EnvironmentDetector.getInstance();
      const playwrightConfig = envDetector.getPlaywrightConfig();
      
      console.log(`🖥️ Configuração Playwright: headless=${playwrightConfig.headless}`);
      
      // 🖥️ Configurações específicas para VNC com split-screen
      const windowPosition = this.getWindowPosition(this.instanceName);
      const browserArgs = [
        ...playwrightConfig.args,
        `--window-position=${windowPosition.x},${windowPosition.y}`,
        `--window-size=${windowPosition.width},${windowPosition.height}`,
        '--new-window',  // Força nova janela
        '--no-first-run',
        '--disable-default-apps'
      ];
      
      this.context = await chromium.launchPersistentContext(this.userDataDir, {
        headless: playwrightConfig.headless,
        args: browserArgs,
        viewport: { width: windowPosition.width, height: windowPosition.height },
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36', // 🖥️ WINDOWS DESKTOP USER AGENT
        deviceScaleFactor: 1, // 🖥️ ESCALA DESKTOP
        isMobile: false, // 🖥️ FORÇAR DESKTOP
        hasTouch: false, // 🖥️ SEM TOUCH
        ignoreDefaultArgs: ['--enable-automation'], // Remove automação detectável
        handleSIGINT: false,
        handleSIGTERM: false,
        handleSIGHUP: false,
        extraHTTPHeaders: {
          'sec-ch-ua': '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
          'sec-ch-ua-mobile': '?0',
          'sec-ch-ua-platform': '"Windows"'
        },
        // 🖱️ CONFIGURAÇÕES CRÍTICAS PARA MOUSE NO VNC
        locale: 'pt-BR',
        timezoneId: 'America/Sao_Paulo',
        acceptDownloads: true,
        bypassCSP: false,
        javaScriptEnabled: true,
        offline: false,
        permissions: ['geolocation', 'notifications'],
        // 🎯 Remover viewport fixo que pode interferir com interação do mouse
        // viewport: null, // Deixar o browser gerenciar o viewport
      });

      // Obter referência do browser do context
      this.browser = this.context.browser();
      
      // Se o browser não foi retornado pelo context, vamos tentar uma abordagem diferente
      if (!this.browser) {
        console.log('⚠️ Context não retornou instância do browser, usando abordagem alternativa...');
        // Para compatibilidade com AI Agent, vamos criar um mock ou usar o context como proxy
        this.browser = this.context as any; // Temporariamente para testes
      }

      // Pegar a página existente ou criar uma nova
      const pages = this.context.pages();
      this.page = pages.length > 0 ? pages[0] : await this.context.newPage();
      
      // Configurar timeouts para evitar fechamento prematuro
      this.page.setDefaultTimeout(60000);
      this.page.setDefaultNavigationTimeout(60000);
      
      // 🖥️ POSICIONAMENTO AUTOMÁTICO DE JANELAS (apenas em ambiente VNC)
      const envConfig2 = envDetector.getConfig();
      
      if (!this.isHeadless && (envConfig2.displayMode === 'vnc' || envConfig2.displayMode === 'xvfb')) {
        this.logger.info('BROWSER', `🖥️ Iniciando posicionamento e foco automático para ${this.instanceName}...`);
        
        // Aguardar janela aparecer e tentar posicionar + focar
        setTimeout(async () => {
          try {
            const positioner = WindowPositioner.getInstance();
            
            // 1. Posicionar janela
            const success = await positioner.moveWindow(this.instanceName, windowPosition);
            if (!success) {
              this.logger.warn('BROWSER', `Falha no posicionamento de ${this.instanceName}`);
            }
            
            // 2. Aguardar um pouco e focar na janela
            setTimeout(async () => {
              try {
                await positioner.focusWindow(this.instanceName);
                this.logger.info('BROWSER', `🎯 Foco aplicado para ${this.instanceName}`);
              } catch (error) {
                this.logger.warn('BROWSER', `Falha ao focar janela: ${error}`);
              }
            }, 2000);
            
          } catch (error) {
            this.logger.warn('BROWSER', `Falha no posicionamento automático: ${error}`);
          }
        }, 3000); // Aguardar janela aparecer
      }
      
      console.log(`🎯 [${this.instanceName}] Browser inicializado com posicionamento automático`);
      this.logger.success('BROWSER', `Browser ${this.instanceName} inicializado com sucesso`);
      
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

    console.log('🔐 Verificando status de login...');

    // Primeiro, verificar se há sessão válida em cache
    if (this.isSessionValid()) {
      console.log('✅ Sessão válida encontrada no cache');
      
      // Mesmo com sessão válida, verificar se realmente está logado
      const isCurrentlyLoggedIn = await this.isCurrentlyLoggedIn();
      if (isCurrentlyLoggedIn) {
        console.log('✅ Sessão válida e usuário logado confirmado');
        return true;
      } else {
        console.log('⚠️ Sessão em cache, mas usuário não está logado. Limpando cache...');
        this.clearSession();
      }
    }

    // Verificar se já está logado no navegador (login manual ou sessão persistente)
    const isCurrentlyLoggedIn = await this.isCurrentlyLoggedIn();
    
    if (isCurrentlyLoggedIn) {
      console.log('✅ Login válido detectado no navegador');
      
      // Atualizar dados da sessão para refletir o login atual
      const now = Date.now();
      this.sessionData = {
        isLoggedIn: true,
        loginTimestamp: now,
        sessionExpiry: now + (2 * 60 * 60 * 1000), // 2 horas de validade
        userData: { email: this.email, detectedLogin: true }
      };
      this.saveSessionData();
      
      return true;
    }

    // Tentar navegar para dashboard primeiro para verificar se está logado
    try {
      console.log('🔍 Tentando acessar dashboard para verificar login...');
      const baseUrl = this.loginUrl.split('#')[0]; // Extrair domínio base
      await this.page!.goto(`${baseUrl}#/app/dashboard/`, { 
        waitUntil: 'domcontentloaded',
        timeout: 15000 
      });
      
      await this.page!.waitForTimeout(5000); // Aguardar mais tempo para carregamento
      
      // Verificar novamente após navegar para dashboard
      const isLoggedAfterDashboard = await this.isCurrentlyLoggedIn();
      if (isLoggedAfterDashboard) {
        console.log('✅ Login confirmado após navegação para dashboard');
        
        // Atualizar dados da sessão
        const now = Date.now();
        this.sessionData = {
          isLoggedIn: true,
          loginTimestamp: now,
          sessionExpiry: now + (2 * 60 * 60 * 1000),
          userData: { email: this.email, dashboardAccess: true }
        };
        this.saveSessionData();
        
        return true;
      }
    } catch (error) {
      console.log('⚠️ Erro ao verificar dashboard:', error);
    }

    // Se chegou aqui, precisa fazer login automático
    console.log('🔑 Necessário fazer login...');
    console.log('⚠️ ATENÇÃO: Se há captcha, faça login manualmente e tente novamente');
    
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

      // Verificar se há captcha na página
      const hasCaptcha = await this.checkForCaptcha();
      
      if (hasCaptcha) {
        console.log('🤖 CAPTCHA detectado na página!');
        console.log('⚠️ Login automático não é possível com captcha');
        console.log('📝 Por favor, faça login manualmente no navegador VNC');
        console.log('� O sistema irá detectar automaticamente quando você completar o login...');
        
        // 🔄 Iniciar polling para detectar login manual
        return await this.waitForManualLogin();
      }

      // Preencher credenciais apenas se não há captcha
      console.log('📝 Preenchendo credenciais...');
      await this.page!.fill('#exampleInputEmail1', this.email);
      await this.page!.fill('#exampleInputPassword1', this.password);

      // Fazer login
      console.log('🚪 Fazendo login...');
      await this.page!.press('#exampleInputPassword1', 'Enter');
      await this.page!.waitForTimeout(8000);

      // Verificar se login foi bem-sucedido com método mais robusto
      const isLoggedIn = await this.verifyLoginSuccess();

      if (isLoggedIn) {
        // Atualizar dados da sessão
        const now = Date.now();
        this.sessionData = {
          isLoggedIn: true,
          loginTimestamp: now,
          sessionExpiry: now + (2 * 60 * 60 * 1000), // 2 horas de validade
          userData: { email: this.email, automaticLogin: true }
        };
        this.saveSessionData();
        
        console.log('✅ Login automático realizado com sucesso!');
        return true;
      } else {
        console.log('❌ Falha no login automático');
        return false;
      }

    } catch (error) {
      console.error('❌ Erro durante login:', error);
      return false;
    }
  }

  /**
   * Aguarda login manual quando há captcha - versão melhorada para reinicialização
   * Monitora mudança de URL para detectar quando usuário completa login via VNC
   */
  public async waitForManualLogin(timeoutMs: number = 300000): Promise<boolean> {
    console.log('⏳ Aguardando login manual via VNC...');
    console.log('💡 Acesse o VNC em http://localhost:6080 para resolver o captcha');
    console.log('🔄 O sistema detectará automaticamente quando você fizer login...');
    
    const maxWaitTime = 5 * 60 * 1000; // 5 minutos
    const checkInterval = 3000; // 3 segundos (mais rápido)
    const startTime = Date.now();
    
    while ((Date.now() - startTime) < maxWaitTime) {
      try {
        const currentUrl = this.page!.url();
        console.log(`🔍 Verificando URL: ${currentUrl.substring(0, 50)}...`);
        
        // Verificar se saiu da página de login OU se está logado
        const notInLogin = !currentUrl.includes('login');
        const isLoggedIn = await this.isCurrentlyLoggedIn(true);
        
        if (notInLogin || isLoggedIn) {
          console.log('🔍 Mudança detectada, verificando login completo...');
          await this.page!.waitForTimeout(3000); // Aguardar carregamento completo
          
          // Verificação dupla mais robusta
          const finalLoginCheck = await this.isCurrentlyLoggedIn(true);
          if (finalLoginCheck) {
            console.log('🎉 Login manual detectado com sucesso!');
            
            // Atualizar dados da sessão
            const now = Date.now();
            this.sessionData = {
              isLoggedIn: true,
              loginTimestamp: now,
              sessionExpiry: now + (2 * 60 * 60 * 1000),
              userData: { 
                email: this.email, 
                manualLogin: true, 
                captchaSolved: true,
                detectedAt: new Date().toISOString()
              }
            };
            this.saveSessionData();
            
            // Limpar cache de login para próximas verificações
            this.lastLoginCheck = 0;
            this.lastLoginStatus = true;
            
            console.log('✅ Sessão atualizada após login manual');
            return true;
          } else {
            console.log('⚠️ URL mudou mas login não confirmado, continuando...');
          }
        }
        
        // Aguardar antes da próxima verificação
        console.log(`⏳ Aguardando... (${Math.round((Date.now() - startTime) / 1000)}s/${Math.round(maxWaitTime / 1000)}s)`);
        await this.page!.waitForTimeout(checkInterval);
        
      } catch (error) {
        console.log('⚠️ Erro durante polling de login manual:', error);
        await this.page!.waitForTimeout(checkInterval);
      }
    }
    
    console.log('⏰ Timeout aguardando login manual');
    return false;
  }

  /**
   * Verifica se o login foi bem-sucedido de forma mais robusta
   */
  private async verifyLoginSuccess(): Promise<boolean> {
    try {
      // Aguardar um pouco para redirecionamento
      await this.page!.waitForTimeout(5000);
      
      const currentUrl = this.page!.url();
      console.log('🔍 URL após login:', currentUrl);
      
      // Se ainda está na página de login, login falhou
      if (currentUrl.includes('login')) {
        console.log('❌ Ainda na página de login');
        return false;
      }
      
      // Verificar se foi redirecionado para dashboard
      if (currentUrl.includes('dashboard') || currentUrl.includes('app/')) {
        console.log('✅ Redirecionado para dashboard');
        
        // Verificação dupla usando o método robusto
        const loginConfirmed = await this.isCurrentlyLoggedIn();
        if (loginConfirmed) {
          console.log('✅ Login confirmado por verificação de elementos');
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.log('⚠️ Erro ao verificar sucesso do login:', error);
      return false;
    }
  }

  /**
   * Verifica se há captcha na página de login - versão melhorada
   */
  private async checkForCaptcha(): Promise<boolean> {
    try {
      console.log('🔍 Verificando presença de captcha na página...');
      
      // Aguardar um pouco para garantir que a página carregou completamente
      await this.page!.waitForTimeout(2000);
      
      // Verificar elementos comuns de captcha
      const captchaSelectors = [
        'iframe[src*="recaptcha"]',
        'iframe[src*="hcaptcha"]',
        '.g-recaptcha',
        '.h-captcha',
        'div[class*="captcha"]',
        'div[id*="captcha"]',
        'img[src*="captcha"]',
        '#captcha',
        '.captcha-container',
        '.captcha-wrapper',
        '[data-captcha]',
        '[data-sitekey]',
        '.cf-turnstile',
        'iframe[title*="captcha"]',
        'iframe[title*="challenge"]'
      ];

      let captchaFound = false;
      let detectedSelector = '';

      for (const selector of captchaSelectors) {
        try {
          const element = await this.page!.$(selector);
          if (element) {
            const isVisible = await element.isVisible();
            if (isVisible) {
              console.log(`🤖 Captcha detectado e visível: ${selector}`);
              captchaFound = true;
              detectedSelector = selector;
              break;
            } else {
              console.log(`📋 Captcha encontrado mas não visível: ${selector}`);
            }
          }
        } catch (error) {
          // Continuar verificando outros seletores
        }
      }

      // Verificação adicional: procurar por texto indicativo de captcha
      if (!captchaFound) {
        const pageContent = await this.page!.textContent('body') || '';
        const captchaTexts = [
          'captcha',
          'verify you are human',
          'prove you are not a robot',
          'security check',
          'human verification'
        ];

        for (const text of captchaTexts) {
          if (pageContent.toLowerCase().includes(text)) {
            console.log(`🤖 Captcha detectado por texto: "${text}"`);
            captchaFound = true;
            detectedSelector = `texto: "${text}"`;
            break;
          }
        }
      }

      if (captchaFound) {
        console.log(`🤖 CAPTCHA CONFIRMADO - Detectado via: ${detectedSelector}`);
        console.log('⚠️ Login automático não será tentado');
        return true;
      } else {
        console.log('✅ Nenhum captcha detectado - prosseguindo com login automático');
        return false;
      }

    } catch (error) {
      console.log('⚠️ Erro ao verificar captcha:', error);
      // Em caso de erro, assumir que há captcha para ser seguro
      console.log('🛡️ Por segurança, assumindo presença de captcha');
      return true;
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
   * Obtém a instância do browser para operações customizadas
   */
  public getBrowser(): Browser | null {
    return this.browser;
  }

  /**
   * Verifica se o browser está ativo
   */
  public isActive(): boolean {
    return this.context !== null && this.page !== null;
  }

  /**
   * Obtém status detalhado da sessão
   */
  public async getSessionStatus(): Promise<{
    browserActive: boolean;
    sessionValid: boolean;
    currentlyLoggedIn: boolean;
    message: string;
    availablePages: string[];
    requiresManualLogin: boolean;
  }> {
    const browserActive = this.isActive();
    const sessionValid = this.isSessionValid();
    
    let currentlyLoggedIn = false;
    let availablePages: string[] = [];
    let requiresManualLogin = false;
    
    if (browserActive && this.page) {
      try {
        // ⚠️ CORREÇÃO: Apenas verificar login, NÃO navegar para login
        currentlyLoggedIn = await this.isCurrentlyLoggedIn(false); // Modo silencioso
        
        // 🔍 Se não detectou login automaticamente, verificar se fez login manual
        if (!currentlyLoggedIn) {
          const currentUrl = this.page.url();
          
          // Se não está na página de login, pode ter feito login manual
          if (!currentUrl.includes('login') && (currentUrl.includes('dashboard') || currentUrl.includes('app/'))) {
            console.log('🔍 URL sugere login manual, verificando...');
            await this.page.waitForTimeout(2000); // Aguardar carregamento
            currentlyLoggedIn = await this.isCurrentlyLoggedIn(true); // Verificação detalhada
            
            if (currentlyLoggedIn) {
              console.log('✅ Login manual detectado e confirmado!');
              // Atualizar dados da sessão
              const now = Date.now();
              this.sessionData = {
                isLoggedIn: true,
                loginTimestamp: now,
                sessionExpiry: now + (2 * 60 * 60 * 1000),
                userData: { email: this.email, manualLogin: true }
              };
              this.saveSessionData();
            }
          }
        }
        
        // Listar páginas disponíveis
        if (this.context) {
          availablePages = this.context.pages().map(p => p.url());
        }
      } catch (error) {
        console.log('⚠️ Erro ao verificar status:', error);
      }
    }
    
    let message = '';
    if (!browserActive) {
      message = 'Browser não está ativo';
    } else if (requiresManualLogin) {
      message = 'Captcha detectado - login manual necessário';
    } else if (currentlyLoggedIn) {
      message = 'Logado e pronto para scraping';
    } else if (sessionValid) {
      message = 'Sessão válida em cache';
    } else {
      message = 'Não logado';
    }
    
    return {
      browserActive,
      sessionValid,
      currentlyLoggedIn,
      message,
      availablePages,
      requiresManualLogin
    };
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

  /**
   * Aguarda que o usuário faça login manual (útil quando há captcha)
   */
  /**
   * Método híbrido que usa a mesma lógica do início - funciona para reinicialização
   */
  public async ensureLoginWithCaptchaHandling(): Promise<boolean> {
    try {
      console.log('🔄 Iniciando processo de login com tratamento de captcha...');
      
      // Garantir que browser está ativo
      if (!this.page) {
        await this.initializeBrowser();
      }
      
      // Verificar se já está logado primeiro
      const alreadyLoggedIn = await this.isCurrentlyLoggedIn();
      if (alreadyLoggedIn) {
        console.log('✅ Já está logado, continuando...');
        return true;
      }
      
      console.log('📍 Navegando para página de login...');
      await this.page!.goto(this.loginUrl, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });

      await this.page!.waitForTimeout(3000);

      // 🔑 MESMA LÓGICA DO INÍCIO: Verificar captcha ANTES de preencher
      const hasCaptcha = await this.checkForCaptcha();
      
      if (hasCaptcha) {
        console.log('🤖 CAPTCHA detectado na página!');
        console.log('⚠️ Login automático não é possível com captcha');
        console.log('📝 Por favor, faça login manualmente no navegador VNC');
        console.log('🔄 O sistema irá detectar automaticamente quando você completar o login...');
        
        // 🔄 MESMA LÓGICA: Aguardar login manual
        return await this.waitForManualLogin();
      }

      // Se não há captcha, tentar login automático
      console.log('📝 Preenchendo credenciais...');
      await this.page!.fill('#exampleInputEmail1', this.email);
      await this.page!.fill('#exampleInputPassword1', this.password);

      console.log('🚪 Fazendo login...');
      await this.page!.press('#exampleInputPassword1', 'Enter');
      await this.page!.waitForTimeout(8000);

      // Verificar se login foi bem-sucedido
      const isLoggedIn = await this.verifyLoginSuccess();

      if (isLoggedIn) {
        // Atualizar dados da sessão
        const now = Date.now();
        this.sessionData = {
          isLoggedIn: true,
          loginTimestamp: now,
          sessionExpiry: now + (2 * 60 * 60 * 1000),
          userData: { email: this.email, automaticLogin: true, captchaHandled: true }
        };
        this.saveSessionData();
        
        console.log('✅ Login automático realizado com sucesso após verificação de captcha!');
        return true;
      } else {
        console.log('❌ Falha no login automático, pode ter captcha não detectado');
        console.log('🔄 Tentando aguardar login manual como fallback...');
        
        // 🔑 FALLBACK: Se falhou, pode ser captcha não detectado, aguardar login manual
        return await this.waitForManualLogin();
      }

    } catch (error) {
      console.error('❌ Erro durante login com tratamento de captcha:', error);
      console.log('🔄 Tentando aguardar login manual como fallback...');
      
      // Em caso de erro, tentar login manual
      return await this.waitForManualLogin();
    }
  }

  /**
   * Método de debug para verificar o que está na página atual
   */
  public async debugCurrentPage(): Promise<void> {
    if (!this.page) {
      console.log('❌ Página não disponível para debug');
      return;
    }

    try {
      const currentUrl = this.page.url();
      const title = await this.page.title();
      
      console.log('🔍 === DEBUG DA PÁGINA ATUAL ===');
      console.log('📍 URL:', currentUrl);
      console.log('📄 Title:', title);
      
      // Verificar elementos específicos
      const elements = await Promise.all([
        this.page.$('nav').then(el => ({ selector: 'nav', found: !!el })),
        this.page.$('.sidebar').then(el => ({ selector: '.sidebar', found: !!el })),
        this.page.$('.navigation').then(el => ({ selector: '.navigation', found: !!el })),
        this.page.$('.user-info').then(el => ({ selector: '.user-info', found: !!el })),
        this.page.$('.logout').then(el => ({ selector: '.logout', found: !!el })),
        this.page.$('.dashboard-content').then(el => ({ selector: '.dashboard-content', found: !!el })),
        this.page.$('.main-content').then(el => ({ selector: '.main-content', found: !!el })),
        this.page.$('input[type="email"]').then(el => ({ selector: 'input[type="email"]', found: !!el })),
        this.page.$('input[type="password"]').then(el => ({ selector: 'input[type="password"]', found: !!el })),
        this.page.$('.login-form').then(el => ({ selector: '.login-form', found: !!el }))
      ]);
      
      console.log('🔍 Elementos encontrados:');
      elements.forEach(el => {
        console.log(`   ${el.found ? '✅' : '❌'} ${el.selector}`);
      });
      
      // Verificar se há tabelas (indicador de estar no dashboard)
      const tables = await this.page.$$('table');
      console.log(`📊 Tabelas encontradas: ${tables.length}`);
      
      // Verificar texto da página para identificar estado
      const bodyText = await this.page.textContent('body');
      const hasLoginText = bodyText?.toLowerCase().includes('login') || bodyText?.toLowerCase().includes('entrar');
      const hasDashboardText = bodyText?.toLowerCase().includes('dashboard') || bodyText?.toLowerCase().includes('painel');
      
      console.log(`📝 Texto da página indica login: ${hasLoginText ? '✅' : '❌'}`);
      console.log(`📝 Texto da página indica dashboard: ${hasDashboardText ? '✅' : '❌'}`);
      
      console.log('🔍 === FIM DO DEBUG ===');
      
    } catch (error) {
      console.error('❌ Erro durante debug:', error);
    }
  }
}
