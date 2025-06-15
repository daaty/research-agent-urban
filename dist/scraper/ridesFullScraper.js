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
exports.scrapeRidesData = scrapeRidesData;
const playwright_1 = require("playwright");
function scrapeRidesData(loginUrl, email, password) {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('🚀 Iniciando browser para scraping completo das 5 abas...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const context = yield browser.newContext({
                userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
            });
            const page = yield context.newPage();
            // 1. Fazer login
            console.log('🔑 Fazendo login...');
            console.log('URL:', loginUrl);
            console.log('Login:', email);
            console.log('Password definida:', !!password);
            if (!loginUrl) {
                throw new Error('URL de login não fornecida');
            }
            yield page.goto(loginUrl, { waitUntil: 'domcontentloaded' });
            yield page.waitForTimeout(3000);
            // Preencher formulário de login
            yield page.fill('#exampleInputEmail1', email);
            yield page.fill('#exampleInputPassword1', password);
            // Simular eventos AngularJS para garantir que os campos sejam reconhecidos
            yield page.evaluate(() => {
                const emailInput = document.querySelector('#exampleInputEmail1');
                const passwordInput = document.querySelector('#exampleInputPassword1');
                if (emailInput) {
                    emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                    emailInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
                if (passwordInput) {
                    passwordInput.dispatchEvent(new Event('input', { bubbles: true }));
                    passwordInput.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
            yield page.press('#exampleInputPassword1', 'Enter');
            console.log('⏳ Aguardando redirecionamento...');
            yield page.waitForTimeout(5000);
            // 2. Verificar se login foi bem-sucedido
            const currentUrl = page.url();
            if (currentUrl.includes('login')) {
                yield browser.close();
                return {
                    success: false,
                    message: '❌ Login falhou - ainda na página de login'
                };
            }
            console.log('✅ Login bem-sucedido! URL atual:', currentUrl);
            // 3. Definir as 5 abas que precisamos acessar
            const tabs = [
                { name: 'ongoing', label: 'Ongoing Rides' },
                { name: 'scheduled', label: 'Scheduled Rides' },
                { name: 'completed', label: 'Completed Rides' },
                { name: 'cancelled', label: 'Cancelled Rides' },
                { name: 'missed', label: 'Missed Rides' }
            ];
            const tabsData = [];
            // 4. Navegar por cada aba e extrair dados
            for (const tab of tabs) {
                console.log(`📊 Processando aba: ${tab.label}...`);
                try {
                    // Procurar link da aba (várias estratégias)
                    let tabElement = null;
                    // Estratégia 1: Buscar por texto
                    yield page.waitForTimeout(2000);
                    const tabSelectors = [
                        `a:has-text("${tab.label}")`,
                        `a:has-text("${tab.name}")`,
                        `[href*="${tab.name}"]`,
                        `[data-tab="${tab.name}"]`,
                        `.nav-link:has-text("${tab.label}")`,
                        `.nav-item a:has-text("${tab.label}")`,
                        `li a:has-text("${tab.label}")`,
                        // Bootstrap tabs
                        `[data-bs-target*="${tab.name}"]`,
                        `[data-toggle="tab"][href*="${tab.name}"]`,
                        // AngularJS tabs
                        `[ng-click*="${tab.name}"]`,
                        `[ui-sref*="${tab.name}"]`
                    ];
                    for (const selector of tabSelectors) {
                        try {
                            tabElement = yield page.$(selector);
                            if (tabElement) {
                                console.log(`✅ Encontrou aba usando seletor: ${selector}`);
                                break;
                            }
                        }
                        catch (e) {
                            // Continue tentando outros seletores
                        }
                    }
                    // Se não encontrou a aba, tentar clicar diretamente pela URL
                    if (!tabElement) {
                        console.log(`⚠️ Não encontrou link para a aba ${tab.label}, tentando navegar pela URL...`);
                        const possibleUrls = [
                            `${currentUrl}#${tab.name}`,
                            `${currentUrl}/${tab.name}`,
                            `${currentUrl}?tab=${tab.name}`,
                            `${currentUrl.replace(/\/$/, '')}#${tab.name}`
                        ];
                        for (const url of possibleUrls) {
                            try {
                                yield page.goto(url, { waitUntil: 'domcontentloaded' });
                                yield page.waitForTimeout(3000);
                                if (!page.url().includes('login')) {
                                    console.log(`✅ Navegou para: ${url}`);
                                    break;
                                }
                            }
                            catch (e) {
                                console.log(`❌ Falha ao navegar para: ${url}`);
                            }
                        }
                    }
                    else {
                        // Clicar na aba encontrada
                        yield tabElement.click();
                        yield page.waitForTimeout(3000);
                    }
                    // Extrair dados da tabela na aba atual
                    console.log(`🔍 Extraindo dados da aba ${tab.label}...`);
                    const tableData = yield page.evaluate(() => {
                        var _a;
                        // Procurar tabelas na página
                        const tables = document.querySelectorAll('table');
                        if (tables.length === 0) {
                            return null;
                        }
                        // Pegar a primeira tabela (ou a maior)
                        let targetTable = tables[0];
                        if (tables.length > 1) {
                            // Escolher a tabela com mais linhas
                            let maxRows = 0;
                            for (const table of tables) {
                                const rows = table.querySelectorAll('tr').length;
                                if (rows > maxRows) {
                                    maxRows = rows;
                                    targetTable = table;
                                }
                            }
                        }
                        // Extrair headers
                        const headerSelectors = ['thead th', 'thead td', 'tr:first-child th', 'tr:first-child td'];
                        let headers = [];
                        for (const selector of headerSelectors) {
                            const headerElements = targetTable.querySelectorAll(selector);
                            if (headerElements.length > 0) {
                                headers = Array.from(headerElements).map(th => { var _a; return ((_a = th.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                                break;
                            }
                        }
                        // Extrair linhas de dados
                        const dataRows = Array.from(targetTable.querySelectorAll('tbody tr, tr')).slice(headers.length > 0 ? 1 : 0);
                        const rows = dataRows.map(row => {
                            return Array.from(row.querySelectorAll('td, th')).map(cell => { var _a; return ((_a = cell.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                        });
                        return {
                            headers,
                            rows,
                            rowCount: rows.length,
                            columnCount: headers.length || (((_a = rows[0]) === null || _a === void 0 ? void 0 : _a.length) || 0),
                            isEmpty: rows.length === 0
                        };
                    });
                    tabsData.push({
                        tabName: tab.name,
                        url: page.url(),
                        table: tableData ? Object.assign({ id: `table_${tab.name}` }, tableData) : null
                    });
                    console.log(`✅ Aba ${tab.label}: ${tableData ? tableData.rowCount : 0} linhas extraídas`);
                }
                catch (error) {
                    console.error(`❌ Erro ao processar aba ${tab.label}:`, error.message);
                    tabsData.push({
                        tabName: tab.name,
                        url: page.url(),
                        table: null,
                        error: error.message
                    });
                }
            }
            yield browser.close();
            // 5. Calcular sumário
            const summary = {
                totalTabsScraped: tabsData.length,
                tabsWithData: tabsData.filter(tab => tab.table && !tab.table.isEmpty).length,
                tabsEmpty: tabsData.filter(tab => tab.table && tab.table.isEmpty).length,
                tabsWithErrors: tabsData.filter(tab => tab.error).length,
                totalRows: tabsData.reduce((sum, tab) => { var _a; return sum + (((_a = tab.table) === null || _a === void 0 ? void 0 : _a.rowCount) || 0); }, 0),
                timestamp: new Date().toISOString()
            };
            console.log('📋 Sumário do scraping:', summary);
            return {
                success: true,
                message: `✅ Scraping completo! ${summary.totalTabsScraped} abas processadas, ${summary.totalRows} linhas extraídas`,
                data: {
                    tabs: tabsData,
                    summary
                }
            };
        }
        catch (error) {
            if (browser) {
                yield browser.close();
            }
            console.error('❌ Erro durante scraping:', error);
            return {
                success: false,
                message: `❌ Erro durante scraping: ${error.message}`
            };
        }
    });
}
