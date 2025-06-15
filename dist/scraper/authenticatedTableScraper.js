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
exports.AuthenticatedTableScraper = void 0;
exports.scrapeAuthenticatedTables = scrapeAuthenticatedTables;
const playwright_1 = require("playwright");
class AuthenticatedTableScraper {
    constructor() {
        this.browser = null;
        this.page = null;
    }
    initialize() {
        return __awaiter(this, arguments, void 0, function* (headless = false) {
            this.browser = yield playwright_1.chromium.launch({
                headless,
                slowMo: 50
            });
            this.page = yield this.browser.newPage();
        });
    }
    login(credentials) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                throw new Error('Scraper not initialized');
            try {
                // Navegar para a página de login (se especificada) ou usar a URL atual
                if (credentials.loginUrl) {
                    yield this.page.goto(credentials.loginUrl, { waitUntil: 'networkidle' });
                }
                // Preencher credenciais
                yield this.page.fill(credentials.usernameSelector, credentials.username);
                yield this.page.fill(credentials.passwordSelector, credentials.password);
                // Fazer login
                yield this.page.click(credentials.submitSelector);
                // Aguardar redirecionamento após login
                yield this.page.waitForTimeout(3000);
                // Verificar se o login foi bem-sucedido (você pode ajustar esta lógica)
                const currentUrl = this.page.url();
                const hasLoginError = yield this.page.$('.error, .alert-danger, [class*="error"]');
                return !hasLoginError;
            }
            catch (error) {
                console.error('Erro durante o login:', error);
                return false;
            }
        });
    }
    scrapeTablesFromPage(url_1, tableSelectors_1) {
        return __awaiter(this, arguments, void 0, function* (url, tableSelectors, manualLogin = false) {
            if (!this.page)
                throw new Error('Scraper not initialized');
            yield this.page.goto(url, { waitUntil: 'networkidle' });
            if (manualLogin) {
                console.log("🛑 Faça o login manualmente na página aberta. Aguardando 60 segundos...");
                yield this.page.waitForTimeout(60000);
            }
            // Aguardar as tabelas carregarem
            yield this.page.waitForTimeout(2000);
            const tables = yield this.extractTables(tableSelectors);
            return {
                url,
                timestamp: new Date().toISOString(),
                tables,
                totalTables: tables.length,
                emptyTables: tables.filter(table => table.isEmpty).length
            };
        });
    }
    extractTables(selectors) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            if (!this.page)
                throw new Error('Page not available');
            // Encontrar todas as tabelas na página
            const tableElements = yield this.page.$$(selectors.tableSelector);
            console.log(`Encontradas ${tableElements.length} tabelas na página`);
            const tables = [];
            for (let i = 0; i < tableElements.length; i++) {
                const tableElement = tableElements[i];
                try {
                    // Extrair headers
                    const headerSelector = selectors.headerSelector || 'thead tr th, thead tr td, tr:first-child th, tr:first-child td';
                    const headers = yield tableElement.$$eval(headerSelector, (elements) => elements.map(el => { var _a; return ((_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; })).catch(() => []);
                    // Extrair rows (excluindo header se necessário)
                    const rowSelector = selectors.rowSelector || 'tbody tr, tr';
                    const rows = yield tableElement.$$eval(rowSelector, (elements, hasHeaders) => {
                        // Se temos headers, pular a primeira linha
                        const startIndex = hasHeaders ? 1 : 0;
                        return elements.slice(startIndex).map(row => {
                            const cells = row.querySelectorAll('td, th');
                            return Array.from(cells).map(cell => { var _a; return ((_a = cell.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                        });
                    }, headers.length > 0).catch(() => []);
                    const isEmpty = rows.length === 0 || rows.every(row => row.every(cell => !cell));
                    const tableData = {
                        headers,
                        rows,
                        isEmpty,
                        tableName: ((_a = selectors.tableNames) === null || _a === void 0 ? void 0 : _a[i]) || `Tabela ${i + 1}`
                    };
                    tables.push(tableData);
                    console.log(`Tabela ${i + 1}: ${headers.length} colunas, ${rows.length} linhas, vazia: ${isEmpty}`);
                }
                catch (error) {
                    console.error(`Erro ao processar tabela ${i + 1}:`, error);
                    tables.push({
                        headers: [],
                        rows: [],
                        isEmpty: true,
                        tableName: ((_b = selectors.tableNames) === null || _b === void 0 ? void 0 : _b[i]) || `Tabela ${i + 1} (erro)`
                    });
                }
            }
            return tables;
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
exports.AuthenticatedTableScraper = AuthenticatedTableScraper;
// Função utilitária para uso simples
function scrapeAuthenticatedTables(url_1, credentials_1, tableSelectors_1) {
    return __awaiter(this, arguments, void 0, function* (url, credentials, tableSelectors, options = {}) {
        const scraper = new AuthenticatedTableScraper();
        try {
            yield scraper.initialize(options.headless || false);
            if (credentials && !options.manualLogin) {
                const loginSuccess = yield scraper.login(credentials);
                if (!loginSuccess) {
                    throw new Error('Falha no login automático');
                }
            }
            const result = yield scraper.scrapeTablesFromPage(url, tableSelectors, options.manualLogin);
            return result;
        }
        finally {
            yield scraper.close();
        }
    });
}
