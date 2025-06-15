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
exports.simpleRidesLogin = simpleRidesLogin;
exports.testAfterManualLogin = testAfterManualLogin;
const playwright_1 = require("playwright");
function simpleRidesLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            console.log('Navegando...');
            yield page.goto(process.env.RIDES_URL, { timeout: 30000 });
            yield page.waitForTimeout(2000);
            console.log('Preenchendo credenciais...');
            yield page.fill('#exampleInputEmail1', process.env.RIDES_LOGIN);
            yield page.fill('#exampleInputPassword1', process.env.RIDES_PASSWORD);
            console.log('Tentando fazer login...');
            // Tentar pressionar Enter primeiro (mais natural)
            yield page.press('#exampleInputPassword1', 'Enter');
            yield page.waitForTimeout(3000);
            const url1 = page.url();
            console.log('URL após Enter:', url1);
            // Se ainda estiver na página de login, tentar clicar no botão
            if (url1.includes('login')) {
                const submitBtn = yield page.$('button[type="submit"], button');
                if (submitBtn) {
                    yield submitBtn.click();
                    yield page.waitForTimeout(3000);
                }
            }
            const finalUrl = page.url();
            const pageContent = yield page.textContent('body');
            yield browser.close();
            // Verificar se o login foi bem-sucedido
            const loginSuccess = !finalUrl.includes('login');
            const hasError = (pageContent === null || pageContent === void 0 ? void 0 : pageContent.toLowerCase().includes('incorrect')) ||
                (pageContent === null || pageContent === void 0 ? void 0 : pageContent.toLowerCase().includes('invalid')) ||
                (pageContent === null || pageContent === void 0 ? void 0 : pageContent.toLowerCase().includes('erro'));
            let message = `URL final: ${finalUrl}`;
            if (hasError) {
                message += '. Erro detectado na página.';
            }
            if (pageContent && pageContent.length < 200) {
                message += ` Conteúdo: ${pageContent}`;
            }
            return {
                success: loginSuccess && !hasError,
                message: message
            };
        }
        catch (error) {
            if (browser) {
                yield browser.close().catch(() => { });
            }
            return {
                success: false,
                message: `Erro: ${error.message}`
            };
        }
    });
}
// Função para testar apenas se consegue acessar após login manual
function testAfterManualLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            browser = yield playwright_1.chromium.launch({
                headless: false, // Modo visual para você fazer login manual
                slowMo: 1000
            });
            const page = yield browser.newPage();
            console.log('Abrindo página para login manual...');
            yield page.goto(process.env.RIDES_URL);
            console.log('Aguardando 60 segundos para você fazer login manual...');
            yield page.waitForTimeout(60000);
            const finalUrl = page.url();
            const title = yield page.title();
            // Verificar se há tabelas na página
            const tables = yield page.$$('table');
            const tableCount = tables.length;
            yield browser.close();
            return {
                success: !finalUrl.includes('login'),
                message: `Após login manual - URL: ${finalUrl}, Título: ${title}, Tabelas encontradas: ${tableCount}`
            };
        }
        catch (error) {
            if (browser) {
                yield browser.close().catch(() => { });
            }
            return {
                success: false,
                message: `Erro: ${error.message}`
            };
        }
    });
}
