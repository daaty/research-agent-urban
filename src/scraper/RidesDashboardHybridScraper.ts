import { BrowserSessionManager } from '../services/browserSessionManager';
import { DataTransformer } from '../services/dataTransformer';
import { Page } from 'playwright';

/**
 * Scraper específico para dashboard do Rides
 * Integra com o sistema híbrido de extração + recarga
 */
export class RidesDashboardHybridScraper {
  private browserManager: BrowserSessionManager;
  private dataTransformer: DataTransformer;
  private page: Page | null = null;
  private isLoggedIn: boolean = false;
  private currentCity: string = '';
  private isExtractingIds: boolean = false; // Flag para evitar extrações simultâneas
  private isProcessingDriverData: boolean = false; // Flag para evitar extrações de dados simultâneas
  private lastProcessingTime: number = 0; // Controle de timing entre operações

  // � CONTROLE DE VELOCIDADE CONFIGURÁVEL
  private readonly speedConfig = {
    // Multiplicador de velocidade (1.0 = normal, 2.0 = mais lento, 0.5 = mais rápido)
    speedMultiplier: parseFloat(process.env.HYBRID_SPEED_MULTIPLIER || '1.5'), // Padrão 50% mais lento
    
    // Delays base (serão multiplicados pelo speedMultiplier)
    baseDelays: {
      navigation: 3000,      // Aguardar navegação
      pageLoad: 5000,        // Aguardar carregamento de página
      elementWait: 2000,     // Aguardar elementos
      extraction: 3000,      // Entre extrações
      coordination: 1000     // Coordenação entre operações
    }
  };

  // �🔒 DEBOUNCE PARA EXTRAÇÃO DE IDs (static para compartilhar entre instâncias)
  private static idExtractionDebounce: {
    lastExtraction: number,
    isExtracting: boolean,
    lastResult: string[]
  } = { 
    lastExtraction: 0, 
    isExtracting: false,
    lastResult: []
  };

  // URLs hardcoded conforme solicitado
  private readonly DASHBOARD_URL = 'https://rides.ec2dashboard.com/#/app/dashboard';
  private readonly ACTIVE_DRIVERS_URL = 'https://rides.ec2dashboard.com/#/app/active-drivers';

  constructor(instanceName: string = 'rides_scraper') {
    this.browserManager = BrowserSessionManager.getInstance(instanceName);
    this.dataTransformer = DataTransformer.getInstance();
    
    // Log da configuração de velocidade
    console.log(`🐌 [HYBRID] Velocidade configurada: ${this.speedConfig.speedMultiplier}x (1.0=normal, >1.0=mais lento)`);
  }

  /**
   * 🐌 CONTROLE DE VELOCIDADE: Calcular delay baseado na configuração
   */
  private getDelay(type: keyof typeof this.speedConfig.baseDelays): number {
    const baseDelay = this.speedConfig.baseDelays[type];
    const adjustedDelay = Math.round(baseDelay * this.speedConfig.speedMultiplier);
    return adjustedDelay;
  }

  /**
   * 🕐 WAIT INTELIGENTE: Aguardar com delay configurável
   */
  private async smartWait(type: keyof typeof this.speedConfig.baseDelays, customDelay?: number): Promise<void> {
    const delay = customDelay || this.getDelay(type);
    if (this.page && !this.page.isClosed()) {
      await this.page.waitForTimeout(delay);
    }
  }

  /**
   * 🔒 CONTROLE DE CONCORRÊNCIA: Evita múltiplas extrações simultâneas de dados pessoais
   */
  private async waitForExtractionSlot(): Promise<void> {
    const maxWaitTime = 5000; // Reduzido para 5 segundos
    const checkInterval = 500; // Verificar a cada 500ms
    let waitedTime = 0;

    while (this.isProcessingDriverData && waitedTime < maxWaitTime) {
      await this.smartWait('coordination');
      waitedTime += checkInterval;
    }

    // Se ainda estiver ocupado após 5s, força a liberação
    if (this.isProcessingDriverData) {
      console.log('⚠️ Forçando liberação de slot após timeout');
      this.isProcessingDriverData = false;
    }
  }

  /**
   * 🕒 THROTTLING HUMANO: Garante delay mínimo entre operações
   */
  private async ensureHumanDelay(): Promise<void> {
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessingTime;
    const minDelay = this.getDelay('extraction');

    if (timeSinceLastProcess < minDelay) {
      const waitTime = minDelay - timeSinceLastProcess;
      console.log(`🐌 Aplicando delay humano: ${waitTime}ms`);
      await this.smartWait('extraction', waitTime);
    }

    this.lastProcessingTime = Date.now();
  }

  /**
   * Inicializa o scraper e faz login
   */
  async initialize(): Promise<void> {
    console.log('🚀 Inicializando RidesDashboardHybridScraper...');
    
    try {
      // Usa o login existente que já funciona
      const loginUrl = process.env.RIDES_LOGIN_URL || 'https://rides.ec2dashboard.com/#/page/login';
      const username = process.env.RIDES_USERNAME;
      const password = process.env.RIDES_PASSWORD;

      if (!username || !password) {
        throw new Error('Credenciais não configuradas no .env');
      }

      // Abre browser e faz login
      await this.browserManager.initializeBrowser();
      this.page = this.browserManager.getPage();

      if (!this.page) {
        throw new Error('Falha ao obter página do browser');
      }

      console.log('🔐 Fazendo login na dashboard...');
      await this.performLogin(loginUrl, username, password);

      console.log('🏙️ Identificando cidade...');
      await this.identifyCity();

      console.log(`✅ Scraper inicializado para cidade: ${this.currentCity}`);

    } catch (error) {
      console.error('❌ Erro ao inicializar scraper:', error);
      throw error;
    }
  }

  /**
   * Faz login usando o método que já funciona - ADAPTADO DO RIDES_SCRAPER
   */
  private async performLogin(loginUrl: string, username: string, password: string): Promise<void> {
    if (!this.page) throw new Error('Página não disponível');

    await this.browserManager.navigateWithLock(loginUrl, { waitUntil: 'networkidle' });

    // 🔍 Verificar se já está logado primeiro
    const currentUrl = this.page.url();
    console.log('🔍 URL sugere login manual, verificando...');
    
    if (currentUrl.includes('/app/dashboard') || currentUrl.includes('#/app/')) {
      console.log('✅ Já está logado! Pulando processo de login...');
      this.isLoggedIn = true;
      return;
    }

    console.log('� Verificando presença de captcha na página...');
    
    // Verificar se há captcha visível
    const captchaVisible = await this.page.isVisible('div[id*="captcha"]:visible, iframe[src*="captcha"]:visible, .g-recaptcha:visible');
    
    if (captchaVisible) {
      console.log('📋 Captcha detectado na página');
      console.log('❌ Login automático não possível com captcha presente');
      await this.waitForManualLogin();
      return;
    }

    // Verificar se não há captcha oculto
    const captchaPresent = await this.page.isVisible('div[id*="captcha"], iframe[src*="captcha"], .g-recaptcha');
    
    if (captchaPresent) {
      console.log('📋 Captcha encontrado mas não visível:', await this.page.getAttribute('div[id*="captcha"]', 'id') || 'captcha element');
      console.log('✅ Nenhum captcha detectado - prosseguindo com login automático');
    } else {
      console.log('✅ Nenhum captcha detectado - prosseguindo com login automático');
    }

    // Tentar login automático
    try {
      console.log('📝 Preenchendo credenciais...');
      await this.page.fill('#exampleInputEmail1', username);
      await this.page.fill('#exampleInputPassword1', password);

      console.log('🚪 Fazendo login...');
      await this.page.press('#exampleInputPassword1', 'Enter');

      // Aguardar um pouco para ver se o login funcionou
      await this.smartWait('navigation');
      
      const newUrl = this.page.url();
      console.log('🔍 URL após login:', newUrl);
      
      if (newUrl.includes('/app/dashboard') || newUrl.includes('#/app/')) {
        console.log('✅ Login automático bem-sucedido!');
        this.isLoggedIn = true;
        return;
      } else {
        console.log('❌ Ainda na página de login');
        console.log('❌ Falha no login automático, pode ter captcha não detectado');
        await this.waitForManualLogin();
      }
      
    } catch (error) {
      console.log('❌ Erro no login automático:', error);
      await this.waitForManualLogin();
    }
  }

