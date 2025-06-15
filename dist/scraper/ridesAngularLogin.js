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
exports.testRidesAngularLogin = testRidesAngularLogin;
const playwright_1 = require("playwright");
function testRidesAngularLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando browser para login AngularJS...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            console.log('Navegando para:', process.env.RIDES_URL);
            yield page.goto(process.env.RIDES_URL, {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            // Aguardar AngularJS carregar
            console.log('Aguardando AngularJS carregar...');
            yield page.waitForTimeout(5000);
            // Aguardar especificamente pelo angular
            yield page.waitForFunction(() => {
                return typeof window.angular !== 'undefined';
            }, { timeout: 10000 });
            console.log('AngularJS carregado, preenchendo campos...');
            // Método 1: Usar evaluate para executar código no contexto da página
            yield page.evaluate((email, password) => {
                // Encontrar o scope do Angular
                const emailElement = document.getElementById('exampleInputEmail1');
                const passwordElement = document.getElementById('exampleInputPassword1');
                if (emailElement && passwordElement) {
                    // Obter o scope Angular
                    const scope = window.angular.element(emailElement).scope();
                    if (scope) {
                        // Definir os valores no modelo Angular
                        scope.user = scope.user || {};
                        scope.user.email = email;
                        scope.user.password = password;
                        // Aplicar as mudanças
                        scope.$apply();
                        console.log('Valores definidos no scope Angular:', scope.user);
                    }
                    // Também definir os valores diretamente nos elementos
                    emailElement.value = email;
                    passwordElement.value = password;
                    // Disparar eventos de input
                    emailElement.dispatchEvent(new Event('input', { bubbles: true }));
                    passwordElement.dispatchEvent(new Event('input', { bubbles: true }));
                    emailElement.dispatchEvent(new Event('change', { bubbles: true }));
                    passwordElement.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }, process.env.RIDES_LOGIN, process.env.RIDES_PASSWORD);
            yield page.waitForTimeout(2000);
            console.log('Clicando no botão de login...');
            yield page.click('#loginButton');
            console.log('Aguardando resposta...');
            yield page.waitForTimeout(8000);
            const finalUrl = page.url();
            console.log('URL final:', finalUrl);
            // Verificar se há mensagem de erro
            const errorMessage = yield page.$eval('.error, .alert-danger, .ng-binding:contains("Incorrect")', el => { var _a; return (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(); }).catch(() => null);
            // Verificar se saiu da página de login
            const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
            yield browser.close();
            if (errorMessage) {
                return {
                    success: false,
                    message: `Erro de login detectado: ${errorMessage}`
                };
            }
            return {
                success: loginSuccess,
                message: `Login ${loginSuccess ? 'bem-sucedido' : 'falhou'}! URL final: ${finalUrl}`
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
