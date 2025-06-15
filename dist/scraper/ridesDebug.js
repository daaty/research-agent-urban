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
exports.debugRidesLogin = debugRidesLogin;
const playwright_1 = require("playwright");
function debugRidesLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando browser para debug...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            // Interceptar requisições de rede
            const requests = [];
            page.on('request', request => {
                if (request.method() === 'POST') {
                    requests.push({
                        url: request.url(),
                        method: request.method(),
                        postData: request.postData(),
                        headers: request.headers()
                    });
                }
            });
            console.log('Navegando para:', process.env.RIDES_URL);
            yield page.goto(process.env.RIDES_URL, {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            yield page.waitForTimeout(2000);
            // Verificar se há campos ocultos ou tokens CSRF
            const hiddenInputs = yield page.$$eval('input[type="hidden"]', inputs => inputs.map(input => ({
                name: input.name,
                value: input.value,
                id: input.id
            })));
            console.log('Campos ocultos encontrados:', hiddenInputs);
            // Verificar os valores dos campos antes do preenchimento
            const emailValue = yield page.inputValue('#exampleInputEmail1');
            const passwordValue = yield page.inputValue('#exampleInputPassword1');
            console.log('Valores iniciais - Email:', emailValue, 'Password:', passwordValue);
            // Limpar campos primeiro
            yield page.fill('#exampleInputEmail1', '');
            yield page.fill('#exampleInputPassword1', '');
            yield page.waitForTimeout(500);
            // Preencher letra por letra para simular digitação humana
            console.log('Digitando email...');
            yield page.type('#exampleInputEmail1', process.env.RIDES_LOGIN, { delay: 100 });
            console.log('Digitando senha...');
            yield page.type('#exampleInputPassword1', process.env.RIDES_PASSWORD, { delay: 100 });
            yield page.waitForTimeout(1000);
            // Verificar os valores após preenchimento
            const emailAfter = yield page.inputValue('#exampleInputEmail1');
            const passwordAfter = yield page.inputValue('#exampleInputPassword1');
            console.log('Valores após preenchimento - Email:', emailAfter, 'Password length:', passwordAfter.length);
            // Verificar se há formulário e seus atributos
            const form = yield page.$('form');
            let formAction = '';
            let formMethod = '';
            if (form) {
                formAction = (yield form.getAttribute('action')) || '';
                formMethod = (yield form.getAttribute('method')) || '';
                console.log('Form action:', formAction, 'method:', formMethod);
            }
            // Procurar botão de login
            const buttons = yield page.$$eval('button', buttons => buttons.map(button => {
                var _a;
                return ({
                    text: (_a = button.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                    type: button.type,
                    className: button.className,
                    disabled: button.disabled
                });
            }));
            console.log('Botões encontrados:', buttons);
            // Tentar submit do formulário diretamente
            console.log('Fazendo submit do formulário...');
            if (form) {
                yield form.evaluate(form => form.submit());
            }
            else {
                // Se não houver formulário, tentar clicar no botão
                const loginButton = yield page.$('button[type="submit"], .btn-primary, button:has-text("Login")');
                if (loginButton) {
                    yield loginButton.click();
                }
            }
            console.log('Aguardando resposta...');
            yield page.waitForTimeout(5000);
            const finalUrl = page.url();
            // Verificar se há mensagens de erro na página
            const errorMessages = yield page.$$eval('.alert, .error, .alert-danger, [class*="error"]', elements => elements.map(el => { var _a; return (_a = el.textContent) === null || _a === void 0 ? void 0 : _a.trim(); }));
            yield browser.close();
            return {
                success: true,
                message: `Debug completo:
        URL final: ${finalUrl}
        Credenciais enviadas: ${emailAfter} / senha com ${passwordAfter.length} caracteres
        Campos ocultos: ${JSON.stringify(hiddenInputs)}
        Requisições POST: ${JSON.stringify(requests, null, 2)}
        Mensagens de erro: ${JSON.stringify(errorMessages)}
        Form action: ${formAction}, method: ${formMethod}
        Botões: ${JSON.stringify(buttons)}`
            };
        }
        catch (error) {
            if (browser) {
                yield browser.close();
            }
            return {
                success: false,
                message: `Erro durante debug: ${error.message}`
            };
        }
    });
}