  /**
   * Aguarda login manual via VNC - IGUAL AO RIDES_SCRAPER
   */
  private async waitForManualLogin(): Promise<void> {
    if (!this.page) throw new Error('Página não disponível');
    
    console.log('🔄 Tentando aguardar login manual como fallback...');
    console.log('⏳ Aguardando login manual via VNC...');
    console.log('💡 Acesse o VNC em http://localhost:6080 para resolver o captcha');
    console.log('🔄 O sistema detectará automaticamente quando você fizer login...');
    
    const maxWaitTime = 300; // 5 minutos
    let elapsedTime = 0;
    
    while (elapsedTime < maxWaitTime) {
      const currentUrl = this.page.url();
      console.log(`🔍 Verificando URL: ${currentUrl}...`);
      
      // Verificar se conseguiu fazer login
      if (currentUrl.includes('/app/dashboard') || currentUrl.includes('#/app/')) {
        console.log('✅ Login manual detectado com sucesso!');
        this.isLoggedIn = true;
        return;
      }
      
      // Verificar se ainda está na página de login
      if (currentUrl.includes('/page/login') || currentUrl.includes('#/page/login')) {
        console.log('🔍 Verificando URL atual:', currentUrl);
        console.log('❌ Ainda na página de login');
        console.log(`⏳ Aguardando... (${elapsedTime}s/${maxWaitTime}s)`);
        
        await this.smartWait('navigation');
        elapsedTime += Math.round(this.getDelay('navigation') / 1000);
      } else {
        // URL mudou, aguardar um pouco mais para ver se vai para dashboard
        await this.smartWait('elementWait');
        elapsedTime += Math.round(this.getDelay('elementWait') / 1000);
      }
    }
    
    throw new Error('Timeout aguardando login manual via VNC');
  }

  /**
   * Verifica se já está logado - VERSÃO MAIS SEGURA
   */
  private async checkIfLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const currentUrl = this.page.url();
      console.log('🔍 Verificando URL atual:', currentUrl);
      
      // Se está na página de login, definitivamente não está logado
      if (currentUrl.includes('/page/login') || currentUrl.includes('#/page/login')) {
        console.log('⚠️ URL não reconhecida, assumindo não logado');
        return false;
      }
      
      // Se já está numa página do app, verificar se realmente está logado
      if (currentUrl.includes('/app/dashboard') || 
          currentUrl.includes('/app/active-drivers') ||
          currentUrl.includes('#/app/')) {
        
        // Tentar encontrar elementos que só existem quando logado
        try {
          // Aguardar brevemente por elementos da dashboard
          await this.page.waitForSelector('body', { timeout: 3000 });
          
          // Verificar se não foi redirecionado para login
          const newUrl = this.page.url();
          if (newUrl.includes('/page/login')) {
            console.log('❌ Foi redirecionado para login');
            return false;
          }
          
          console.log('✅ URL indica dashboard');
          return true;
        } catch (error) {
          console.log('⚠️ Erro ao verificar elementos da dashboard');
          return false;
        }
      }

