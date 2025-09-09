"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidesDashboardHybridScraper = void 0;
const browserSessionManager_1 = require("../services/browserSessionManager");
const dataTransformer_1 = require("../services/dataTransformer");
/**
 * Scraper específico para dashboard do Rides
 * Integra com o sistema híbrido de extração + recarga
 */
class RidesDashboardHybridScraper {
    constructor(instanceName = 'rides_scraper') {
        this.page = null;
        this.isLoggedIn = false;
        this.currentCity = '';
        this.isExtractingIds = false; // Flag para evitar extrações simultâneas
        // � CONTROLE DE VELOCIDADE CONFIGURÁVEL
        this.speedConfig = {
            // Multiplicador de velocidade (1.0 = normal, 2.0 = mais lento, 0.5 = mais rápido)
            speedMultiplier: parseFloat(process.env.HYBRID_SPEED_MULTIPLIER || '1.5'), // Padrão 50% mais lento
            // Delays base (serão multiplicados pelo speedMultiplier)
            baseDelays: {
                navigation: 3000, // Aguardar navegação
                pageLoad: 5000, // Aguardar carregamento de página
                elementWait: 2000, // Aguardar elementos
                extraction: 3000, // Entre extrações
                coordination: 1000 // Coordenação entre operações
            }
        };
        // URLs hardcoded conforme solicitado
        this.DASHBOARD_URL = 'https://rides.ec2dashboard.com/#/app/dashboard/'; // CORRIGIDO: Adicionada barra final
        this.ACTIVE_DRIVERS_URL = 'https://rides.ec2dashboard.com/#/app/active-drivers//';
        this.browserManager = browserSessionManager_1.BrowserSessionManager.getInstance(instanceName);
        this.dataTransformer = dataTransformer_1.DataTransformer.getInstance();
        // Log da configuração de velocidade
        console.log(`🐌 [HYBRID] Velocidade configurada: ${this.speedConfig.speedMultiplier}x (1.0=normal, >1.0=mais lento)`);
    }
    /**
     * 🐌 CONTROLE DE VELOCIDADE: Calcular delay baseado na configuração
     */
    getDelay(type) {
        const baseDelay = this.speedConfig.baseDelays[type];
        const adjustedDelay = Math.round(baseDelay * this.speedConfig.speedMultiplier);
        return adjustedDelay;
    }
    /**
     * 🕐 WAIT INTELIGENTE: Aguardar com delay configurável
     */
    async smartWait(type, customDelay) {
        const delay = customDelay || this.getDelay(type);
        if (this.page && !this.page.isClosed()) {
            await this.page.waitForTimeout(delay);
        }
    }
    /**
     * Inicializa o scraper e faz login
     */
    async initialize() {
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
        }
        catch (error) {
            console.error('❌ Erro ao inicializar scraper:', error);
            throw error;
        }
    }
    /**
     * Faz login usando o método que já funciona - ADAPTADO DO RIDES_SCRAPER
     */
    async performLogin(loginUrl, username, password) {
        if (!this.page)
            throw new Error('Página não disponível');
        console.log('🌐 [hybrid_scraper] Navegando para: ' + loginUrl + '...');
        await this.page.goto(loginUrl, { waitUntil: 'networkidle' });
        console.log('✅ [hybrid_scraper] Navegação concluída com sucesso');
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
            console.log('⚠️ Captcha presente, mas preenchendo campos de login e senha automaticamente antes do login manual');
            try {
                await this.page.fill('#exampleInputEmail1', username);
                await this.page.fill('#exampleInputPassword1', password);
                console.log('📝 Campos de login e senha preenchidos automaticamente mesmo com captcha visível.');
            }
            catch (e) {
                console.log('❌ Erro ao preencher campos de login e senha com captcha visível:', e);
            }
            await this.waitForManualLogin();
            return;
        }
        // Verificar se não há captcha oculto
        const captchaPresent = await this.page.isVisible('div[id*="captcha"], iframe[src*="captcha"], .g-recaptcha');
        if (captchaPresent) {
            console.log('📋 Captcha encontrado mas não visível:', await this.page.getAttribute('div[id*="captcha"]', 'id') || 'captcha element');
            console.log('✅ Nenhum captcha detectado - prosseguindo com login automático');
        }
        else {
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
            }
            else {
                console.log('❌ Ainda na página de login');
                console.log('❌ Falha no login automático, pode ter captcha não detectado');
                await this.waitForManualLogin();
            }
        }
        catch (error) {
            console.log('❌ Erro no login automático:', error);
            await this.waitForManualLogin();
        }
    }
    /**
     * Aguarda login manual via VNC - IGUAL AO RIDES_SCRAPER
     */
    async waitForManualLogin() {
        if (!this.page)
            throw new Error('Página não disponível');
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
                console.log('🔄 Aguardando um pouco para estabilizar a sessão...');
                await this.smartWait('elementWait'); // Aguardar um pouco para estabilizar
                return;
            }
            // Verificar se ainda está na página de login
            if (currentUrl.includes('/page/login') || currentUrl.includes('#/page/login')) {
                console.log('🔍 Verificando URL atual:', currentUrl);
                console.log('❌ Ainda na página de login');
                console.log(`⏳ Aguardando... (${elapsedTime}s/${maxWaitTime}s)`);
                await this.smartWait('navigation');
                elapsedTime += Math.round(this.getDelay('navigation') / 1000);
            }
            else {
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
    async checkIfLoggedIn() {
        if (!this.page)
            return false;
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
                }
                catch (error) {
                    console.log('⚠️ Erro ao verificar elementos da dashboard');
                    return false;
                }
            }
            return false;
        }
        catch (error) {
            console.log('❌ Erro ao verificar login:', error);
            return false;
        }
    }
    /**
     * Identifica a cidade atual clicando no menu Active Drivers
     */
    async identifyCity() {
        if (!this.page)
            throw new Error('Página não disponível');
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
                    }
                    else {
                        console.log(`   ❌ Elemento existe mas não está visível: ${selector}`);
                    }
                }
                catch (e) {
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
                }
                catch (e) {
                    console.log(`   ❌ Seletor ${selector} não encontrado`);
                }
            }
            if (cityElement) {
                const cityText = await cityElement.textContent();
                this.currentCity = (cityText === null || cityText === void 0 ? void 0 : cityText.trim()) || 'Cidade Desconhecida';
                console.log(`🏙️ Cidade identificada: "${this.currentCity}" (via ${foundSelector})`);
            }
            else {
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
        }
        catch (error) {
            console.warn('⚠️ Não foi possível identificar a cidade via menu Active Drivers');
            console.warn(`Erro: ${error.message}`);
            // Fallback para .env
            this.currentCity = process.env.CITY_NAME || 'Cidade Padrão';
            console.log(`📋 Usando cidade do .env como fallback: ${this.currentCity}`);
        }
        console.log(`✅ Scraper inicializado para cidade: ${this.currentCity}`);
    }
    /**
     * 🎯 SIMPLIFICADO: Apenas navega para dashboard sem verificações idiotas de login
     * O login JÁ FOI CONFIRMADO quando extraiu os IDs!
     */
    async prepareDashboardForBatch() {
        if (!this.page)
            throw new Error('Página não disponível');
        console.log('🎯 [SCRAPER] Preparando dashboard para processamento em lote de IDs...');
        try {
            const currentUrl = this.page.url();
            console.log(`🔍 [SCRAPER] URL atual antes de navegar: ${currentUrl}`);
            // Simplesmente navegar para o dashboard - PONTO!
            console.log('🌐 [SCRAPER] Navegando para Dashboard...');
            await this.page.goto(this.DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
            console.log('✅ [SCRAPER] Navegação para dashboard concluída');
            const newUrl = this.page.url();
            console.log(`📍 [SCRAPER] URL após navegação: ${newUrl}`);
            // Aguardar um pouco para estabilizar
            await this.page.waitForTimeout(1000);
            console.log('🎯 [SCRAPER] Dashboard pronto para processamento em lote');
        }
        catch (error) {
            console.error('❌ [SCRAPER] Erro ao preparar dashboard:', error.message);
            throw error;
        }
    }
    /**
     * Extrai todos os IDs dos motoristas da página Active Drivers
     */
    async extractAllDriverIds() {
        if (!this.page)
            throw new Error('Página não disponível');
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
                }
                catch (waitError) {
                    console.log('⚠️ Timeout aguardando tabela, tentando sem wait...');
                    // Continuar mesmo sem wait - talvez a tabela já esteja lá
                }
            }
            else {
                console.log('⚠️ Botão "See All" não encontrado, tentando extrair IDs diretamente...');
            }
            // Extrair todos os IDs da primeira coluna da tabela
            console.log('📋 Extraindo IDs da tabela de motoristas...');
            const driverIds = await this.page.$$eval('#activeDriver tbody tr td:first-child', cells => cells.map(cell => { var _a; return (_a = cell.textContent) === null || _a === void 0 ? void 0 : _a.trim(); }).filter(id => id && id !== ''));
            console.log(`✅ ${driverIds.length} IDs de motoristas extraídos:`);
            driverIds.forEach((id, index) => {
                console.log(`   ${index + 1}. ${id}`);
            });
            // 💾 Armazenar resultado no cache
            RidesDashboardHybridScraper.idExtractionDebounce.lastResult = driverIds;
            return driverIds;
        }
        catch (error) {
            console.error('❌ Erro ao extrair IDs dos motoristas:', error.message);
            console.log('🔍 Tentando abordagem alternativa...');
            try {
                // Abordagem alternativa: buscar por seletores diferentes
                const alternativeIds = await this.page.$$eval('td.ng-binding.sorting_1, td[class*="sorting_1"]', cells => cells.map(cell => { var _a; return (_a = cell.textContent) === null || _a === void 0 ? void 0 : _a.trim(); }).filter(id => id && /^\d+$/.test(id)));
                if (alternativeIds.length > 0) {
                    console.log(`✅ Abordagem alternativa funcionou! ${alternativeIds.length} IDs encontrados:`);
                    alternativeIds.forEach((id, index) => {
                        console.log(`   ${index + 1}. ${id}`);
                    });
                    // 💾 Armazenar resultado no cache
                    RidesDashboardHybridScraper.idExtractionDebounce.lastResult = alternativeIds;
                    return alternativeIds;
                }
                throw new Error('Nenhuma abordagem funcionou');
            }
            catch (altError) {
                console.error('❌ Abordagem alternativa também falhou:', altError.message);
                return [];
            }
        }
        finally {
            this.isExtractingIds = false; // Limpar flag sempre
            RidesDashboardHybridScraper.idExtractionDebounce.isExtracting = false; // Limpar flag global
        }
    }
    /**
     * Navega para página Active Drivers usando clique no menu
     */
    async navigateToActiveDrivers() {
        if (!this.page)
            throw new Error('Página não disponível');
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
                }
                catch (e) {
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
        }
        catch (error) {
            console.error('❌ Erro ao navegar para Active Drivers:', error.message);
            throw error;
        }
    }
    /**
     * Extrai dados pessoais de um motorista específico
     */
    async extractDriverData(driverId) {
        var _a;
        if (!this.page) {
            throw new Error('Scraper não inicializado');
        }
        console.log(`📊 Extraindo dados do motorista: ${driverId}`);
        try {
            // � FORÇAR MANUTENÇÃO DE SESSÃO ANTES DE QUALQUER VERIFICAÇÃO (ESPECÍFICO PARA DOCKER)
            if (this.isLoggedIn) {
                try {
                    // Salvar cookies e session storage ANTES de verificar URL
                    const cookies = await this.page.context().cookies();
                    if (cookies.length > 0) {
                        console.log(`🍪 [DOCKER-FIX] ${cookies.length} cookies mantidos na sessão`);
                    }
                    // Executar JavaScript para manter session storage
                    await this.page.evaluate(() => {
                        // Força manutenção de session storage
                        const authData = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
                        if (authData) {
                            sessionStorage.setItem('authToken', authData);
                            localStorage.setItem('authToken', authData);
                        }
                    }).catch(() => { }); // Ignora erros
                }
                catch (e) {
                    console.log('⚠️ [DOCKER-FIX] Erro ao manter sessão, mas continuando:', e.message);
                }
            }
            // �🔍 VERIFICAR SE AINDA ESTÁ LOGADO ANTES DE CONTINUAR - SEM FORÇAR LOGOUT
            const currentUrl = this.page.url();
            if (false) { // REMOVIDO: currentUrl.includes('/page/login') || currentUrl.includes('#/page/login')) {
                console.log(`🔍 [DEBUG-SESSAO] URL atual: ${currentUrl}`);
                console.log(`🔍 [DEBUG-SESSAO] Contém '/page/login': ${currentUrl.includes('/page/login')}`);
                console.log(`🔍 [DEBUG-SESSAO] Contém '#/page/login': ${currentUrl.includes('#/page/login')}`);
                console.log('⚠️ SESSÃO PERDIDA DETECTADA! Tentando recuperar automaticamente...');
                // EM VEZ DE RESETAR isLoggedIn, MANTER E TENTAR RECUPERAR
                console.log('🔄 [DOCKER-FIX] Mantendo isLoggedIn=true e tentando navegação direta para dashboard...');
                // REMOVIDO: Verificação problemática que forçava retorno para login
                /*
                  try {
                    // TENTAR NAVEGAR DIRETAMENTE PARA DASHBOARD PRIMEIRO
                    console.log('🎯 [DOCKER-FIX] Tentando navegar diretamente para dashboard sem perder sessão...');
                    if (!this.page) {
                      throw new Error('Página não disponível');
                    }
                    await this.page.goto(this.DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 15000 });
                    
                    const afterNavUrl = this.page.url();
                    if (!afterNavUrl.includes('/page/login')) {
                      console.log('✅ [DOCKER-FIX] Sucesso! Dashboard acessado sem perder sessão');
                      // Continuar normalmente sem resetar nada
                    } else {
                      throw new Error('Ainda na página de login após navegação');
                    }
                    
                  } catch (navError) {
                    console.log('❌ [DOCKER-FIX] Navegação direta falhou, tentando login automático...');
                    
                    // Só agora tentar recuperação automática
                    const username = process.env.RIDES_USERNAME;
                    const password = process.env.RIDES_PASSWORD;
                    
                    if (username && password && currentUrl) {
                      await this.performLogin(currentUrl, username, password);
                      console.log('✅ Sessão recuperada automaticamente');
                    } else {
                      throw new Error('Credenciais não disponíveis para recuperação automática');
                    }
                  }
                */
            }
            // 🎯 OTIMIZADO: Verificar se já está no dashboard, só navegar se necessário
            const currentUrlCheck = this.page.url();
            if (!currentUrlCheck.includes('/app/dashboard')) {
                console.log('🌐 Navegando para Dashboard para extração de dados...');
                console.log(`🌐 [hybrid_scraper] Navegando para: ${this.DASHBOARD_URL}...`);
                await this.page.goto(this.DASHBOARD_URL, { waitUntil: 'networkidle', timeout: 15000 });
                console.log('✅ [hybrid_scraper] Navegação concluída com sucesso');
            }
            else {
                console.log('✅ [hybrid_scraper] Já está no dashboard, prosseguindo...');
            }
            // Verificar se foi redirecionado para login após navegação
            const newUrl = this.page.url();
            console.log(`📍 URL atual: ${newUrl}`);
            if (false) { // REMOVIDO: newUrl.includes('/page/login') || newUrl.includes('#/page/login')) {
                console.log('❌ SESSÃO PERDIDA - Voltou para página de login!');
                throw new Error('Sessão perdida - necessário fazer login novamente');
            }
            // 🎯 VERIFICAÇÃO ROBUSTA DO CAMPO driverId
            console.log('🔍 Procurando campo #driverId...');
            // Aguardar página carregar completamente
            await this.page.waitForLoadState('domcontentloaded');
            await this.page.waitForTimeout(8000); // AUMENTADO PARA DOCKER/LINUX - Mais tempo para Angular carregar
            // 🐛 DEBUG: Imprimir HTML para ver o que tem na página
            try {
                const bodyHTML = await this.page.locator('body').innerHTML();
                console.log('🔍 [DEBUG] HTML da página dashboard (primeiros 1000 chars):');
                console.log(bodyHTML.substring(0, 1000));
                // Verificar se tem campos de input
                const inputCount = await this.page.locator('input').count();
                console.log(`🔍 [DEBUG] Total de inputs encontrados: ${inputCount}`);
                // Procurar especificamente por driverId
                const hasDriverId = await this.page.locator('#driverId').count();
                console.log(`🔍 [DEBUG] Campo #driverId encontrado: ${hasDriverId > 0 ? 'SIM' : 'NÃO'}`);
            }
            catch (debugError) {
                console.log('⚠️ [DEBUG] Erro ao imprimir HTML:', debugError);
            }
            // Tentar múltiplos seletores para o campo driverId COM TIMEOUT OTIMIZADO
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
            // 🔧 CORREÇÃO: Timeout mais baixo por seletor para evitar travamento
            for (const selector of possibleSelectors) {
                try {
                    await this.page.waitForSelector(selector, { timeout: 3000 }); // REDUZIDO de 10s para 3s
                    driverIdField = selector;
                    usedSelector = selector;
                    console.log(`✅ Campo encontrado com seletor: ${selector}`);
                    break;
                }
                catch (_b) {
                    // Continue para próximo seletor
                    console.log(`⚠️ Seletor ${selector} não encontrado, tentando próximo...`);
                }
            }
            if (!driverIdField) {
                console.log('❌ Nenhum campo de driverId encontrado!');
                // 🔍 DEBUG: Imprimir HTML da página para debug
                try {
                    const bodyHTML = await this.page.locator('body').innerHTML();
                    console.log('🔍 HTML da página (primeiros 1000 chars):');
                    console.log(bodyHTML.substring(0, 1000));
                }
                catch (debugError) {
                    console.log('❌ Erro ao obter HTML para debug:', debugError);
                }
                console.log('🔍 Verificando se ainda está logado...');
                // Verificar se perdeu o login
                const currentUrl = this.page.url();
                if (false) { // REMOVIDO: currentUrl.includes('login')) {
                    console.log('❌ SESSÃO PERDIDA - Voltou para página de login!');
                    this.isLoggedIn = false;
                    throw new Error('Sessão perdida - necessário fazer login novamente');
                }
                // Imprimir HTML para debug
                const bodyHTML = await this.page.locator('body').innerHTML();
                console.log('🔍 HTML da página (primeiros 500 chars):');
                console.log(bodyHTML.substring(0, 500));
                throw new Error('Campo driverId não encontrado em nenhum seletor');
            }
            // Limpa e preenche o campo COM TIMING SEGURO
            console.log(`🔄 Limpando campo antes de preencher...`);
            await this.page.fill(usedSelector, '');
            await this.page.waitForTimeout(500); // Aguardar limpeza
            console.log(`⌨️ Digitando ID: ${driverId}...`);
            await this.page.type(usedSelector, driverId, { delay: 100 }); // Simular digitação humana
            await this.page.waitForTimeout(300); // Aguardar digitação
            // Verificar se foi realmente preenchido
            const filledValue = await this.page.inputValue(usedSelector);
            if (filledValue !== driverId) {
                console.log(`⚠️ Campo não foi preenchido corretamente. Esperado: ${driverId}, Atual: ${filledValue}`);
                // Tentar novamente
                await this.page.fill(usedSelector, driverId);
                await this.page.waitForTimeout(300);
            }
            console.log(`✅ Campo preenchido com: ${filledValue} usando seletor: ${usedSelector}`);
            // Aguarda e clica no botão "Details Driver" COM VERIFICAÇÕES ROBUSTAS
            console.log(`🔍 Procurando botão "Details Driver"...`);
            const buttonSelector = 'button[ng-click="getDriverInfo(enteredDriverValue)"]';
            try {
                // Aguardar botão aparecer
                await this.page.waitForSelector(buttonSelector, { timeout: 15000 });
                // Verificar se está habilitado e clicável
                const isEnabled = await this.page.isEnabled(buttonSelector);
                const isVisible = await this.page.isVisible(buttonSelector);
                if (!isEnabled || !isVisible) {
                    console.log(`⚠️ Botão não está clicável. Enabled: ${isEnabled}, Visible: ${isVisible}`);
                    await this.page.waitForTimeout(2000); // Aguardar mais um pouco
                }
                // Aguardar AngularJS processar o valor
                await this.page.waitForTimeout(1000);
                console.log(`🖱️ Clicando no botão "Details Driver"...`);
                await this.page.click(buttonSelector);
                console.log('✅ Botão "Details Driver" clicado com sucesso');
            }
            catch (buttonError) {
                console.log(`❌ Erro ao localizar/clicar botão: ${buttonError}`);
                throw new Error(`Botão "Details Driver" não encontrado ou não clicável: ${buttonError}`);
            }
            // Aguarda os dados carregarem com VERIFICAÇÃO INTELIGENTE
            console.log(`⏳ Aguardando dados do motorista ${driverId} carregarem...`);
            let retries = 0;
            const maxRetries = 10; // 10 tentativas = até 30 segundos
            let dataLoaded = false;
            while (!dataLoaded && retries < maxRetries) {
                await this.page.waitForTimeout(3000); // Aguardar 3s por tentativa
                // Verificar se apareceu algum conteúdo específico
                try {
                    const bodyText = await this.page.textContent('body');
                    // Verificar indicadores de que os dados carregaram
                    if (bodyText && (bodyText.includes('Driver ID') ||
                        bodyText.includes('Name') ||
                        bodyText.includes('Phone') ||
                        bodyText.includes('City') ||
                        bodyText.includes(driverId))) {
                        dataLoaded = true;
                        console.log(`✅ Dados carregados após ${(retries + 1) * 3} segundos`);
                    }
                    else {
                        retries++;
                        console.log(`⏳ Tentativa ${retries}/${maxRetries} - dados ainda carregando...`);
                    }
                }
                catch (checkError) {
                    console.log(`⚠️ Erro ao verificar carregamento: ${checkError}`);
                    retries++;
                }
            }
            if (!dataLoaded) {
                console.log(`❌ Timeout: dados não carregaram após ${maxRetries * 3} segundos`);
                throw new Error(`Timeout aguardando dados do motorista ${driverId}`);
            }
            // Extrai dados da página (adaptar conforme estrutura real)
            const driverData = await this.extractDriverDetails();
            console.log(`✅ Dados extraídos para ${driverId}`);
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
                }
                else {
                    console.log(`⚠️ Dados do motorista ${driverId} não foram salvos no banco (possível duplicação ou erro)`);
                }
            }
            catch (dbError) {
                console.error(`❌ Erro ao salvar dados do motorista ${driverId} no banco:`, dbError.message);
            }
            return extractedData;
        }
        catch (error) {
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
                const currentUrl = ((_a = this.page) === null || _a === void 0 ? void 0 : _a.url()) || '';
                if (false) { // REMOVIDO: currentUrl.includes('/page/login')) {
                    console.log('🛑 TIMEOUT + PÁGINA LOGIN = SESSÃO PERDIDA');
                    this.isLoggedIn = false;
                    throw new Error('SESSÃO_PERDIDA: Campo não encontrado porque voltou ao login');
                }
            }
            throw error;
        }
    }
    /**
     * Extrai detalhes do motorista da página atual
     * TODO: Adaptar conforme estrutura real da página
     */
    async extractDriverDetails() {
        if (!this.page)
            throw new Error('Página não disponível');
        try {
            console.log('📊 Aguardando página de detalhes carregar...');
            // Aguardar mais tempo para a página carregar completamente
            await this.page.waitForTimeout(5000);
            // Verificar se elementos carregaram - sem timeout desnecessário
            console.log('🔍 Elementos ainda carregando, iniciando extração...');
            // Aguardar um pouco mais para garantir que o AngularJS carregou os dados
            await this.page.waitForTimeout(3000);
            console.log('📋 Iniciando extração dos dados...');
            // Extrair dados pessoais e informações completas
            const driverData = await this.page.evaluate((currentCity) => {
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15;
                const result = {
                    personal_data: {},
                    rides_history: [],
                    additional_info: {}
                };
                console.log('� Executando extração no navegador...');
                // ===== FUNÇÃO AUXILIAR BASEADA NA ESTRUTURA HTML REAL =====
                function extractFieldByLabel(labelText) {
                    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
                    console.log(`🔍 Procurando campo: "${labelText}"`);
                    try {
                        // === ESTRATÉGIA BASEADA NA ESTRUTURA REAL DO HTML ===
                        // Estrutura: <div class="col-lg-5"><label>Campo</label></div> + <div class="col-lg-1">:</div> + <div class="col-lg-5">VALOR</div>
                        // 1. Encontrar o label específico
                        const labels = document.querySelectorAll('label.ng-binding');
                        console.log(`📋 Encontrados ${labels.length} labels com .ng-binding`);
                        for (const label of labels) {
                            const labelTextContent = (_a = label.textContent) === null || _a === void 0 ? void 0 : _a.trim();
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
                                                const cityText = (_b = valueContainer.textContent) === null || _b === void 0 ? void 0 : _b.trim();
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
                                            }
                                            else {
                                                // Para outros campos, usar a lógica normal
                                                // Primeiro tentar pegar link interno
                                                const link = valueContainer.querySelector('a.ng-binding');
                                                if (link) {
                                                    const linkText = (_c = link.textContent) === null || _c === void 0 ? void 0 : _c.trim();
                                                    if (linkText && linkText.length > 0) {
                                                        console.log(`✅ Valor encontrado em link: "${linkText}"`);
                                                        return linkText;
                                                    }
                                                }
                                                // Se não tem link, pegar o texto direto
                                                const valueText = (_d = valueContainer.textContent) === null || _d === void 0 ? void 0 : _d.trim();
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
                                    const text = (_e = elem.textContent) === null || _e === void 0 ? void 0 : _e.trim();
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
                                const driverIdText = (_f = driverLink.textContent) === null || _f === void 0 ? void 0 : _f.trim();
                                if (driverIdText && /^\d{8}$/.test(driverIdText)) {
                                    console.log(`✅ Driver ID encontrado em link específico: "${driverIdText}"`);
                                    return driverIdText;
                                }
                            }
                            // Buscar por números de 8 dígitos em elementos ng-binding
                            const ngElements = document.querySelectorAll('.ng-binding, .ng-scope');
                            for (const elem of ngElements) {
                                const text = (_g = elem.textContent) === null || _g === void 0 ? void 0 : _g.trim();
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
                                const text = (_h = elem.textContent) === null || _h === void 0 ? void 0 : _h.trim();
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
                                const text = (_j = elem.textContent) === null || _j === void 0 ? void 0 : _j.trim();
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
                                const text = (_k = elem.textContent) === null || _k === void 0 ? void 0 : _k.trim();
                                // Procurar especificamente por "Matupá" ou outras cidades brasileiras
                                if (text && (text === 'Matupá' || text.match(/^[A-ZÁÊÇÕ][a-záêçõü]{2,20}$/))) {
                                    console.log(`✅ City encontrada: "${text}"`);
                                    return text;
                                }
                            }
                            // Buscar em todos os elementos ng-binding por nomes de cidade
                            const allBindingElements = document.querySelectorAll('.ng-binding');
                            for (const elem of allBindingElements) {
                                const text = (_l = elem.textContent) === null || _l === void 0 ? void 0 : _l.trim();
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
                    }
                    catch (error) {
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
                }
                catch (personalError) {
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
                                    s_no: ((_b = (_a = cells[0]) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || (i + 1).toString(),
                                    engagement_id: '',
                                    customer_id: '',
                                    driver_rating: ((_d = (_c = cells[3]) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.trim()) || 'N/A',
                                    drop_time: ((_f = (_e = cells[4]) === null || _e === void 0 ? void 0 : _e.textContent) === null || _f === void 0 ? void 0 : _f.trim()) || 'N/A',
                                    distance_travelled: ((_h = (_g = cells[5]) === null || _g === void 0 ? void 0 : _g.textContent) === null || _h === void 0 ? void 0 : _h.trim()) || 'N/A',
                                    google_distance: ((_k = (_j = cells[6]) === null || _j === void 0 ? void 0 : _j.textContent) === null || _k === void 0 ? void 0 : _k.trim()) || 'N/A',
                                    duration: ((_m = (_l = cells[7]) === null || _l === void 0 ? void 0 : _l.textContent) === null || _m === void 0 ? void 0 : _m.trim()) || 'N/A',
                                    fare: ((_p = (_o = cells[8]) === null || _o === void 0 ? void 0 : _o.textContent) === null || _p === void 0 ? void 0 : _p.trim()) || 'N/A',
                                    start_end_case: cells.length > 9 ? (_r = (_q = cells[9]) === null || _q === void 0 ? void 0 : _q.textContent) === null || _r === void 0 ? void 0 : _r.trim() : 'N/A'
                                };
                                // Extrair Engagement ID (célula 1) - pode estar vazio na estrutura real
                                const engagementCell = cells[1];
                                if (engagementCell) {
                                    // Primeiro tentar pegar de um link
                                    const engagementLink = engagementCell.querySelector('a');
                                    if (engagementLink) {
                                        ride.engagement_id = ((_s = engagementLink.textContent) === null || _s === void 0 ? void 0 : _s.trim()) || '';
                                    }
                                    else {
                                        // Se não tem link, pegar texto direto
                                        const engagementText = (_t = engagementCell.textContent) === null || _t === void 0 ? void 0 : _t.trim();
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
                                        ride.customer_id = ((_u = customerLink.textContent) === null || _u === void 0 ? void 0 : _u.trim()) || '';
                                    }
                                    else {
                                        // Se não tem link, pegar texto direto
                                        const customerText = (_v = customerCell.textContent) === null || _v === void 0 ? void 0 : _v.trim();
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
                                }
                                else {
                                    console.log(`⚠️ Corrida ${i + 1}: dados insuficientes - drop_time vazio`);
                                }
                            }
                            else {
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
                                    const timeCell = (_x = (_w = cells[4]) === null || _w === void 0 ? void 0 : _w.textContent) === null || _x === void 0 ? void 0 : _x.trim();
                                    const fareCell = (_z = (_y = cells[8]) === null || _y === void 0 ? void 0 : _y.textContent) === null || _z === void 0 ? void 0 : _z.trim();
                                    if (timeCell && timeCell.includes('/') && timeCell.includes(':')) {
                                        const ride = {
                                            s_no: ((_1 = (_0 = cells[0]) === null || _0 === void 0 ? void 0 : _0.textContent) === null || _1 === void 0 ? void 0 : _1.trim()) || (i + 1).toString(),
                                            engagement_id: ((_3 = (_2 = cells[1]) === null || _2 === void 0 ? void 0 : _2.textContent) === null || _3 === void 0 ? void 0 : _3.trim()) || 'N/A',
                                            customer_id: ((_5 = (_4 = cells[2]) === null || _4 === void 0 ? void 0 : _4.textContent) === null || _5 === void 0 ? void 0 : _5.trim()) || 'N/A',
                                            driver_rating: ((_7 = (_6 = cells[3]) === null || _6 === void 0 ? void 0 : _6.textContent) === null || _7 === void 0 ? void 0 : _7.trim()) || 'N/A',
                                            drop_time: timeCell,
                                            distance_travelled: ((_9 = (_8 = cells[5]) === null || _8 === void 0 ? void 0 : _8.textContent) === null || _9 === void 0 ? void 0 : _9.trim()) || 'N/A',
                                            google_distance: ((_11 = (_10 = cells[6]) === null || _10 === void 0 ? void 0 : _10.textContent) === null || _11 === void 0 ? void 0 : _11.trim()) || 'N/A',
                                            duration: ((_13 = (_12 = cells[7]) === null || _12 === void 0 ? void 0 : _12.textContent) === null || _13 === void 0 ? void 0 : _13.trim()) || 'N/A',
                                            fare: fareCell || 'N/A',
                                            start_end_case: cells.length > 9 ? (_15 = (_14 = cells[9]) === null || _14 === void 0 ? void 0 : _14.textContent) === null || _15 === void 0 ? void 0 : _15.trim() : 'N/A'
                                        };
                                        result.rides_history.push(ride);
                                        console.log(`✅ Corrida alternativa ${result.rides_history.length}: ${ride.drop_time}, Fare ${ride.fare}`);
                                    }
                                }
                            }
                        }
                    }
                    else {
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
                }
                catch (ridesError) {
                    console.error('❌ Erro ao extrair histórico de corridas:', ridesError);
                }
                console.log('✅ Extração de dados concluída no navegador');
                return result;
            }, this.currentCity); // ===== EXTRAIR WALLET TRANSACTIONS (FORA DO EVALUATE) =====
            console.log('💰 Extraindo transações da carteira...');
            try {
                // Clicar na aba WALLET TRANSACTIONS
                const walletTabClicked = await this.page.evaluate(() => {
                    var _a;
                    const walletTabs = Array.from(document.querySelectorAll('md-tab-item'));
                    for (const tab of walletTabs) {
                        const tabText = (_a = tab.textContent) === null || _a === void 0 ? void 0 : _a.trim();
                        if (tabText && tabText.includes('WALLET TRANSACTIONS')) {
                            console.log('✅ Aba WALLET TRANSACTIONS encontrada, clicando...');
                            tab.click();
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
                        var _a, _b, _c, _d, _e, _f, _g, _h;
                        const transactions = [];
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
                                            transaction_time: ((_b = (_a = cells[0]) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || 'N/A',
                                            engagement_id: ((_d = (_c = cells[1]) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.trim()) || 'N/A',
                                            amount: ((_f = (_e = cells[2]) === null || _e === void 0 ? void 0 : _e.textContent) === null || _f === void 0 ? void 0 : _f.trim()) || 'N/A',
                                            type: ((_h = (_g = cells[3]) === null || _g === void 0 ? void 0 : _g.textContent) === null || _h === void 0 ? void 0 : _h.trim()) || 'N/A' // D/C/CB/DAC
                                        };
                                        // Verificar se tem dados válidos
                                        if (transaction.transaction_time && transaction.transaction_time !== 'N/A' && transaction.transaction_time.length > 0) {
                                            transactions.push(transaction);
                                            console.log(`✅ Transação ${i + 1}: ${transaction.transaction_time}, ${transaction.type}, ${transaction.amount}`);
                                        }
                                    }
                                }
                                console.log(`✅ Total de transações extraídas: ${transactions.length}`);
                            }
                            else {
                                console.log('⚠️ Tabela de transações não encontrada');
                            }
                        }
                        catch (error) {
                            console.error('❌ Erro ao extrair transações:', error);
                        }
                        return transactions;
                    });
                    driverData.wallet_transactions = walletTransactions;
                }
            }
            catch (walletError) {
                console.error('❌ Erro ao extrair wallet transactions:', walletError);
            }
            // ===== EXTRAIR SUBSCRIPTION HISTORY (FORA DO EVALUATE) =====
            console.log('📋 Extraindo histórico de assinaturas...');
            try {
                // Clicar na aba Subscription History
                const subscriptionTabClicked = await this.page.evaluate(() => {
                    var _a;
                    const subscriptionTabs = Array.from(document.querySelectorAll('md-tab-item'));
                    for (const tab of subscriptionTabs) {
                        const tabText = (_a = tab.textContent) === null || _a === void 0 ? void 0 : _a.trim();
                        if (tabText && tabText.includes('Subscription History')) {
                            console.log('✅ Aba Subscription History encontrada, clicando...');
                            tab.click();
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
                        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1;
                        const subscriptions = [];
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
                                            s_no: ((_b = (_a = cells[0]) === null || _a === void 0 ? void 0 : _a.textContent) === null || _b === void 0 ? void 0 : _b.trim()) || 'N/A',
                                            subscription_id: ((_d = (_c = cells[1]) === null || _c === void 0 ? void 0 : _c.textContent) === null || _d === void 0 ? void 0 : _d.trim()) || 'N/A',
                                            title: ((_f = (_e = cells[2]) === null || _e === void 0 ? void 0 : _e.textContent) === null || _f === void 0 ? void 0 : _f.trim()) || 'N/A',
                                            amount: ((_h = (_g = cells[3]) === null || _g === void 0 ? void 0 : _g.textContent) === null || _h === void 0 ? void 0 : _h.trim()) || 'N/A',
                                            benefit_amount: ((_k = (_j = cells[4]) === null || _j === void 0 ? void 0 : _j.textContent) === null || _k === void 0 ? void 0 : _k.trim()) || 'N/A',
                                            start_from: ((_m = (_l = cells[5]) === null || _l === void 0 ? void 0 : _l.textContent) === null || _m === void 0 ? void 0 : _m.trim()) || 'N/A',
                                            end_on: ((_p = (_o = cells[6]) === null || _o === void 0 ? void 0 : _o.textContent) === null || _p === void 0 ? void 0 : _p.trim()) || 'N/A',
                                            current_rides_count: ((_r = (_q = cells[7]) === null || _q === void 0 ? void 0 : _q.textContent) === null || _r === void 0 ? void 0 : _r.trim()) || 'N/A',
                                            payment_mode: ((_t = (_s = cells[8]) === null || _s === void 0 ? void 0 : _s.textContent) === null || _t === void 0 ? void 0 : _t.trim()) || 'N/A',
                                            payment_notes: ((_v = (_u = cells[9]) === null || _u === void 0 ? void 0 : _u.textContent) === null || _v === void 0 ? void 0 : _v.trim()) || 'N/A',
                                            created_by: ((_x = (_w = cells[10]) === null || _w === void 0 ? void 0 : _w.textContent) === null || _x === void 0 ? void 0 : _x.trim()) || 'N/A',
                                            updated_by: ((_z = (_y = cells[11]) === null || _y === void 0 ? void 0 : _y.textContent) === null || _z === void 0 ? void 0 : _z.trim()) || 'N/A',
                                            status: ((_1 = (_0 = cells[12]) === null || _0 === void 0 ? void 0 : _0.textContent) === null || _1 === void 0 ? void 0 : _1.trim()) || 'N/A'
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
                            }
                            else {
                                console.log('⚠️ Tabela de assinaturas não encontrada');
                            }
                        }
                        catch (error) {
                            console.error('❌ Erro ao extrair assinaturas:', error);
                        }
                        return subscriptions;
                    });
                    driverData.subscription_history = subscriptionHistory;
                }
            }
            catch (subscriptionError) {
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
        }
        catch (error) {
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
    async processRecharge(driverId, amount) {
        console.log(`💰 Processando recarga: ${driverId} - R$ ${amount}`);
        try {
            if (!this.page)
                throw new Error('Página não disponível');
            // 1. Navegar para dashboard principal (forçar URL correta)
            console.log('🌐 Navegando para Dashboard para recarga...');
            console.log(`🌐 [hybrid_scraper] Navegando para: ${this.DASHBOARD_URL}...`);
            await this.page.goto(this.DASHBOARD_URL, { waitUntil: 'networkidle' });
            console.log('✅ [hybrid_scraper] Navegação concluída com sucesso');
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
            await this.page.waitForTimeout(10000);
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
            }
            catch (_a) { }
            if (success) {
                console.log(`✅ Recarga processada com sucesso: ${driverId} - R$ ${amount}`);
            }
            else {
                console.log(`⚠️ Recarga enviada (sem confirmação visual): ${driverId} - R$ ${amount}`);
            }
            return true;
        }
        catch (error) {
            console.error(`❌ Erro ao processar recarga:`, error);
            return false;
        }
    }
    /**
     * Verifica se ainda está logado
     */
    async isStillLoggedIn() {
        if (!this.page)
            return false;
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
        }
        catch (_a) {
            this.isLoggedIn = false;
            return false;
        }
    }
    /**
     * 🔧 CORRIGIDO: Força atualização do status de login
     */
    setLoggedIn(status) {
        this.isLoggedIn = status;
    }
    /**
     * 🔧 CORRIGIDO: Mantém status de login uma vez confirmado, não verifica URL constantemente
     */
    getStatus() {
        var _a, _b;
        // � CORREÇÃO: Se já foi confirmado logado uma vez, MANTER até dar erro real
        if (this.isLoggedIn) {
            console.log(`✅ [getStatus] Já confirmado como LOGADO - mantendo status`);
            return {
                isLoggedIn: true,
                currentCity: this.currentCity,
                pageUrl: ((_a = this.page) === null || _a === void 0 ? void 0 : _a.url()) || 'N/A',
                timestamp: new Date().toISOString()
            };
        }
        // Só verificar URL se ainda não foi confirmado como logado
        if (this.page && !this.page.isClosed()) {
            try {
                const currentUrl = this.page.url();
                console.log(`🔍 [getStatus] URL atual: ${currentUrl}`);
                console.log(`🔍 [getStatus] isLoggedIn inicial: ${this.isLoggedIn}`);
                // Se está numa página do app, está logado
                if (currentUrl.includes('/app/dashboard') ||
                    currentUrl.includes('/app/active-drivers') ||
                    currentUrl.includes('#/app/')) {
                    this.isLoggedIn = true; // Confirmar como logado
                    console.log(`✅ [getStatus] Detectado como LOGADO (URL contém app)`);
                }
                else if (false) { // REMOVIDO: currentUrl.includes('/page/login') || currentUrl.includes('#/page/login')) {
                    this.isLoggedIn = false;
                    console.log(`❌ [getStatus] Detectado como NÃO LOGADO (URL contém login)`);
                }
                else {
                    console.log(`⚠️ [getStatus] URL indeterminada, mantendo status: ${this.isLoggedIn}`);
                }
            }
            catch (error) {
                console.log('⚠️ Erro ao verificar URL atual no getStatus:', error);
            }
        }
        return {
            isLoggedIn: this.isLoggedIn,
            currentCity: this.currentCity,
            pageUrl: ((_b = this.page) === null || _b === void 0 ? void 0 : _b.url()) || 'N/A',
            timestamp: new Date().toISOString()
        };
    }
    /**
     * Finaliza o scraper
     */
    async close() {
        console.log('🔄 Fechando RidesDashboardHybridScraper...');
        try {
            await this.browserManager.closeBrowser();
            this.page = null;
            this.isLoggedIn = false;
            console.log('✅ Scraper fechado com sucesso');
        }
        catch (error) {
            console.error('❌ Erro ao fechar scraper:', error);
        }
    }
}
exports.RidesDashboardHybridScraper = RidesDashboardHybridScraper;
// �🔒 DEBOUNCE PARA EXTRAÇÃO DE IDs (static para compartilhar entre instâncias)
RidesDashboardHybridScraper.idExtractionDebounce = {
    lastExtraction: 0,
    isExtracting: false,
    lastResult: []
};
