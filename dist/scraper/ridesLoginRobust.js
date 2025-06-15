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
exports.testRidesLoginRobust = testRidesLoginRobust;
const playwright_1 = require("playwright");
function testRidesLoginRobust() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando browser robusto...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            // Aguardar JavaScript carregar antes de interagir
            console.log('Navegando para:', process.env.RIDES_URL);
            yield page.goto(process.env.RIDES_URL, {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            console.log('Aguardando JavaScript carregar...');
            yield page.waitForTimeout(5000);
            // Aguardar especificamente pelos campos de login
            console.log('Aguardando campos de login...');
            yield page.waitForSelector('#exampleInputEmail1', { timeout: 10000 });
            yield page.waitForSelector('#exampleInputPassword1', { timeout: 10000 });
            // Usar type ao invés de fill para simular digitação real
            console.log('Preenchendo email com digitação...');
            yield page.click('#exampleInputEmail1');
            yield page.waitForTimeout(500);
            yield page.type('#exampleInputEmail1', process.env.RIDES_LOGIN, { delay: 100 });
            console.log('Preenchendo senha com digitação...');
            yield page.click('#exampleInputPassword1');
            yield page.waitForTimeout(500);
            yield page.type('#exampleInputPassword1', process.env.RIDES_PASSWORD, { delay: 100 });
            yield page.waitForTimeout(1000);
            // Procurar botão de login com mais opções
            console.log('Procurando botão de login...');
            const buttonSelectors = [
                'button[type="submit"]',
                'input[type="submit"]',
                'button:has-text("Login")',
                'button:has-text("Entrar")',
                '.btn-primary',
                'button.btn',
                '[ng-click*="login"]',
                '[ng-click*="Login"]'
            ];
            let loginButton = null;
            for (const selector of buttonSelectors) {
                try {
                    loginButton = yield page.$(selector);
                    if (loginButton) {
                        console.log('Botão encontrado com seletor:', selector);
                        break;
                    }
                }
                catch (e) {
                    continue;
                }
            }
            if (!loginButton) {
                // Listar todos os botões disponíveis
                const allButtons = yield page.$$eval('button', buttons => buttons.map(button => {
                    var _a;
                    return ({
                        text: (_a = button.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                        type: button.type,
                        className: button.className,
                        onclick: button.onclick ? button.onclick.toString() : null,
                        ngClick: button.getAttribute('ng-click')
                    });
                }));
                yield browser.close();
                return {
                    success: false,
                    message: `Botão de login não encontrado. Botões disponíveis: ${JSON.stringify(allButtons, null, 2)}`
                };
            }
            console.log('Clicando no botão de login...');
            yield loginButton.click();
            // Aguardar mais tempo para o processo de login
            console.log('Aguardando processo de login...');
            yield page.waitForTimeout(8000);
            // Verificar se houve redirecionamento ou mudança na página
            const finalUrl = page.url();
            const finalTitle = yield page.title();
            // Verificar se há mensagens de erro na página
            const errorSelectors = [
                '.alert-danger',
                '.error',
                '[class*="error"]',
                '.ng-binding:has-text("error")',
                '.ng-binding:has-text("incorrect")',
                '.ng-binding:has-text("invalid")'
            ];
            let errorMessage = '';
            for (const selector of errorSelectors) {
                try {
                    const errorElement = yield page.$(selector);
                    if (errorElement) {
                        const text = yield errorElement.textContent();
                        if (text && text.trim()) {
                            errorMessage = text.trim();
                            break;
                        }
                    }
                }
                catch (e) {
                    continue;
                }
            }
            yield browser.close();
            // Verificar sucesso baseado na URL e mensagens
            const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
            if (errorMessage) {
                return {
                    success: false,
                    message: `Erro de login detectado: ${errorMessage}`
                };
            }
            return {
                success: loginSuccess,
                message: `Login ${loginSuccess ? 'bem-sucedido' : 'falhou'}! URL final: ${finalUrl}, Título: ${finalTitle}${errorMessage ? `, Erro: ${errorMessage}` : ''}`
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