      return false;
      
    } catch (error) {
      console.log('❌ Erro ao verificar login:', error);
      return false;
    }
  }

  /**
   * Identifica a cidade atual clicando no menu Active Drivers
   */
  private async identifyCity(): Promise<void> {
    if (!this.page) throw new Error('Página não disponível');

    console.log('🌐 Navegando para página de motoristas ativos via click...');
    
    try {
      // Aguardar a página carregar completamente primeiro
      console.log('⏳ Aguardando dashboard carregar...');
      await this.smartWait('pageLoad');

      // Procurar e clicar no menu "Active Drivers"
      console.log('🔍 Procurando item do menu "Active Drivers"...');
      
      // Seletores possíveis para o item do menu Active Drivers
      const menuSelectors = [
        'span:has-text("Active Drivers")',
        'span.ng-binding:has-text("Active Drivers")',
        'span[style*="margin-left: 10px"]:has-text("Active Drivers")',
        'span.ng-scope:has-text("Active Drivers")',
        '*:has-text("Active Drivers")'
      ];

      let menuClicked = false;
      for (const selector of menuSelectors) {
        try {
          console.log(`   Testando seletor: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 3000 });
          
          // Verificar se o elemento é visível
          const isVisible = await this.page.isVisible(selector);
          if (isVisible) {
            console.log(`✅ Elemento encontrado e visível: ${selector}`);
            
            // Clicar no elemento
            await this.page.click(selector);
            console.log('🖱️ Clique executado no menu Active Drivers');
            menuClicked = true;
            break;
          } else {
            console.log(`   ❌ Elemento existe mas não está visível: ${selector}`);
          }
        } catch (e) {
          console.log(`   ❌ Seletor não encontrado: ${selector}`);
        }
      }

      if (!menuClicked) {
        console.warn('⚠️ Não foi possível clicar no menu Active Drivers');
        throw new Error('Menu Active Drivers não encontrado');
      }

      // Aguardar a navegação/carregamento após o clique
      console.log('⏳ Aguardando página carregar após clique...');
      await this.smartWait('pageLoad');

      // Verificar URL atual após o clique
      const currentUrl = this.page.url();
      console.log(`📍 URL após clique: ${currentUrl}`);

      // Aguarda o elemento da cidade aparecer - múltiplos seletores possíveis
      const citySelectors = [
        '.select2-chosen .ng-binding',
        '.select2-chosen',
        '[ng-model="selectedCity"]',
        '.city-selector',
        '.selected-city',
        'select[name="city"]',
        '.city-dropdown'
      ];

      console.log('🔍 Procurando elementos da cidade na página de Active Drivers...');
      let cityElement = null;
      let foundSelector = '';
      
      for (const selector of citySelectors) {
        try {
          console.log(`   Testando seletor: ${selector}`);
          await this.page.waitForSelector(selector, { timeout: 5000 });
          cityElement = await this.page.$(selector);
          if (cityElement) {
            foundSelector = selector;
            console.log(`✅ Encontrou elemento da cidade com seletor: ${selector}`);
            break;
          }
        } catch (e) {
          console.log(`   ❌ Seletor ${selector} não encontrado`);
        }
      }
      
      if (cityElement) {
        const cityText = await cityElement.textContent();
        this.currentCity = cityText?.trim() || 'Cidade Desconhecida';
        console.log(`🏙️ Cidade identificada: "${this.currentCity}" (via ${foundSelector})`);
      } else {
        console.log('🔍 Tentando encontrar texto da cidade em toda a página...');
        
        // Tentar encontrar texto que contenha cidade conhecidas
        const pageContent = await this.page.content();
        const knownCities = ['Matupá', 'Cuiabá', 'Várzea Grande', 'São Paulo', 'Rio de Janeiro'];
        
        for (const city of knownCities) {
          if (pageContent.includes(city)) {
            this.currentCity = city;
            console.log(`🏙️ Cidade encontrada no conteúdo da página: ${city}`);
            break;
          }
        }
        
        if (!this.currentCity) {
          throw new Error('Nenhum elemento da cidade encontrado após clique no menu');
        }
      }

    } catch (error: any) {
      console.warn('⚠️ Não foi possível identificar a cidade via menu Active Drivers');
      console.warn(`Erro: ${error.message}`);
      
      // Fallback para .env
      this.currentCity = process.env.CITY_NAME || 'Cidade Padrão';
      console.log(`📋 Usando cidade do .env como fallback: ${this.currentCity}`);
    }

    console.log(`✅ Scraper inicializado para cidade: ${this.currentCity}`);
  }

  /**
   * Extrai todos os IDs dos motoristas da página Active Drivers
   */
  async extractAllDriverIds(): Promise<string[]> {
    if (!this.page) throw new Error('Página não disponível');

    const now = Date.now();
    const minInterval = 60000; // 1 minuto mínimo entre extrações
    
    // 🔒 DEBOUNCE: Verificar se extração é muito recente
    if (RidesDashboardHybridScraper.idExtractionDebounce.isExtracting) {
      console.log('⚠️ Extração de IDs já em andamento por outra instância, retornando cache...');
      return RidesDashboardHybridScraper.idExtractionDebounce.lastResult;
    }
    
    if ((now - RidesDashboardHybridScraper.idExtractionDebounce.lastExtraction) < minInterval) {
      const waitTime = Math.ceil((minInterval - (now - RidesDashboardHybridScraper.idExtractionDebounce.lastExtraction)) / 1000);
      console.log(`⏳ Extração de IDs muito recente, retornando cache (próxima em ${waitTime}s)`);
      return RidesDashboardHybridScraper.idExtractionDebounce.lastResult;
    }

    // 🔒 Verificar se há conflito com extração de dados pessoais
    if (this.isProcessingDriverData) {
      console.log('⚠️ Extração de dados pessoais em andamento, aguardando...');
      let waitTime = 0;
      while (this.isProcessingDriverData && waitTime < 30000) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitTime += 1000;
      }
      if (this.isProcessingDriverData) {
        throw new Error('Conflito: Extração de dados pessoais em andamento há muito tempo');
      }
    }

    // Verificar se já está extraindo para evitar chamadas simultâneas
    if (this.isExtractingIds) {
      console.log('⚠️ Extração de IDs já em andamento, aguardando...');
      // Aguardar um pouco e tentar novamente
      await new Promise(resolve => setTimeout(resolve, 2000));
      if (this.isExtractingIds) {
        throw new Error('Extração de IDs já em andamento por muito tempo');
      }
    }

    // 🔒 Marcar início da extração
    this.isExtractingIds = true;
    RidesDashboardHybridScraper.idExtractionDebounce.isExtracting = true;
    RidesDashboardHybridScraper.idExtractionDebounce.lastExtraction = now;
    
    console.log('🔍 Extraindo IDs dos motoristas da página Active Drivers...');

    try {
      // Garantir que estamos na página Active Drivers
      console.log('🌐 Navegando para página Active Drivers...');
      await this.navigateToActiveDrivers();

      // Clicar no botão "See All" para mostrar todos os motoristas
      console.log('🔍 Procurando botão "See All"...');
      const seeAllButton = await this.page.$('button:has-text("See All")');
      
      if (seeAllButton) {
        console.log('✅ Botão "See All" encontrado, clicando...');
        await seeAllButton.click();
        
        // Aguardar a tabela carregar
        console.log('⏳ Aguardando tabela de motoristas carregar...');
        await this.page.waitForTimeout(3000);
        
        // Aguardar tabela aparecer com timeout maior e melhor error handling
        try {
          await this.page.waitForSelector('#activeDriver tbody tr', { timeout: 20000 });
          console.log('✅ Tabela de motoristas carregada');
        } catch (waitError) {
          console.log('⚠️ Timeout aguardando tabela, tentando sem wait...');
          // Continuar mesmo sem wait - talvez a tabela já esteja lá
        }
      } else {
        console.log('⚠️ Botão "See All" não encontrado, tentando extrair IDs diretamente...');
      }

      // Extrair todos os IDs da primeira coluna da tabela
      console.log('📋 Extraindo IDs da tabela de motoristas...');
      const driverIds = await this.page.$$eval('#activeDriver tbody tr td:first-child', 
        cells => cells.map(cell => cell.textContent?.trim()).filter(id => id && id !== '')
      );

      console.log(`✅ ${driverIds.length} IDs de motoristas extraídos:`);
      driverIds.forEach((id, index) => {
        console.log(`   ${index + 1}. ${id}`);
      });

      // 💾 Armazenar resultado no cache
      RidesDashboardHybridScraper.idExtractionDebounce.lastResult = driverIds as string[];
      return driverIds as string[];

    } catch (error: any) {
      console.error('❌ Erro ao extrair IDs dos motoristas:', error.message);
      console.log('🔍 Tentando abordagem alternativa...');

      try {
        // Abordagem alternativa: buscar por seletores diferentes
        const alternativeIds = await this.page.$$eval(
          'td.ng-binding.sorting_1, td[class*="sorting_1"]',
          cells => cells.map(cell => cell.textContent?.trim()).filter(id => id && /^\d+$/.test(id))
        );

        if (alternativeIds.length > 0) {
          console.log(`✅ Abordagem alternativa funcionou! ${alternativeIds.length} IDs encontrados:`);
          alternativeIds.forEach((id, index) => {
            console.log(`   ${index + 1}. ${id}`);
          });
          // 💾 Armazenar resultado no cache
          RidesDashboardHybridScraper.idExtractionDebounce.lastResult = alternativeIds as string[];
          return alternativeIds as string[];
        }

        throw new Error('Nenhuma abordagem funcionou');

      } catch (altError: any) {
        console.error('❌ Abordagem alternativa também falhou:', altError.message);
        return [];
      }
    } finally {
      this.isExtractingIds = false; // Limpar flag sempre
      RidesDashboardHybridScraper.idExtractionDebounce.isExtracting = false; // Limpar flag global
    }
  }

  /**
   * Navega para página Active Drivers usando clique no menu
   */
  private async navigateToActiveDrivers(): Promise<void> {
    if (!this.page) throw new Error('Página não disponível');

    console.log('🔍 Verificando se já está na página Active Drivers...');
    const currentUrl = this.page.url();
    
    if (currentUrl.includes('/app/active-drivers')) {
      console.log('✅ Já está na página Active Drivers');
      return;
    }

    console.log('🌐 Navegando para página Active Drivers via clique no menu...');
    
    try {
      // Tentar clicar no menu Active Drivers
      const activeDriversMenuSelectors = [
        'span:has-text("Active Drivers")',
        'a[href="#/app/active-drivers"]',
        '*[ng-click*="activeDrivers"]'
      ];

      let menuClicked = false;
      for (const selector of activeDriversMenuSelectors) {
        try {
          console.log(`   Tentando seletor: ${selector}`);
          const element = await this.page.$(selector);
          if (element && await element.isVisible()) {
            console.log(`✅ Elemento encontrado e visível: ${selector}`);
            await element.click();
            menuClicked = true;
            break;
          }
        } catch (e) {
          console.log(`   ❌ Seletor ${selector} falhou`);
        }
      }

      if (!menuClicked) {
        throw new Error('Não foi possível clicar no menu Active Drivers');
      }

      console.log('🖱️ Clique executado no menu Active Drivers');
      
      // Aguardar navegação
      console.log('⏳ Aguardando página carregar após clique...');
      await this.page.waitForTimeout(3000);

      const newUrl = this.page.url();
      console.log(`📍 URL após clique: ${newUrl}`);

      if (!newUrl.includes('/app/active-drivers')) {
        throw new Error('URL não mudou para Active Drivers após clique');
      }

      console.log('✅ Navegação para Active Drivers concluída');

    } catch (error: any) {
      console.error('❌ Erro ao navegar para Active Drivers:', error.message);
      throw error;
    }
  }

  /**
   * 🔍 VALIDAÇÃO CRUZADA: Busca dados do motorista na tabela Active Drivers para validação
   */
  private async getDriverDataFromTable(driverId: string): Promise<{ id: string; name: string; status: string } | null> {
    if (!this.page) return null;

    try {
      console.log(`🔍 Buscando dados do driver ${driverId} na tabela Active Drivers para validação...`);
      
      // Navegar para Active Drivers se necessário
      const currentUrl = this.page.url();
      if (!currentUrl.includes('active-drivers')) {
        await this.navigateToActiveDrivers();
        await this.smartWait('pageLoad');
      }

      // Clicar em "See All" se necessário
      const seeAllButton = await this.page.$('button:has-text("See All")');
      if (seeAllButton) {
        await seeAllButton.click();
        await this.smartWait('pageLoad');
      }

      // Extrair linha específica do motorista da tabela
      const driverRowData = await this.page.evaluate((targetDriverId) => {
        const table = document.querySelector('#activeDriver');
        if (!table) return null;

        const rows = table.querySelectorAll('tbody tr');
        for (const row of rows) {
          const cells = row.querySelectorAll('td');
          if (cells.length === 0) continue;

          const rowDriverId = cells[0]?.textContent?.trim();
          if (rowDriverId === targetDriverId) {
            return {
              id: cells[0]?.textContent?.trim() || '',
              name: cells[1]?.textContent?.trim() || '',
              franchise: cells[2]?.textContent?.trim() || '',
              city: cells[3]?.textContent?.trim() || '',
              mobile: cells[4]?.textContent?.trim() || '',
              email: cells[5]?.textContent?.trim() || '',
              status: cells[6]?.textContent?.trim() || '',
              registeredOn: cells[7]?.textContent?.trim() || '',
              vehicleNumber: cells[8]?.textContent?.trim() || '',
              rides7Days: cells[9]?.textContent?.trim() || '',
              rides30Days: cells[10]?.textContent?.trim() || '',
              lastLogin: cells[11]?.textContent?.trim() || '',
              lastRide: cells[12]?.textContent?.trim() || '',
              driverRatings: cells[13]?.textContent?.trim() || '',
              otp: cells[14]?.textContent?.trim() || ''
            };
          }
        }
        return null;
      }, driverId);

      if (driverRowData) {
        console.log(`✅ Dados do driver ${driverId} encontrados na tabela:`, {
          id: driverRowData.id,
          name: driverRowData.name,
          status: driverRowData.status
        });
        
        return {
          id: driverRowData.id,
          name: driverRowData.name,
          status: driverRowData.status
        };
      } else {
        console.log(`⚠️ Driver ${driverId} não encontrado na tabela Active Drivers`);
        return null;
      }
    } catch (error: any) {
      console.error(`❌ Erro ao buscar dados na tabela:`, error.message);
      return null;
    }
  }

  /**
   * Extrai dados pessoais de um motorista específico
   */
  async extractDriverData(driverId: string): Promise<any> {
    if (!this.page || !this.isLoggedIn) {
      throw new Error('Scraper não inicializado ou não logado');
    }

    // 🔒 Verificar se há conflito com extração de IDs
    if (this.isExtractingIds) {
      console.log('⚠️ Extração de IDs em andamento, aguardando...');
      let waitTime = 0;
      while (this.isExtractingIds && waitTime < 30000) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        waitTime += 1000;
      }
      if (this.isExtractingIds) {
        throw new Error('Conflito: Extração de IDs em andamento há muito tempo');
      }
    }

    // 🔒 CONTROLE DE CONCORRÊNCIA: Aguardar slot livre
    await this.waitForExtractionSlot();

    // 🕒 THROTTLING: Garantir delay humano entre operações
    await this.ensureHumanDelay();

    // 🔒 MARCAR COMO EM PROCESSAMENTO
    console.log(`🔒 Adquirindo slot de extração para driver ${driverId}...`);
    this.isProcessingDriverData = true;

    console.log(`📊 🎯 INICIANDO EXTRAÇÃO DO MOTORISTA: ${driverId}`);

    try {
      // 🔍 FASE 1: Validar sessão
      console.log('🔍 FASE 1: Validando sessão...');
      const currentUrl = this.page.url();
      if (currentUrl.includes('/page/login') || currentUrl.includes('#/page/login')) {
        console.log('❌ SESSÃO PERDIDA! Retornando à página de login...');
        this.isLoggedIn = false;
        throw new Error('Sessão perdida - necessário login manual');
      }

      // 🌐 FASE 1: Navegação segura para Dashboard
      console.log('🌐 FASE 1: Navegando para Dashboard...');
      await this.browserManager.navigateWithLock(this.DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 15000 });
      
      // Verificar se foi redirecionado para login após navegação
      const newUrl = this.page.url();
      console.log(`📍 URL atual: ${newUrl}`);
      
      if (newUrl.includes('/page/login') || newUrl.includes('#/page/login')) {
        console.log('❌ REDIRECIONADO PARA LOGIN! Sessão expirou...');
        this.isLoggedIn = false;
        throw new Error('Sessão expirou - redirecionado para login');
      }

      // ⏳ FASE 2: Aguardar carregamento completo da página
      console.log('⏳ FASE 2: Aguardando carregamento completo da página...');
      await this.page.waitForLoadState('domcontentloaded');
      console.log('✅ DOM carregado');
      
      // Aguardar AngularJS carregar (mais tempo)
      console.log('⏳ Aguardando AngularJS carregar (5 segundos)...');
      await this.smartWait('pageLoad');

      // 🎯 FASE 3: Buscar campo driverId com validação robusta
      console.log('🔍 FASE 3: Procurando campo #driverId...');
      
      // Tentar múltiplos seletores para o campo driverId (MANTENDO OS SELETORES ORIGINAIS)
      const possibleSelectors = [
        '#driverId',
        'input[placeholder*="driver"]',
        'input[placeholder*="Driver"]', 
        'input[ng-model*="driver"]',
        'input[name="driverId"]',
        'input[id*="driver"]'
      ];
      
      let driverIdField = null;
      let usedSelector = '';
      
      for (const selector of possibleSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 }); // Aumentei o timeout
          driverIdField = selector;
          usedSelector = selector;
          console.log(`✅ Campo encontrado com seletor: ${selector}`);
          break;
        } catch {
          console.log(`⚠️ Seletor ${selector} não encontrado, tentando próximo...`);
        }
      }
      
      if (!driverIdField) {
        console.log('❌ Nenhum campo de driverId encontrado!');
        console.log('🔍 Verificando se ainda está logado...');
        
        // Verificar se perdeu o login
        const currentUrl = this.page.url();
        if (currentUrl.includes('login')) {
          console.log('❌ SESSÃO PERDIDA - Voltou para página de login!');
          this.isLoggedIn = false;
          throw new Error('Sessão perdida - necessário fazer login novamente');
        }
        
        throw new Error('Campo driverId não encontrado em nenhum seletor');
      }

      // � FASE 4: Preenchimento seguro do campo
      console.log('📝 FASE 4: Preenchendo campo de driver ID...');
      
      // Limpar campo com delay humano
      await this.page.fill(usedSelector, '');
      await this.smartWait('elementWait');
      
      // Preencher campo com delay humano
      await this.page.fill(usedSelector, driverId);
      await this.smartWait('elementWait');

      console.log(`⌨️ Preenchido ID: ${driverId} usando seletor: ${usedSelector}`);

      // 🔘 FASE 5: Clique no botão com validação
      console.log('🔘 FASE 5: Procurando e clicando no botão Details Driver...');
      
      // Aguardar botão estar disponível (MANTENDO O SELETOR ORIGINAL)
      await this.page.waitForSelector('button[ng-click="getDriverInfo(enteredDriverValue)"]', { timeout: 10000 });
      await this.smartWait('elementWait');
      
      // Clicar no botão
      await this.page.click('button[ng-click="getDriverInfo(enteredDriverValue)"]');
      console.log('🔍 Botão "Details Driver" clicado');

      // ⏳ FASE 6: Aguardar dados carregarem com validação do Driver ID correto
      console.log('⏳ FASE 6: Aguardando dados do motorista carregarem...');
      await this.smartWait('pageLoad'); // 5 segundos base * multiplicador

      // 🔍 VALIDAÇÃO: Aguardar o Driver ID correto aparecer na página
      console.log(`🔍 FASE 6.1: Validando se driver ${driverId} carregou corretamente...`);
      
      let validationAttempts = 0;
      const maxValidationAttempts = 5;
      let driverIdFound = false;
      
      while (!driverIdFound && validationAttempts < maxValidationAttempts) {
        try {
          // Buscar pelo Driver ID na página usando diferentes estratégias
          const pageDriverId = await this.page.evaluate((targetId) => {
            // Estratégia 1: Buscar em labels próximos a "Driver ID"
            const labels = Array.from(document.querySelectorAll('label, span, div'));
            for (const label of labels) {
              const text = label.textContent?.trim() || '';
              if (text.includes('Driver ID') || text === 'Driver ID') {
                const nextElement = label.nextElementSibling;
                if (nextElement) {
                  const nextText = nextElement.textContent?.trim() || '';
                  if (nextText === targetId) return nextText;
                }
                // Verificar elementos próximos
                const parent = label.parentElement;
                if (parent) {
                  const siblings = Array.from(parent.children);
                  for (const sibling of siblings) {
                    const siblingText = sibling.textContent?.trim() || '';
                    if (siblingText === targetId) return siblingText;
                  }
                }
              }
            }
            
            // Estratégia 2: Buscar o ID diretamente no texto
            const allElements = Array.from(document.querySelectorAll('*'));
            for (const el of allElements) {
              if (el.textContent?.trim() === targetId) {
                return targetId;
              }
            }
            
            return null;
          }, driverId);

          if (pageDriverId === driverId) {
            console.log(`✅ Driver ID ${driverId} confirmado na página`);
            driverIdFound = true;
          } else {
            validationAttempts++;
            console.log(`⚠️ Driver ID ${driverId} não encontrado na página (tentativa ${validationAttempts}/${maxValidationAttempts})`);
            await this.smartWait('elementWait'); // Aguardar mais um pouco
          }
        } catch (error) {
          validationAttempts++;
          console.log(`⚠️ Erro na validação do Driver ID (tentativa ${validationAttempts}/${maxValidationAttempts}):`, error);
          await this.smartWait('elementWait');
        }
      }

      if (!driverIdFound) {
        console.error(`❌ ERRO: Driver ID ${driverId} não apareceu na página após ${maxValidationAttempts} tentativas`);
        throw new Error(`Driver ID ${driverId} não carregou na página - dados podem ser de outro motorista`);
      }

      // 📊 FASE 7: Extração dos dados
      console.log('📊 FASE 7: Extraindo dados do motorista...');
      const driverData = await this.extractDriverDetails();

      // 🔍 VALIDAÇÃO CRÍTICA: Verificar se o ID extraído corresponde ao ID solicitado
      const extractedDriverId = driverData?.personal_data?.driver_id;
      const extractedDriverName = driverData?.personal_data?.driver_name;
      
      if (extractedDriverId && extractedDriverId !== driverId) {
        console.error(`❌ ERRO CRÍTICO: Solicitado driver ${driverId}, mas extraiu dados do driver ${extractedDriverId}`);
        console.error(`❌ DADOS INCORRETOS DETECTADOS - ABORTANDO SALVAMENTO`);
        throw new Error(`Dados incorretos: esperado ${driverId}, extraído ${extractedDriverId}`);
      }

      if (!extractedDriverId) {
        console.error(`❌ ERRO: Driver ID não encontrado nos dados extraídos`);
        throw new Error(`Driver ID não encontrado nos dados extraídos`);
      }

      // 🔍 VALIDAÇÃO CRUZADA: Comparar com dados da tabela Active Drivers
      console.log(`🔍 FASE 8: Validação cruzada com tabela Active Drivers...`);
      try {
        const tableDriverData = await this.getDriverDataFromTable(driverId);
        
        if (tableDriverData) {
          console.log(`📋 Dados da tabela - ID: ${tableDriverData.id}, Nome: ${tableDriverData.name}`);
          console.log(`📊 Dados extraídos - ID: ${extractedDriverId}, Nome: ${extractedDriverName}`);
          
          // Validar ID
          if (tableDriverData.id !== extractedDriverId) {
            console.error(`❌ CONFLITO DE ID: Tabela=${tableDriverData.id} vs Extraído=${extractedDriverId}`);
            throw new Error(`Conflito de dados: ID da tabela (${tableDriverData.id}) diferente do extraído (${extractedDriverId})`);
          }
          
          // Validar Nome (comparação mais flexível para nomes)
          if (extractedDriverName && tableDriverData.name) {
            const tableName = tableDriverData.name.toLowerCase().trim();
            const extractedName = extractedDriverName.toLowerCase().trim();
            
            // Verificar se os nomes são similares (considerando possíveis diferenças de formatação)
            const nameMatch = tableName === extractedName || 
                            tableName.includes(extractedName) || 
                            extractedName.includes(tableName);
                            
            if (!nameMatch) {
              console.error(`❌ CONFLITO DE NOME: Tabela="${tableDriverData.name}" vs Extraído="${extractedDriverName}"`);
              console.error(`❌ Os nomes não correspondem - possível dados de outro motorista`);
              throw new Error(`Conflito de dados: Nome da tabela (${tableDriverData.name}) diferente do extraído (${extractedDriverName})`);
            }
            
            console.log(`✅ NOME VALIDADO: "${tableDriverData.name}" ≈ "${extractedDriverName}"`);
          } else {
            console.log(`⚠️ Nome não disponível para comparação (tabela: ${tableDriverData.name}, extraído: ${extractedDriverName})`);
          }
          
          console.log(`✅ VALIDAÇÃO CRUZADA COMPLETA: Dados consistentes entre tabela e extração individual`);
          
        } else {
          console.log(`⚠️ Driver ${driverId} não encontrado na tabela Active Drivers - continuando com validação básica`);
        }
      } catch (tableError: any) {
        if (tableError.message.includes('Conflito de dados')) {
          // Se é erro de conflito de dados, rejeitar
          throw tableError;
        } else {
          // Se é erro técnico na busca da tabela, apenas alertar e continuar
          console.warn(`⚠️ Erro na validação cruzada (continuando): ${tableError.message}`);
        }
      }

      console.log(`✅ VALIDAÇÃO COMPLETA: Todos os dados correspondem ao driver ${driverId}`);
      
      const extractedData = {
        driverId,
        city: this.currentCity,
        extractedAt: new Date().toISOString(),
        data: driverData
      };

      // 💾 Salvar dados no PostgreSQL
      console.log(`💾 Salvando dados do motorista ${driverId} no PostgreSQL...`);
      try {
        const saved = await this.dataTransformer.saveDriverPersonalDetails(extractedData);
        if (saved) {
          console.log(`✅ Dados do motorista ${driverId} salvos com sucesso no banco de dados`);
        } else {
          console.log(`⚠️ Dados do motorista ${driverId} não foram salvos no banco (possível duplicação ou erro)`);
        }
      } catch (dbError: any) {
        console.error(`❌ Erro ao salvar dados do motorista ${driverId} no banco:`, dbError.message);
      }

      return extractedData;

    } catch (error) {
      console.error(`❌ Erro ao extrair dados de ${driverId}:`, error);
      
      // 🔍 DETECTAR SESSÃO PERDIDA E PARAR LOOP INFINITO
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('Sessão perdida') || 
          errorMessage.includes('Sessão expirou') ||
          errorMessage.includes('redirecionado para login')) {
        console.log('🛑 SESSÃO PERDIDA DETECTADA - PARANDO EXTRAÇÃO');
        this.isLoggedIn = false;
        throw new Error('SESSÃO_PERDIDA: Necessário login manual via VNC');
      }
      
      // Se é timeout do campo #driverId, verificar se ainda está logado
      if (errorMessage.includes('Timeout') && errorMessage.includes('#driverId')) {
        const currentUrl = this.page?.url() || '';
        if (currentUrl.includes('/page/login')) {
          console.log('🛑 TIMEOUT + PÁGINA LOGIN = SESSÃO PERDIDA');
          this.isLoggedIn = false;
          throw new Error('SESSÃO_PERDIDA: Campo não encontrado porque voltou ao login');
        }
      }
      
      throw error;
      
    } finally {
      // 🔓 SEMPRE LIBERAR O LOCK DE PROCESSAMENTO
      console.log(`🔓 Liberando slot de extração para driver ${driverId}...`);
      this.isProcessingDriverData = false;
      console.log('🔓 Slot de extração liberado');
    }
  }

  /**
   * Extrai detalhes do motorista da página atual
   */
  private async extractDriverDetails(): Promise<any> {
    if (!this.page) throw new Error('Página não disponível');

    try {
      console.log('📊 Aguardando página de detalhes carregar...');
      
      // ⏳ FASE 1: Aguardar estrutura HTML estar disponível
      console.log('⏳ FASE 1: Aguardando estrutura básica carregar...');
      await this.smartWait('pageLoad'); // 5 segundos base
      
      // ⏳ FASE 2: Aguardar dados AngularJS carregarem com validação
      console.log('⏳ FASE 2: Aguardando dados AngularJS carregarem...');
      
      // Tentar aguardar por elementos que indicam que os dados carregaram
      const dataLoadIndicators = [
        'label.ng-binding',
        '[ng-bind]',
        '.col-lg-5 label',
        '.row .col-lg-5'
      ];
      
      let dataLoaded = false;
      for (const indicator of dataLoadIndicators) {
        try {
          await this.page.waitForSelector(indicator, { timeout: 8000 });
          console.log(`✅ Indicador de dados encontrado: ${indicator}`);
          dataLoaded = true;
          break;
        } catch {
          console.log(`⚠️ Indicador ${indicator} não encontrado, tentando próximo...`);
        }
      }
      
      if (!dataLoaded) {
        console.log('⚠️ Nenhum indicador de dados encontrado, continuando com extração...');
      }
      
      // ⏳ FASE 3: Aguardar conteúdo específico carregar
      console.log('⏳ FASE 3: Aguardando conteúdo específico carregar...');
      await this.smartWait('extraction'); // 3 segundos para dados estabilizarem

      console.log('📋 Iniciando extração dos dados...');

      // Extrair dados pessoais e informações completas
      const driverData = await this.page.evaluate((currentCity) => {
        const result: any = {
          personal_data: {},
          rides_history: [],
          additional_info: {}
        };

        console.log('� Executando extração no navegador...');

        // ===== FUNÇÃO AUXILIAR BASEADA NA ESTRUTURA HTML REAL =====
        function extractFieldByLabel(labelText: string): string | null {
          console.log(`🔍 Procurando campo: "${labelText}"`);
          
          try {
            // === ESTRATÉGIA BASEADA NA ESTRUTURA REAL DO HTML ===
            // Estrutura: <div class="col-lg-5"><label>Campo</label></div> + <div class="col-lg-1">:</div> + <div class="col-lg-5">VALOR</div>
            
            // 1. Encontrar o label específico
            const labels = document.querySelectorAll('label.ng-binding');
            console.log(`📋 Encontrados ${labels.length} labels com .ng-binding`);
            
            for (const label of labels) {
              const labelTextContent = label.textContent?.trim();
              
              if (labelTextContent === labelText) {
                console.log(`✅ Label encontrada: "${labelTextContent}"`);
                
                // Encontrar o container col-lg-5 do label
                const labelContainer = label.closest('.col-lg-5');
                if (labelContainer) {
                  // Encontrar o container pai (row)
                  const rowContainer = labelContainer.closest('.row');
                  if (rowContainer) {
                    // Procurar pelo terceiro col-lg-5 (onde está o valor)
                    const columns = rowContainer.querySelectorAll('.col-lg-5');
                    
                    if (columns.length >= 3) {
                      const valueContainer = columns[2]; // Terceira coluna
                      
                      // Para o campo City, fazer uma busca mais específica
                      if (labelText === 'City') {
                        const cityText = valueContainer.textContent?.trim();
                        // Verificar se é realmente uma cidade (Matupá, etc.)
                        if (cityText && 
                            (cityText === 'Matupá' || cityText.match(/^[A-ZÁÊÇÕ][a-záêçõü]{2,25}$/)) &&
                            !cityText.includes('Date') && 
                            !cityText.includes('Register') &&
                            !cityText.includes('+') && 
                            !cityText.match(/^\d/)) {
                          console.log(`✅ City encontrada na estrutura correta: "${cityText}"`);
                          return cityText;
                        }
                      } else {
                        // Para outros campos, usar a lógica normal
                        // Primeiro tentar pegar link interno
                        const link = valueContainer.querySelector('a.ng-binding');
                        if (link) {
                          const linkText = link.textContent?.trim();
                          if (linkText && linkText.length > 0) {
                            console.log(`✅ Valor encontrado em link: "${linkText}"`);
                            return linkText;
                          }
                        }
                        
                        // Se não tem link, pegar o texto direto
                        const valueText = valueContainer.textContent?.trim();
                        if (valueText && valueText.length > 0 && valueText !== ':') {
                          console.log(`✅ Valor encontrado em div: "${valueText}"`);
                          return valueText;
                        }
                      }
                    }
                  }
                }
                
                // Estratégia alternativa: procurar próximo elemento com ng-binding
                const allElements = Array.from(document.querySelectorAll('*'));
                const labelIndex = allElements.indexOf(label);
                
                for (let i = labelIndex + 1; i < Math.min(labelIndex + 10, allElements.length); i++) {
                  const elem = allElements[i];
                  const text = elem.textContent?.trim();
                  
                  if (text && 
                      text !== labelText && 
                      text !== ':' &&
                      text.length > 0 &&
                      !text.includes(labelText) &&
                      elem.children.length === 0) { // Elemento folha
                    
                    console.log(`✅ Valor encontrado por proximidade: "${text}"`);
                    return text;
                  }
                }
              }
            }
            
            // 2. ESTRATÉGIAS ESPECÍFICAS POR CAMPO (fallback)
            if (labelText === 'Driver ID') {
              // Buscar especificamente por link com ng-click="redirectToDriverProfile"
              const driverLink = document.querySelector('a[ng-click*="redirectToDriverProfile"]');
              if (driverLink) {
                const driverIdText = driverLink.textContent?.trim();
                if (driverIdText && /^\d{8}$/.test(driverIdText)) {
                  console.log(`✅ Driver ID encontrado em link específico: "${driverIdText}"`);
                  return driverIdText;
                }
              }
              
              // Buscar por números de 8 dígitos em elementos ng-binding
              const ngElements = document.querySelectorAll('.ng-binding, .ng-scope');
              for (const elem of ngElements) {
                const text = elem.textContent?.trim();
                if (text && /^\d{8}$/.test(text)) {
                  console.log(`✅ Driver ID encontrado por pattern: "${text}"`);
                  return text;
                }
              }
            }
            
            if (labelText === 'Driver Name') {
              // Buscar em divs com class ng-binding que contenham nomes
              const nameElements = document.querySelectorAll('.col-lg-5.ng-binding');
              for (const elem of nameElements) {
                const text = elem.textContent?.trim();
                if (text && text.match(/^[A-Za-z\s]{3,50}$/) && !text.match(/^\d/) && !text.includes('+') && !text.includes('@')) {
                  console.log(`✅ Driver Name encontrado: "${text}"`);
                  return text;
                }
              }
            }
            
            if (labelText === 'Phone No') {
              // Buscar por padrão de telefone
              const phoneElements = document.querySelectorAll('.ng-binding');
              for (const elem of phoneElements) {
                const text = elem.textContent?.trim();
                if (text && text.match(/^\+\d{13}$/)) {
                  console.log(`✅ Phone encontrado: "${text}"`);
                  return text;
                }
              }
            }
            
            if (labelText === 'City') {
              // Buscar por nomes de cidade em elementos ng-binding
              const cityElements = document.querySelectorAll('.col-lg-5.ng-binding');
              for (const elem of cityElements) {
                const text = elem.textContent?.trim();
                // Procurar especificamente por "Matupá" ou outras cidades brasileiras
                if (text && (text === 'Matupá' || text.match(/^[A-ZÁÊÇÕ][a-záêçõü]{2,20}$/))) {
                  console.log(`✅ City encontrada: "${text}"`);
                  return text;
                }
              }
              
              // Buscar em todos os elementos ng-binding por nomes de cidade
              const allBindingElements = document.querySelectorAll('.ng-binding');
              for (const elem of allBindingElements) {
                const text = elem.textContent?.trim();
                if (text && (text === 'Matupá' || text.match(/^[A-ZÁÊÇÕ][a-záêçõü]{2,20}$/)) && 
                    !text.includes('Date') && !text.includes('Driver') && !text.includes('+') && 
                    !text.match(/^\d/) && text.length >= 3 && text.length <= 25) {
                  console.log(`✅ City encontrada em .ng-binding: "${text}"`);
                  return text;
                }
              }
            }
            
            console.log(`❌ Campo "${labelText}" não encontrado`);
            return null;
            
          } catch (error) {
            console.error(`❌ Erro ao extrair "${labelText}":`, error);
            return null;
          }
        }

        // ===== EXTRAIR DADOS PESSOAIS =====
        console.log('📋 Extraindo dados pessoais...');
        
        try {
          // Dados básicos (coluna 1)
          result.personal_data.driver_id = extractFieldByLabel('Driver ID');
          result.personal_data.driver_name = extractFieldByLabel('Driver Name');
          result.personal_data.status = extractFieldByLabel('Status');
          result.personal_data.phone_no = extractFieldByLabel('Phone No');
          
          // Para a cidade, usar a cidade já identificada no início
          result.personal_data.city = currentCity; // Usar Matupá que foi identificado no início
          
          result.personal_data.joining_date = extractFieldByLabel('Joining Date');
          result.personal_data.dob = extractFieldByLabel('DOB');
          result.personal_data.vehicle_no = extractFieldByLabel('Vehicle No');
          result.personal_data.app_version = extractFieldByLabel('App Version');
          result.personal_data.device = extractFieldByLabel('Device');
          result.personal_data.os_version = extractFieldByLabel('OS version');

          // Dados financeiros e de corridas (coluna 2)
          result.personal_data.today_completed_rides = extractFieldByLabel("Today's Completed Rides");
          result.personal_data.hold_payment = extractFieldByLabel('Hold Payment');
          result.personal_data.bank_account_no = extractFieldByLabel('Bank Account No.');
          result.personal_data.ongoing_ride = extractFieldByLabel('Ongoing Ride');
          result.personal_data.credit_wallet_balance = extractFieldByLabel('Credit Wallet Balance');
          result.personal_data.faulty_rides_percentage = extractFieldByLabel('Faulty Rides Percentage');
          result.personal_data.vehicle_type = extractFieldByLabel('Vehicle Type');

          // Dados de localização e atividade (coluna 3)
          result.personal_data.last_ride_on = extractFieldByLabel('Last Ride On');
          result.personal_data.last_latitude_longitude = extractFieldByLabel('Last Latitude Longitude');
          result.personal_data.last_login_at = extractFieldByLabel('Last Login At');
          result.personal_data.last_location_updated_at = extractFieldByLabel('Last Location Updated At');
          result.personal_data.ride_avg_7_days = extractFieldByLabel('Ride Avg (Last 7 Days)');
          result.personal_data.last_driver_ref_on = extractFieldByLabel('Last Driver Ref On');
          result.personal_data.ref_avg_7_days = extractFieldByLabel('Ref. Avg (Last 7 Days)');
          result.personal_data.today_first_login_at = extractFieldByLabel("Today's First Login At");

          console.log('✅ Dados pessoais extraídos');
        } catch (personalError) {
          console.error('❌ Erro ao extrair dados pessoais:', personalError);
        }

        // ===== EXTRAIR HISTÓRICO DE CORRIDAS =====
        console.log('🚗 Procurando tabela de corridas...');
        
        try {
          // === ESTRATÉGIA BASEADA NA ESTRUTURA HTML REAL ===
          
          // A tabela de corridas está na aba "RIDES" que já deve estar ativa
          // Procurar especificamente pela tabela com classe t-fancy-table na aba RIDES
          const ridesTable = document.querySelector('table.t-fancy-table tbody');
          
          if (ridesTable) {
            console.log('✅ Tabela de corridas encontrada');
            
            // Procurar por todas as linhas tr dentro do tbody
            const rows = ridesTable.querySelectorAll('tr[ng-repeat*="driverSummary.info"], tr.ng-scope');
            console.log(`📊 Encontradas ${rows.length} corridas no histórico`);
            
            for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const cells = row.querySelectorAll('td');
              
              console.log(`🔍 Linha ${i + 1}: ${cells.length} células`);
              
              if (cells.length >= 8) {
                // Extrair dados baseado na estrutura real: S.No, Engagement ID, Customer ID, Driver Rating, Drop Time, Distance, Google Distance, Duration, Fare
                const ride = {
                  s_no: cells[0]?.textContent?.trim() || (i + 1).toString(),
                  engagement_id: '',
                  customer_id: '',
                  driver_rating: cells[3]?.textContent?.trim() || 'N/A',
                  drop_time: cells[4]?.textContent?.trim() || 'N/A',
                  distance_travelled: cells[5]?.textContent?.trim() || 'N/A',
                  google_distance: cells[6]?.textContent?.trim() || 'N/A',
                  duration: cells[7]?.textContent?.trim() || 'N/A',
                  fare: cells[8]?.textContent?.trim() || 'N/A',
                  start_end_case: cells.length > 9 ? cells[9]?.textContent?.trim() : 'N/A'
                };
                
                // Extrair Engagement ID (célula 1) - pode estar vazio na estrutura real
                const engagementCell = cells[1];
                if (engagementCell) {
                  // Primeiro tentar pegar de um link
                  const engagementLink = engagementCell.querySelector('a');
                  if (engagementLink) {
                    ride.engagement_id = engagementLink.textContent?.trim() || '';
                  } else {
                    // Se não tem link, pegar texto direto
                    const engagementText = engagementCell.textContent?.trim();
                    if (engagementText && engagementText.length > 0) {
                      ride.engagement_id = engagementText;
                    }
                  }
                }
                
                // Extrair Customer ID (célula 2) - pode estar vazio na estrutura real
                const customerCell = cells[2];
                if (customerCell) {
                  // Primeiro tentar pegar de um link
                  const customerLink = customerCell.querySelector('a');
                  if (customerLink) {
                    ride.customer_id = customerLink.textContent?.trim() || '';
                  } else {
                    // Se não tem link, pegar texto direto
                    const customerText = customerCell.textContent?.trim();
                    if (customerText && customerText.length > 0) {
                      ride.customer_id = customerText;
                    }
                  }
                }
                
                // Adicionar corrida mesmo se engagement_id estiver vazio (pela estrutura real pode estar vazio)
                // Verificar se tem pelo menos dados válidos de drop_time ou fare
                if (ride.drop_time && ride.drop_time !== 'N/A' && ride.drop_time.length > 0) {
                  result.rides_history.push(ride);
                  console.log(`✅ Corrida ${i + 1}: Drop Time ${ride.drop_time}, Fare ${ride.fare}, Distance ${ride.distance_travelled}`);
                } else {
                  console.log(`⚠️ Corrida ${i + 1}: dados insuficientes - drop_time vazio`);
                }
              } else {
                console.log(`⚠️ Linha ${i + 1}: apenas ${cells.length} células (mínimo 8 necessário)`);
              }
            }
            
            // Se não encontrou nenhuma corrida, tentar uma abordagem mais ampla
            if (result.rides_history.length === 0) {
              console.log('🔍 Tentando busca mais ampla por corridas...');
              
              // Procurar todas as linhas tr no documento
              const allRows = document.querySelectorAll('tbody tr');
              console.log(`📊 Encontradas ${allRows.length} linhas totais no documento`);
              
              for (let i = 0; i < allRows.length; i++) {
                const row = allRows[i];
                const cells = row.querySelectorAll('td');
                
                if (cells.length >= 5) {
                  // Verificar se parece com dados de corrida (tem data e valores)
                  const timeCell = cells[4]?.textContent?.trim();
                  const fareCell = cells[8]?.textContent?.trim();
                  
                  if (timeCell && timeCell.includes('/') && timeCell.includes(':')) {
                    const ride = {
                      s_no: cells[0]?.textContent?.trim() || (i + 1).toString(),
                      engagement_id: cells[1]?.textContent?.trim() || 'N/A',
                      customer_id: cells[2]?.textContent?.trim() || 'N/A',
                      driver_rating: cells[3]?.textContent?.trim() || 'N/A',
                      drop_time: timeCell,
                      distance_travelled: cells[5]?.textContent?.trim() || 'N/A',
                      google_distance: cells[6]?.textContent?.trim() || 'N/A',
                      duration: cells[7]?.textContent?.trim() || 'N/A',
                      fare: fareCell || 'N/A',
                      start_end_case: cells.length > 9 ? cells[9]?.textContent?.trim() : 'N/A'
                    };
                    
                    result.rides_history.push(ride);
                    console.log(`✅ Corrida alternativa ${result.rides_history.length}: ${ride.drop_time}, Fare ${ride.fare}`);
                  }
                }
              }
            }
            
          } else {
            console.log('⚠️ Tabela de corridas não encontrada');
            
            // Debug: mostrar todas as tabelas disponíveis
            const allTables = document.querySelectorAll('table');
            console.log(`🔍 Total de tabelas na página: ${allTables.length}`);
            
            allTables.forEach((table, index) => {
              const className = table.className;
              const rowCount = table.querySelectorAll('tr').length;
              console.log(`   Tabela ${index + 1}: classe="${className}", ${rowCount} linhas`);
            });
          }
          
          console.log(`✅ Total de corridas extraídas: ${result.rides_history.length}`);
        } catch (ridesError) {
          console.error('❌ Erro ao extrair histórico de corridas:', ridesError);
        }

        console.log('✅ Extração de dados concluída no navegador');
        return result;
      }, this.currentCity);    // ===== EXTRAIR WALLET TRANSACTIONS (FORA DO EVALUATE) =====
    console.log('💰 Extraindo transações da carteira...');
    
    try {
      // Clicar na aba WALLET TRANSACTIONS
      const walletTabClicked = await this.page.evaluate(() => {
        const walletTabs = Array.from(document.querySelectorAll('md-tab-item'));
        
        for (const tab of walletTabs) {
          const tabText = tab.textContent?.trim();
          if (tabText && tabText.includes('WALLET TRANSACTIONS')) {
            console.log('✅ Aba WALLET TRANSACTIONS encontrada, clicando...');
            (tab as HTMLElement).click();
            return true;
          }
        }
        
        console.log('⚠️ Aba WALLET TRANSACTIONS não encontrada');
        return false;
      });
      
      if (walletTabClicked) {
        // Aguardar carregar
        await this.page.waitForTimeout(3000);
        
        // Extrair dados da tabela de transações
        const walletTransactions = await this.page.evaluate(() => {
          const transactions: any[] = [];
          
          try {
            const walletTable = document.querySelector('table#creditLogs tbody, table[aria-describedby="creditLogs_info"] tbody');
            
            if (walletTable) {
              console.log('✅ Tabela de transações encontrada');
              
              const walletRows = walletTable.querySelectorAll('tr[ng-repeat*="creditLogs"], tr.ng-scope, tr.odd, tr.even');
              console.log(`💳 Encontradas ${walletRows.length} transações`);
              
              for (let i = 0; i < walletRows.length; i++) {
                const row = walletRows[i];
                const cells = row.querySelectorAll('td');
                
                if (cells.length >= 4) {
                  const transaction = {
                    transaction_time: cells[0]?.textContent?.trim() || 'N/A',
                    engagement_id: cells[1]?.textContent?.trim() || 'N/A',
                    amount: cells[2]?.textContent?.trim() || 'N/A',
                    type: cells[3]?.textContent?.trim() || 'N/A' // D/C/CB/DAC
                  };
                  
                  // Verificar se tem dados válidos
                  if (transaction.transaction_time && transaction.transaction_time !== 'N/A' && transaction.transaction_time.length > 0) {
                    transactions.push(transaction);
                    console.log(`✅ Transação ${i + 1}: ${transaction.transaction_time}, ${transaction.type}, ${transaction.amount}`);
                  }
                }
              }
              
              console.log(`✅ Total de transações extraídas: ${transactions.length}`);
            } else {
              console.log('⚠️ Tabela de transações não encontrada');
            }
          } catch (error) {
            console.error('❌ Erro ao extrair transações:', error);
          }
          
          return transactions;
        });
        
        driverData.wallet_transactions = walletTransactions;
      }
    } catch (walletError) {
      console.error('❌ Erro ao extrair wallet transactions:', walletError);
    }

    // ===== EXTRAIR SUBSCRIPTION HISTORY (FORA DO EVALUATE) =====
    console.log('📋 Extraindo histórico de assinaturas...');
    
    try {
      // Clicar na aba Subscription History
      const subscriptionTabClicked = await this.page.evaluate(() => {
        const subscriptionTabs = Array.from(document.querySelectorAll('md-tab-item'));
        
        for (const tab of subscriptionTabs) {
          const tabText = tab.textContent?.trim();
          if (tabText && tabText.includes('Subscription History')) {
            console.log('✅ Aba Subscription History encontrada, clicando...');
            (tab as HTMLElement).click();
            return true;
          }
        }
        
        console.log('⚠️ Aba Subscription History não encontrada');
        return false;
      });
      
      if (subscriptionTabClicked) {
        // Aguardar carregar
        await this.page.waitForTimeout(3000);
        
        // Extrair dados da tabela de assinaturas
        const subscriptionHistory = await this.page.evaluate(() => {
          const subscriptions: any[] = [];
          
          try {
            const subscriptionTable = document.querySelector('table#driverSubscriptionsTable tbody, table[aria-describedby="driverSubscriptionsTable_info"] tbody');
            
            if (subscriptionTable) {
              console.log('✅ Tabela de assinaturas encontrada');
              
              const subscriptionRows = subscriptionTable.querySelectorAll('tr[ng-repeat*="driverSubscriptionHistory"], tr:not(:has(.dataTables_empty))');
              console.log(`📑 Encontradas ${subscriptionRows.length} linhas de assinatura`);
              
              for (let i = 0; i < subscriptionRows.length; i++) {
                const row = subscriptionRows[i];
                const cells = row.querySelectorAll('td');
                
                // Verificar se não é a linha "No data available" e tem dados suficientes
                if (cells.length >= 12 && !row.querySelector('.dataTables_empty')) {
                  const subscription = {
                    s_no: cells[0]?.textContent?.trim() || 'N/A',
                    subscription_id: cells[1]?.textContent?.trim() || 'N/A',
                    title: cells[2]?.textContent?.trim() || 'N/A',
                    amount: cells[3]?.textContent?.trim() || 'N/A',
                    benefit_amount: cells[4]?.textContent?.trim() || 'N/A',
                    start_from: cells[5]?.textContent?.trim() || 'N/A',
                    end_on: cells[6]?.textContent?.trim() || 'N/A',
                    current_rides_count: cells[7]?.textContent?.trim() || 'N/A',
                    payment_mode: cells[8]?.textContent?.trim() || 'N/A',
                    payment_notes: cells[9]?.textContent?.trim() || 'N/A',
                    created_by: cells[10]?.textContent?.trim() || 'N/A',
                    updated_by: cells[11]?.textContent?.trim() || 'N/A',
                    status: cells[12]?.textContent?.trim() || 'N/A'
                  };
                  
                  // Verificar se tem dados válidos
                  if (subscription.subscription_id && subscription.subscription_id !== 'N/A' && subscription.subscription_id.length > 0) {
                    subscriptions.push(subscription);
                    console.log(`✅ Assinatura ${i + 1}: ${subscription.subscription_id}, ${subscription.title}, ${subscription.amount}`);
                  }
                }
              }
              
              console.log(`✅ Total de assinaturas extraídas: ${subscriptions.length}`);
              
              // Se não encontrou dados, verificar se tem a mensagem "No data available"
              const noDataMsg = subscriptionTable.querySelector('.dataTables_empty');
              if (noDataMsg) {
                console.log('ℹ️ Nenhum dado de assinatura disponível para este motorista');
              }
            } else {
              console.log('⚠️ Tabela de assinaturas não encontrada');
            }
          } catch (error) {
            console.error('❌ Erro ao extrair assinaturas:', error);
          }
          
          return subscriptions;
        });
        
        driverData.subscription_history = subscriptionHistory;
      }
    } catch (subscriptionError) {
      console.error('❌ Erro ao extrair subscription history:', subscriptionError);
    }

      // Log dos dados extraídos
      console.log('📊 Resumo dos dados extraídos:');
      console.log(`   🆔 Driver ID: ${driverData.personal_data.driver_id || 'N/A'}`);
      console.log(`   👤 Nome: ${driverData.personal_data.driver_name || 'N/A'}`);
      console.log(`   📱 Telefone: ${driverData.personal_data.phone_no || 'N/A'}`);
      console.log(`   🏙️ Cidade: ${driverData.personal_data.city || 'N/A'}`);
      console.log(`   ✅ Status: ${driverData.personal_data.status || 'N/A'}`);
      console.log(`   🚗 Corridas no histórico: ${driverData.rides_history.length}`);

      // Log da estrutura completa dos dados
      console.log(`   🔍 Estrutura retornada: {
  "driverId": "${driverData.personal_data.driver_id}",
  "city": "${driverData.personal_data.city}",
  "extractedAt": "${new Date().toISOString()}",
  "data": ${JSON.stringify(driverData, null, 4).replace(/^/gm, '    ')}
}`);

      return driverData;

    } catch (error: any) {
      console.warn('⚠️ Erro ao extrair detalhes:', error.message);
      return { 
        error: error.message,
        personal_data: {},
        rides_history: [],
        additional_info: {}
      };
    }
  }

  /**
   * Processa recarga para um motorista
   * Implementa integração real com interface web de recarga
   */
  async processRecharge(driverId: string, amount: number): Promise<boolean> {
    console.log(`💰 Processando recarga: ${driverId} - R$ ${amount}`);
    try {
      if (!this.page) throw new Error('Página não disponível');

      // 1. Navegar para dashboard principal (forçar URL correta)
      console.log('🌐 Navegando para Dashboard para recarga...');
      await this.browserManager.navigateWithLock('https://rides.ec2dashboard.com/#/app/dashboard', { waitUntil: 'networkidle' });
      await this.page.waitForTimeout(3000);

      // 2. Verificar URL atual
      const currentUrl = this.page.url();
      console.log(`📍 URL atual: ${currentUrl}`);

      // 2. Preencher ID do motorista
      console.log('🔍 Procurando campo #driverId...');
      await this.page.waitForSelector('#driverId', { timeout: 10000 });
      await this.page.fill('#driverId', driverId);
      console.log(`⌨️ Preenchido ID: ${driverId}`);

      // 3. Clicar em "Details Driver"
      await this.page.click('button:has-text("Details Driver")');
      console.log('🔍 Botão "Details Driver" clicado');

      // 4. Aguardar página de detalhes carregar
      await this.page.waitForTimeout(5000);

      // 5. Clicar no botão "Credit/Debit"
      await this.page.waitForSelector('button[ng-click="openPopUp()"]', { timeout: 15000 });
      await this.page.click('button[ng-click="openPopUp()"]');
      console.log('� Botão "Credit/Debit" clicado');

      // 6. Esperar modal aparecer
      await this.page.waitForSelector('#manageTransactions', { timeout: 10000 });
      console.log('� Modal de recarga aberto');

      // 7. Selecionar "Credit" no select
      await this.page.selectOption('select[ng-model="transaction.type"]', '1');
      console.log('✅ Tipo "Credit" selecionado');

      // 8. Preencher Amount
      await this.page.fill('input[ng-model="transaction.amount"]', amount.toString());
      console.log(`💵 Valor preenchido: ${amount}`);

      // 9. Preencher Reason
      const reason = `Recarga automática via API (${new Date().toISOString()})`;
      await this.page.fill('textarea[ng-model="transaction.reason"]', reason);
      console.log('📝 Motivo preenchido');

      // 10. Aguardar botão "Credit" habilitar após preenchimento e clicar
      console.log('⏳ Aguardando botão Credit ficar habilitado...');
      
      // Aguardar um pouco para os dados serem processados
      await this.page.waitForTimeout(2000);
      
      // Aguardar o botão ficar habilitado (não ter atributo disabled)
      await this.page.waitForSelector('button[ng-click="manageTransaction(transaction)"]:not([disabled])', { timeout: 15000 });
      
      // Verificar se realmente está habilitado
      const isEnabled = await this.page.isEnabled('button[ng-click="manageTransaction(transaction)"]');
      if (!isEnabled) {
        console.log('⚠️ Botão ainda desabilitado, aguardando mais...');
        await this.page.waitForTimeout(3000);
      }
      
      await this.page.click('button[ng-click="manageTransaction(transaction)"]');
      console.log('✅ Botão "Credit" clicado para finalizar recarga');

      // 11. Aguardar confirmação visual
      await this.page.waitForTimeout(3000);
      // (Opcional) Verificar mensagem de sucesso
      let success = false;
      try {
        await this.page.waitForSelector('.alert-success, .toast-success, [class*="success"]', { timeout: 5000 });
        success = true;
      } catch {}
      if (success) {
        console.log(`✅ Recarga processada com sucesso: ${driverId} - R$ ${amount}`);
      } else {
        console.log(`⚠️ Recarga enviada (sem confirmação visual): ${driverId} - R$ ${amount}`);
      }
      return true;
    } catch (error) {
      console.error(`❌ Erro ao processar recarga:`, error);
      return false;
    }
  }

  /**
   * Verifica se ainda está logado
   */
  async isStillLoggedIn(): Promise<boolean> {
    if (!this.page) return false;

    try {
      const currentUrl = this.page.url();
      
      // Se está em uma página do app, está logado
      if (currentUrl.includes('/app/dashboard') || 
          currentUrl.includes('/app/active-drivers') ||
          currentUrl.includes('#/app/')) {
        this.isLoggedIn = true;
        return true;
      }
      
      // Se não está, marca como deslogado
      this.isLoggedIn = false;
      return false;
      
    } catch {
      this.isLoggedIn = false;
      return false;
    }
  }

  /**
   * Obtém informações do estado atual
   */
  getStatus() {
    return {
      isLoggedIn: this.isLoggedIn,
      currentCity: this.currentCity,
      pageUrl: this.page?.url() || 'N/A',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Finaliza o scraper
   */
  async close(): Promise<void> {
    console.log('🔄 Fechando RidesDashboardHybridScraper...');
    
    try {
      await this.browserManager.closeBrowser();
      this.page = null;
      this.isLoggedIn = false;
      console.log('✅ Scraper fechado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao fechar scraper:', error);
    }
  }
}
