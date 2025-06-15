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
exports.testRidesLoginWorking = testRidesLoginWorking;
const playwright_1 = require("playwright");
function testRidesLoginWorking() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando browser para login...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            console.log('Navegando para:', process.env.RIDES_URL);
            yield page.goto(process.env.RIDES_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            yield page.waitForTimeout(3000);
            // Preencher os campos de login
            console.log('Preenchendo email...');
            yield page.fill('#exampleInputEmail1', process.env.RIDES_LOGIN);
            console.log('Preenchendo senha...');
            yield page.fill('#exampleInputPassword1', process.env.RIDES_PASSWORD);
            yield page.waitForTimeout(1000);
            console.log('Procurando botão de login...');
            // Primeiro, vamos ver todos os botões disponíveis
            const allButtons = yield page.$$eval('button', buttons => buttons.map(button => {
                var _a;
                return ({
                    text: (_a = button.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                    type: button.type,
                    className: button.className,
                    id: button.id
                });
            }));
            console.log('Botões encontrados:', JSON.stringify(allButtons, null, 2));
            const loginButton = yield page.$('button[type="submit"], input[type="submit"], button:has-text("Login"), button:has-text("Entrar"), .btn-primary, button.btn');
            if (!loginButton) {
                yield browser.close();
                return {
                    success: false,
                    message: `Botão de login não encontrado. Botões disponíveis: ${JSON.stringify(allButtons, null, 2)}`
                };
            }
            console.log('Botão de login encontrado, clicando...');
            yield loginButton.click();
            console.log('Aguardando redirecionamento...');
            yield page.waitForTimeout(8000);
            // Verificar se há mensagens de erro
            const errorMessages = yield page.$$eval('[class*="error"], [class*="alert"], .text-danger, .alert-danger', elements => elements.map(el => { var _a; return (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(); }).filter(text => text && text.length > 0));
            if (errorMessages.length > 0) {
                yield browser.close();
                return {
                    success: false,
                    message: `Erro de login detectado: ${errorMessages.join(', ')}`
                };
            }
            const finalUrl = page.url();
            const finalTitle = yield page.title();
            yield browser.close();
            const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
            return {
                success: loginSuccess,
                message: `Login ${loginSuccess ? 'bem-sucedido' : 'falhou'}! URL final: ${finalUrl}, Título: ${finalTitle}`
            };
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
