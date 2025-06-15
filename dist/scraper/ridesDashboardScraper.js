"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RidesDashboardScraper = void 0;
exports.scrapeRidesDashboard = scrapeRidesDashboard;
const playwright_1 = require("playwright");
class RidesDashboardScraper {
    constructor(loginUrl = process.env.RIDES_LOGIN_URL || '', email = process.env.RIDES_EMAIL || '', password = process.env.RIDES_PASSWORD || '', timeout = parseInt(process.env.SCRAPER_TIMEOUT || '30000'), headless = process.env.HEADLESS_MODE === 'true') {
        this.loginUrl = loginUrl;
        this.email = email;
        this.password = password;
        this.timeout = timeout;
        this.headless = headless;
        this.browser = null;
        this.page = null;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            this.browser = yield playwright_1.chromium.launch({
                headless: this.headless,
                slowMo: 50
            });
            this.page = yield this.browser.newPage();
            // Configurar timeout padrão
            this.page.setDefaultTimeout(this.timeout);
        });
    }
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                throw new Error('Scraper não foi inicializado');
            try {
                console.log('🔄 Navegando para a página de login...');
                yield this.page.goto(this.loginUrl, { waitUntil: 'networkidle' });
                // Aguardar um momento para a página carregar completamente
                yield this.page.waitForTimeout(2000);
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
                        emailField = yield this.page.waitForSelector(selector, { timeout: 5000 });
                        if (emailField) {
                            console.log(`✅ Campo de email encontrado: ${selector}`);
                            break;
                        }
                    }
                    catch (e) {
                        continue;
                    }
                }
                // Procurar campo de senha
                for (const selector of passwordSelectors) {
                    try {
                        passwordField = yield this.page.waitForSelector(selector, { timeout: 5000 });
                        if (passwordField) {
                            console.log(`✅ Campo de senha encontrado: ${selector}`);
                            break;
                        }
                    }
                    catch (e) {
                        continue;
                    }
                }
                if (!emailField || !passwordField) {
                    console.log('❌ Não foi possível encontrar os campos de login');
                    console.log('🔍 Elementos disponíveis na página:');
                    // Debug: listar inputs disponíveis
                    const inputs = yield this.page.$$eval('input', elements => elements.map(el => ({
                        type: el.type,
                        name: el.name,
                        id: el.id,
                        placeholder: el.placeholder,
                        className: el.className
                    })));
                    console.log(inputs);
                    return false;
                }
                console.log('🔐 Preenchendo credenciais...');
                yield emailField.fill(this.email);
                yield passwordField.fill(this.password);
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
                        loginButton = yield this.page.waitForSelector(selector, { timeout: 3000 });
                        if (loginButton) {
                            console.log(`✅ Botão de login encontrado: ${selector}`);
                            break;
                        }
                    }
                    catch (e) {
                        continue;
                    }
                }
                if (!loginButton) {
                    console.log('❌ Botão de login não encontrado, tentando Enter...');
                    yield passwordField.press('Enter');
                }
                else {
                    yield loginButton.click();
                }
                console.log('⏳ Aguardando redirecionamento após login...');
                // Aguardar navegação ou mudança na URL
                try {
                    yield this.page.waitForNavigation({ timeout: 10000 });
                    console.log('✅ Login realizado com sucesso!');
                    return true;
                }
                catch (e) {
                    // Se não houve navegação, verificar se houve mudança no conteúdo
                    yield this.page.waitForTimeout(3000);
                    const currentUrl = this.page.url();
                    if (!currentUrl.includes('login')) {
                        console.log('✅ Login aparentemente realizado (URL mudou)!');
                        return true;
                    }
                    else {
                        console.log('❌ Login pode ter falhado - ainda na página de login');
                        return false;
                    }
                }
            }
            catch (error) {
                console.error('❌ Erro durante o login:', error);
                return false;
            }
        });
    }
    scrapeTablesFromPage(pageUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                throw new Error('Scraper não foi inicializado');
            try {
                if (pageUrl) {
                    console.log(`🔄 Navegando para: ${pageUrl}`);
                    yield this.page.goto(pageUrl, { waitUntil: 'networkidle' });
                    yield this.page.waitForTimeout(3000);
                }
                console.log('🔍 Procurando tabelas na página...');
                // Aguardar possíveis tabelas carregarem
                yield this.page.waitForTimeout(2000);
                const tables = yield this.page.$$eval('table', (tableElements) => {
                    return tableElements.map((table, index) => {
                        const tableName = `Tabela_${index + 1}`;
                        // Extrair headers
                        const headerElements = table.querySelectorAll('thead tr th, thead tr td, tr:first-child th, tr:first-child td');
                        const headers = Array.from(headerElements).map(th => { var _a; return ((_a = th.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                        // Extrair linhas de dados
                        const bodyRows = table.querySelectorAll('tbody tr, tr:not(:first-child)');
                        const rows = Array.from(bodyRows).map(row => {
                            const cells = row.querySelectorAll('td, th');
                            return Array.from(cells).map(cell => { var _a; return ((_a = cell.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
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
            }
            catch (error) {
                console.error('❌ Erro durante scraping das tabelas:', error);
                throw error;
            }
        });
    }
    scrapeRidesDashboard(targetPageUrl) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.initialize();
                const loginSuccess = yield this.login();
                if (!loginSuccess) {
                    return {
                        success: false,
                        message: 'Falha no login',
                        tables: [],
                        scrapedAt: new Date().toISOString()
                    };
                }
                const tables = yield this.scrapeTablesFromPage(targetPageUrl);
                return {
                    success: true,
                    message: `Scraping concluído com sucesso. ${tables.length} tabelas encontradas.`,
                    tables,
                    scrapedAt: new Date().toISOString()
                };
            }
            catch (error) {
                console.error('❌ Erro geral durante scraping:', error);
                return {
                    success: false,
                    message: `Erro durante scraping: ${error}`,
                    tables: [],
                    scrapedAt: new Date().toISOString()
                };
            }
            finally {
                yield this.close();
            }
        });
    }
    close() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.browser) {
                yield this.browser.close();
                this.browser = null;
                this.page = null;
            }
        });
    }
}
exports.RidesDashboardScraper = RidesDashboardScraper;
// Função de conveniência para uso rápido
function scrapeRidesDashboard(targetPageUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const scraper = new RidesDashboardScraper();
        return yield scraper.scrapeRidesDashboard(targetPageUrl);
    });
}
