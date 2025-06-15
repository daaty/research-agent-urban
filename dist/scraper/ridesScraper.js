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
exports.scrapeRidesTables = scrapeRidesTables;
exports.previewRidesTables = previewRidesTables;
const playwright_1 = require("playwright");
function testRidesLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando browser em modo headless...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
            const page = yield browser.newPage();
            console.log('Navegando para a página de login...');
            yield page.goto(process.env.RIDES_LOGIN_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            // Aguardar a página carregar
            console.log('Aguardando página carregar...');
            yield page.waitForTimeout(3000);
            // Verificar se estamos na página de login
            const currentUrl = page.url();
            console.log('URL atual:', currentUrl);
            // Capturar o título da página para debug
            const pageTitle = yield page.title();
            console.log('Título da página:', pageTitle);
            // Procurar pelos campos específicos que encontramos
            console.log('Procurando campos de login...');
            const emailField = yield page.$('#exampleInputEmail1');
            const passwordField = yield page.$('#exampleInputPassword1');
            if (!emailField || !passwordField) {
                // Capturar conteúdo da página para debug
                const bodyHTML = yield page.content();
                const bodyText = yield page.textContent('body');
                return {
                    success: false,
                    message: `Campos de login não encontrados. URL: ${currentUrl}. 
                 HTML da página (primeiros 1000 chars): ${bodyHTML.substring(0, 1000)}...
                 Texto da página: ${bodyText === null || bodyText === void 0 ? void 0 : bodyText.substring(0, 500)}...`
                };
            }
            console.log('Campos encontrados! Preenchendo credenciais...');
            yield emailField.fill(process.env.RIDES_LOGIN);
            yield passwordField.fill(process.env.RIDES_PASSWORD);
            // Procurar botão de submit por diferentes seletores
            const submitSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Login")',
                'button:has-text("Entrar")',
                'button:has-text("Sign In")',
                '.login-button',
                '.btn-login',
                '[data-testid="login-button"]'
            ];
            let submitButton = null;
            for (const selector of submitSelectors) {
                try {
                    submitButton = yield page.$(selector);
                    if (submitButton) {
                        console.log('Botão de login encontrado com seletor:', selector);
                        break;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            if (!submitButton) {
                return {
                    success: false,
                    message: 'Botão de login não encontrado'
                };
            }
            console.log('Fazendo login...');
            yield submitButton.click();
            // Aguardar redirecionamento ou resposta
            yield page.waitForTimeout(5000);
            const newUrl = page.url();
            console.log('URL após login:', newUrl);
            // Verificar se o login foi bem-sucedido
            if (newUrl !== currentUrl || newUrl.includes('dashboard') || newUrl.includes('home')) {
                return {
                    success: true,
                    message: `Login realizado com sucesso! Redirecionado para: ${newUrl}`
                };
            }
            else {
                // Verificar se há mensagens de erro na página
                const errorMessages = yield page.$$eval('[class*="error"], [class*="alert"], .alert-danger, .error-message', elements => elements.map(el => { var _a; return (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(); }).filter(text => text));
                return {
                    success: false,
                    message: `Login pode ter falhado. URL não mudou: ${newUrl}. Erros encontrados: ${errorMessages.join(', ')}`
                };
            }
        }
        catch (error) {
            console.error('Erro durante teste de login:', error);
            return {
                success: false,
                message: `Erro durante teste: ${error.message}`
            };
        }
        finally {
            if (browser) {
                yield browser.close();
            }
        }
    });
}
function scrapeRidesTables() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando scraping das tabelas...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
            const page = yield browser.newPage();
            // Fazer login primeiro
            yield page.goto(process.env.RIDES_URL, { waitUntil: 'networkidle' });
            // Preencher e submeter formulário de login (similar ao testRidesLogin)
            // ... código de login ...
            // Após login bem-sucedido, navegar para páginas com tabelas
            const tables = [];
            // Lista de URLs ou seletores onde as tabelas podem estar
            const tablePages = [
                '/dashboard',
                '/reports',
                '/data',
                '/tables',
                '/rides'
            ];
            for (const pagePath of tablePages) {
                try {
                    const fullUrl = process.env.RIDES_URL.replace(/\/$/, '') + pagePath;
                    yield page.goto(fullUrl, { waitUntil: 'networkidle' });
                    // Procurar tabelas na página
                    const tablesOnPage = yield page.$$('table');
                    for (let i = 0; i < tablesOnPage.length; i++) {
                        const table = tablesOnPage[i];
                        // Extrair dados da tabela
                        const headers = yield table.$$eval('thead tr th, tr:first-child td', cells => cells.map(cell => { var _a; return ((_a = cell.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; }));
                        const rows = yield table.$$eval('tbody tr, tr:not(:first-child)', (rows) => rows.map(row => Array.from(row.querySelectorAll('td')).map(cell => { var _a; return ((_a = cell.textContent) === null || _a === void 0 ? void 0 : _a.trim()) || ''; })));
                        if (headers.length > 0 || rows.length > 0) {
                            tables.push({
                                name: `Tabela_${pagePath.replace('/', '')}_${i + 1}`,
                                headers,
                                rows,
                                source: fullUrl
                            });
                        }
                    }
                }
                catch (error) {
                    console.log(`Erro ao processar página ${pagePath}:`, error);
                    // Continuar com próxima página
                }
            }
            return tables;
        }
        catch (error) {
            console.error('Erro durante scraping:', error);
            throw error;
        }
        finally {
            if (browser) {
                yield browser.close();
            }
        }
    });
}
function previewRidesTables() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Fazendo preview das tabelas...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu'
                ]
            });
            const page = yield browser.newPage();
            yield page.goto(process.env.RIDES_URL, { waitUntil: 'networkidle' });
            // Capturar informações estruturais da página
            const pageInfo = {
                title: yield page.title(),
                url: page.url(),
                forms: yield page.$$eval('form', forms => forms.length),
                tables: yield page.$$eval('table', tables => tables.length),
                inputs: yield page.$$eval('input', inputs => inputs.map(input => ({
                    type: input.type,
                    name: input.name,
                    placeholder: input.placeholder,
                    id: input.id
                })))
            };
            return {
                success: true,
                message: 'Preview realizado com sucesso',
                preview: pageInfo
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Erro durante preview: ${error.message}`
            };
        }
        finally {
            if (browser) {
                yield browser.close();
            }
        }
    });
}
