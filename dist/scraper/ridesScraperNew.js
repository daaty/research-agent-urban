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
exports.testRidesLogin = testRidesLogin;
exports.scrapeRidesData = scrapeRidesData;
exports.previewRidesTables = previewRidesTables;
const playwright_1 = require("playwright");
function testRidesLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando browser...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            console.log('Navegando para:', process.env.RIDES_LOGIN_URL);
            yield page.goto(process.env.RIDES_LOGIN_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            yield page.waitForTimeout(3000);
            const title = yield page.title();
            const url = page.url();
            console.log('Título:', title);
            console.log('URL:', url);
            // Usar os seletores que encontramos
            const emailField = yield page.$('#exampleInputEmail1');
            const passwordField = yield page.$('#exampleInputPassword1');
            if (!emailField || !passwordField) {
                yield browser.close();
                return {
                    success: false,
                    message: `Campos de login não encontrados. URL: ${url}`
                };
            }
            console.log('Preenchendo credenciais...');
            yield emailField.fill(process.env.RIDES_LOGIN);
            yield passwordField.fill(process.env.RIDES_PASSWORD);
            // Procurar botão de submit
            const submitButton = yield page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar"), button:has-text("Sign"), .btn-primary');
            if (!submitButton) {
                yield browser.close();
                return {
                    success: false,
                    message: 'Botão de login não encontrado'
                };
            }
            console.log('Fazendo login...');
            yield submitButton.click();
            // Aguardar navegação
            yield page.waitForNavigation({ timeout: 10000 });
            const newUrl = page.url();
            const newTitle = yield page.title();
            yield browser.close();
            return {
                success: true,
                message: `Login realizado com sucesso! Nova URL: ${newUrl}, Título: ${newTitle}`
            };
        }
        catch (error) {
            if (browser) {
                yield browser.close();
            }
            return {
                success: false,
                message: `Erro durante teste: ${error.message}`
            };
        }
    });
}
function scrapeRidesData() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            // Fazer login primeiro
            yield page.goto(process.env.RIDES_LOGIN_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            yield page.waitForTimeout(3000);
            // Login
            yield page.fill('#exampleInputEmail1', process.env.RIDES_LOGIN);
            yield page.fill('#exampleInputPassword1', process.env.RIDES_PASSWORD);
            const submitButton = yield page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar"), button:has-text("Sign"), .btn-primary');
            if (submitButton) {
                yield submitButton.click();
                yield page.waitForNavigation({ timeout: 10000 });
            }
            // Agora extrair dados das tabelas
            const tables = yield page.$$('table');
            const tableData = [];
            for (let i = 0; i < tables.length; i++) {
                const table = tables[i];
                // Extrair cabeçalhos
                const headers = yield table.$$eval('thead th, tr:first-child th, tr:first-child td', cells => cells.map(cell => { var _a; return ((_a = cell.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; }));
                // Extrair linhas de dados
                const rows = yield table.$$eval('tbody tr, tr:not(:first-child)', rows => rows.map(row => {
                    const cells = row.querySelectorAll('td, th');
                    return Array.from(cells).map(cell => { var _a; return ((_a = cell.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                }));
                if (headers.length > 0 || rows.length > 0) {
                    tableData.push({
                        id: `table-${i + 1}`,
                        headers: headers,
                        rows: rows,
                        title: `Tabela ${i + 1}`,
                        isEmpty: rows.length === 0
                    });
                }
            }
            yield browser.close();
            return {
                success: true,
                data: tableData,
                message: `${tableData.length} tabelas extraídas com sucesso`
            };
        }
        catch (error) {
            if (browser) {
                yield browser.close();
            }
            return {
                success: false,
                data: [],
                message: `Erro durante scraping: ${error.message}`
            };
        }
    });
}
function previewRidesTables() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            // Fazer login primeiro
            yield page.goto(process.env.RIDES_LOGIN_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            yield page.waitForTimeout(3000);
            // Login
            yield page.fill('#exampleInputEmail1', process.env.RIDES_LOGIN);
            yield page.fill('#exampleInputPassword1', process.env.RIDES_PASSWORD);
            const submitButton = yield page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar"), button:has-text("Sign"), .btn-primary');
            if (submitButton) {
                yield submitButton.click();
                yield page.waitForNavigation({ timeout: 10000 });
            }
            // Contar tabelas
            const tableCount = yield page.$$eval('table', tables => tables.length);
            // Obter informações básicas das tabelas
            const tableInfo = yield page.$$eval('table', tables => tables.map((table, index) => {
                const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th, tr:first-child td'))
                    .map(cell => { var _a; return ((_a = cell.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; });
                const rowCount = table.querySelectorAll('tbody tr, tr:not(:first-child)').length;
                return {
                    index: index + 1,
                    headers: headers,
                    rowCount: rowCount,
                    isEmpty: rowCount === 0
                };
            }));
            yield browser.close();
            return {
                success: true,
                message: `${tableCount} tabelas encontradas. Detalhes: ${JSON.stringify(tableInfo, null, 2)}`
            };
        }
        catch (error) {
            if (browser) {
                yield browser.close();
            }
            return {
                success: false,
                message: `Erro durante preview: ${error.message}`
            };
        }
    });
}
