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
exports.testSimpleEnterLogin = testSimpleEnterLogin;
const playwright_1 = require("playwright");
function testSimpleEnterLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando login simples com Enter...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            // Navegar para a página
            yield page.goto(process.env.RIDES_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            yield page.waitForTimeout(3000);
            // Preencher email
            yield page.click('#exampleInputEmail1');
            yield page.type('#exampleInputEmail1', process.env.RIDES_LOGIN, { delay: 100 });
            // Preencher senha
            yield page.click('#exampleInputPassword1');
            yield page.type('#exampleInputPassword1', process.env.RIDES_PASSWORD, { delay: 100 });
            // Pressionar Enter no campo de senha (comum em formulários)
            yield page.press('#exampleInputPassword1', 'Enter');
            // Aguardar redirecionamento
            yield page.waitForTimeout(5000);
            const finalUrl = page.url();
            const finalTitle = yield page.title();
            // Verificar se há mensagem de erro
            const errorMessage = yield page.$eval('.error, .alert-danger, [class*="error"], [class*="alert"]', el => { var _a; return (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(); }).catch(() => null);
            yield browser.close();
            const success = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
            let message = `URL final: ${finalUrl}, Título: "${finalTitle}"`;
            if (errorMessage) {
                message += `, Erro: ${errorMessage}`;
            }
            if (success) {
                message = `Login bem-sucedido! ${message}`;
            }
            return { success, message };
        }
        catch (error) {
            if (browser) {
                yield browser.close();
            }
            return {
                success: false,
                message: `Erro: ${error.message}`
            };
        }
    });
}
