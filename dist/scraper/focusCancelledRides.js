"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.FocusCancelledRidesScraper = void 0;
exports.runFocusCancelledScraper = runFocusCancelledScraper;
const playwright_1 = require("playwright");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
class FocusCancelledRidesScraper {
    constructor() {
        this.browser = null;
        this.page = null;
    }
    initialize() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🚀 Inicializando browser para FOCAR NA ABA CANCELADOS...');
            this.browser = yield playwright_1.chromium.launch({
                headless: process.env.HEADLESS_MODE === 'true',
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-web-security',
                    '--disable-features=VizDisplayCompositor'
                ]
            });
            this.page = yield this.browser.newPage();
            // Configurar viewport e user agent
            yield this.page.setViewportSize({ width: 1920, height: 1080 });
            yield this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        });
    }
    login() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                throw new Error('Page not initialized');
            console.log('🔐 Fazendo login no sistema...');
            try {
                yield this.page.goto('https://rides.urban.com.br/app/login', {
                    waitUntil: 'networkidle',
                    timeout: 60000
                });
                console.log('📄 Página de login carregada');
                // Preencher credenciais
                yield this.page.fill('input[name="email"]', process.env.RIDES_EMAIL || '');
                yield this.page.fill('input[name="password"]', process.env.RIDES_PASSWORD || '');
                console.log('✅ Credenciais preenchidas');
                // Fazer login
                yield this.page.click('button[type="submit"]');
                // Aguardar redirecionamento
                yield this.page.waitForURL('**/dashboard**', { timeout: 30000 });
                console.log('🎉 Login realizado com sucesso!');
            }
            catch (error) {
                console.error('❌ Erro no login:', error);
                throw error;
            }
        });
    }
    focusOnCancelledTab() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                throw new Error('Page not initialized');
            console.log('🎯 FOCANDO NA ABA CANCELADOS...');
            try {
                // Navegar para a aba cancelados
                console.log('📍 Navegando para aba Cancelados...');
                yield this.page.click('a[href="#cancelled"]');
                // Aguardar um pouco para a aba carregar
                yield this.page.waitForTimeout(3000);
                console.log('✅ Aba Cancelados clicada');
                // Aguardar a tabela aparecer
                console.log('⏳ Aguardando tabela de cancelados carregar...');
                // Tentar múltiplos seletores para a tabela
                const possibleSelectors = [
                    '#cancelled table',
                    '#cancelled .dataTables_wrapper table',
                    '#cancelled tbody',
                    'table[id*="cancelled"]',
                    'table[class*="cancelled"]',
                    '.tab-pane.active table',
                    'div[id="cancelled"] table'
                ];
                let tableFound = false;
                let tableSelector = '';
                for (const selector of possibleSelectors) {
                    try {
                        yield this.page.waitForSelector(selector, { timeout: 5000 });
                        tableFound = true;
                        tableSelector = selector;
                        console.log(`✅ Tabela encontrada com seletor: ${selector}`);
                        break;
                    }
                    catch (e) {
                        console.log(`❌ Seletor ${selector} não encontrou tabela`);
                    }
                }
                if (!tableFound) {
                    console.log('⚠️ Nenhuma tabela encontrada com seletores padrão. Vamos investigar o HTML...');
                }
                return tableSelector;
            }
            catch (error) {
                console.error('❌ Erro ao focar na aba cancelados:', error);
                throw error;
            }
        });
    }
    investigatePageContent() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                throw new Error('Page not initialized');
            console.log('🔍 INVESTIGANDO CONTEÚDO COMPLETO DA PÁGINA...');
            try {
                // Aguardar mais tempo para garantir carregamento completo
                console.log('⏳ Aguardando 10 segundos para carregamento completo...');
                yield this.page.waitForTimeout(10000);
                // Verificar se estamos na aba correta
                const currentUrl = this.page.url();
                console.log('🌐 URL atual:', currentUrl);
                // Verificar se a aba cancelados está ativa
                const activeTabs = yield this.page.$$eval('.nav-tabs a', tabs => tabs.map(tab => {
                    var _a;
                    return ({
                        text: (_a = tab.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                        href: tab.getAttribute('href'),
                        isActive: tab.classList.contains('active')
                    });
                }));
                console.log('📋 Abas disponíveis:', JSON.stringify(activeTabs, null, 2));
                // Verificar o HTML completo da div cancelled
                const cancelledContent = yield this.page.$eval('#cancelled', el => el.innerHTML).catch(() => null);
                if (cancelledContent) {
                    console.log('📄 HTML da div #cancelled (primeiros 2000 chars):');
                    console.log(cancelledContent.substring(0, 2000));
                }
                else {
                    console.log('❌ Div #cancelled não encontrada');
                }
                // Verificar todas as tabelas na página
                const allTables = yield this.page.$$eval('table', tables => tables.map((table, index) => ({
                    index,
                    id: table.id,
                    className: table.className,
                    innerHTML: table.innerHTML.substring(0, 500) // Primeiros 500 chars
                })));
                console.log('📊 Todas as tabelas encontradas na página:');
                console.log(JSON.stringify(allTables, null, 2));
                // Verificar elementos com ng-repeat
                const ngRepeatElements = yield this.page.$$eval('[ng-repeat]', elements => elements.map((el, index) => {
                    var _a;
                    return ({
                        index,
                        tagName: el.tagName,
                        ngRepeat: el.getAttribute('ng-repeat'),
                        textContent: (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim().substring(0, 100),
                        innerHTML: el.innerHTML.substring(0, 200)
                    });
                })).catch(() => []);
                console.log('🔄 Elementos com ng-repeat:');
                console.log(JSON.stringify(ngRepeatElements, null, 2));
                // Verificar se há dados carregando
                const loadingElements = yield this.page.$$eval('[class*="loading"], [class*="spinner"], .dataTables_processing', elements => elements.map(el => {
                    var _a;
                    return ({
                        className: el.className,
                        textContent: (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                        visible: el.offsetParent !== null
                    });
                })).catch(() => []);
                console.log('⏳ Elementos de loading:');
                console.log(JSON.stringify(loadingElements, null, 2));
                // Verificar mensagens de "no data"
                const noDataElements = yield this.page.$$eval('[class*="empty"], .dataTables_empty, [class*="no-data"]', elements => elements.map(el => {
                    var _a;
                    return ({
                        className: el.className,
                        textContent: (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                        visible: el.offsetParent !== null
                    });
                })).catch(() => []);
                console.log('🚫 Elementos de "sem dados":');
                console.log(JSON.stringify(noDataElements, null, 2));
            }
            catch (error) {
                console.error('❌ Erro ao investigar conteúdo:', error);
            }
        });
    }
    waitForDataToLoad() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                throw new Error('Page not initialized');
            console.log('⏳ AGUARDANDO DADOS CARREGAREM DINAMICAMENTE...');
            try {
                // Aguardar até 60 segundos para dados aparecerem
                const maxWaitTime = 60000; // 60 segundos
                const checkInterval = 2000; // 2 segundos
                let waited = 0;
                while (waited < maxWaitTime) {
                    console.log(`⏱️ Aguardando dados... (${waited / 1000}s/${maxWaitTime / 1000}s)`);
                    // Verificar se há dados na tabela
                    const hasData = yield this.page.evaluate(() => {
                        // Verificar múltiplos seletores para dados
                        const selectors = [
                            '#cancelled tbody tr:not(.dataTables_empty)',
                            '#cancelled [ng-repeat]',
                            '#cancelled table tbody tr',
                            'div[id="cancelled"] tbody tr'
                        ];
                        for (const selector of selectors) {
                            const elements = document.querySelectorAll(selector);
                            if (elements.length > 0) {
                                // Verificar se não são elementos vazios
                                for (const el of elements) {
                                    if (el.textContent && el.textContent.trim() !== '' && !el.textContent.includes('No data available')) {
                                        return true;
                                    }
                                }
                            }
                        }
                        return false;
                    });
                    if (hasData) {
                        console.log('✅ Dados encontrados!');
                        break;
                    }
                    yield this.page.waitForTimeout(checkInterval);
                    waited += checkInterval;
                }
                if (waited >= maxWaitTime) {
                    console.log('⚠️ Timeout aguardando dados. Continuando com o que temos...');
                }
            }
            catch (error) {
                console.error('❌ Erro aguardando dados:', error);
            }
        });
    }
    extractAllData() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!this.page)
                throw new Error('Page not initialized');
            console.log('📊 EXTRAINDO TODOS OS DADOS DA ABA CANCELADOS...');
            try {
                // Extrair dados de todas as formas possíveis
                const extractedData = {};
                // 1. Extrair via seletores de tabela
                console.log('🔍 Tentativa 1: Extraindo via seletores de tabela...');
                const tableData = yield this.page.evaluate(() => {
                    const tables = document.querySelectorAll('#cancelled table, div[id="cancelled"] table');
                    const results = [];
                    tables.forEach((table, tableIndex) => {
                        const rows = table.querySelectorAll('tbody tr');
                        const headers = Array.from(table.querySelectorAll('thead th')).map(th => { var _a; return (_a = th.textContent) === null || _a === void 0 ? void 0 : _a.trim(); });
                        const tableResult = {
                            tableIndex,
                            headers,
                            rows: []
                        };
                        rows.forEach((row, rowIndex) => {
                            const cells = Array.from(row.querySelectorAll('td')).map(td => { var _a; return (_a = td.textContent) === null || _a === void 0 ? void 0 : _a.trim(); });
                            if (cells.length > 0 && !cells.join('').includes('No data available')) {
                                tableResult.rows.push({ rowIndex, cells });
                            }
                        });
                        results.push(tableResult);
                    });
                    return results;
                });
                extractedData.tableData = tableData;
                console.log('📋 Dados extraídos via tabela:', JSON.stringify(tableData, null, 2));
                // 2. Extrair via ng-repeat
                console.log('🔍 Tentativa 2: Extraindo via ng-repeat...');
                const ngRepeatData = yield this.page.evaluate(() => {
                    const ngElements = document.querySelectorAll('#cancelled [ng-repeat], div[id="cancelled"] [ng-repeat]');
                    return Array.from(ngElements).map((el, index) => {
                        var _a;
                        return ({
                            index,
                            ngRepeat: el.getAttribute('ng-repeat'),
                            textContent: (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                            innerHTML: el.innerHTML
                        });
                    });
                });
                extractedData.ngRepeatData = ngRepeatData;
                console.log('🔄 Dados extraídos via ng-repeat:', JSON.stringify(ngRepeatData, null, 2));
                // 3. Extrair todo o conteúdo textual da aba
                console.log('🔍 Tentativa 3: Extraindo todo conteúdo textual...');
                const allTextContent = yield this.page.$eval('#cancelled', el => el.textContent).catch(() => 'Conteúdo não encontrado');
                extractedData.allTextContent = allTextContent;
                console.log('📝 Todo o conteúdo textual da aba:', allTextContent.substring(0, 1000));
                // 4. Extrair elementos com dados visíveis
                console.log('🔍 Tentativa 4: Extraindo elementos com dados visíveis...');
                const visibleData = yield this.page.evaluate(() => {
                    const cancelledDiv = document.querySelector('#cancelled');
                    if (!cancelledDiv)
                        return [];
                    const allElements = cancelledDiv.querySelectorAll('*');
                    const visibleElements = [];
                    allElements.forEach(el => {
                        if (el.offsetParent !== null && el.textContent && el.textContent.trim() !== '') {
                            visibleElements.push({
                                tagName: el.tagName,
                                className: el.className,
                                textContent: el.textContent.trim().substring(0, 200),
                                innerHTML: el.innerHTML.substring(0, 300)
                            });
                        }
                    });
                    return visibleElements;
                });
                extractedData.visibleData = visibleData.slice(0, 20); // Limitar a 20 elementos para não poluir
                console.log('👁️ Elementos visíveis (primeiros 20):', JSON.stringify(visibleData.slice(0, 20), null, 2));
                return extractedData;
            }
            catch (error) {
                console.error('❌ Erro ao extrair dados:', error);
                return { error: error.message };
            }
        });
    }
    run() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🚀 INICIANDO FOCO TOTAL NA ABA CANCELADOS...');
                yield this.initialize();
                yield this.login();
                const tableSelector = yield this.focusOnCancelledTab();
                yield this.investigatePageContent();
                yield this.waitForDataToLoad();
                const allData = yield this.extractAllData();
                console.log('🎯 RESULTADO FINAL - TUDO DA ABA CANCELADOS:');
                console.log('='.repeat(80));
                console.log(JSON.stringify(allData, null, 2));
                console.log('='.repeat(80));
                return allData;
            }
            catch (error) {
                console.error('💥 Erro geral no scraper focado:', error);
                throw error;
            }
            finally {
                if (this.browser) {
                    yield this.browser.close();
                    console.log('🏁 Browser fechado');
                }
            }
        });
    }
}
exports.FocusCancelledRidesScraper = FocusCancelledRidesScraper;
// Função para executar o scraper
function runFocusCancelledScraper() {
    return __awaiter(this, void 0, void 0, function* () {
        const scraper = new FocusCancelledRidesScraper();
        return yield scraper.run();
    });
}
// Execução direta se chamado como script
if (require.main === module) {
    runFocusCancelledScraper()
        .then(data => {
        console.log('✅ Scraper executado com sucesso!');
        console.log('📊 Dados extraídos:', JSON.stringify(data, null, 2));
    })
        .catch(error => {
        console.error('❌ Erro na execução:', error);
        process.exit(1);
    });
}
