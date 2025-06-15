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
exports.testAngularLoginSafe = testAngularLoginSafe;
const playwright_1 = require("playwright");
function testAngularLoginSafe() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando browser para login AngularJS seguro...');
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
            console.log('Aguardando AngularJS carregar...');
            yield page.waitForTimeout(5000);
            // Aguardar especificamente pelo AngularJS
            yield page.waitForFunction(() => {
                return typeof window.angular !== 'undefined';
            }, { timeout: 10000 });
            console.log('AngularJS carregado, preenchendo campos de forma segura...');
            // Usar uma abordagem mais segura
            const success = yield page.evaluate((credentials) => {
                try {
                    const { email, password } = credentials;
                    // Método 1: Preencher campos diretamente
                    const emailElement = document.getElementById('exampleInputEmail1');
                    const passwordElement = document.getElementById('exampleInputPassword1');
                    if (!emailElement || !passwordElement) {
                        return { success: false, message: 'Campos não encontrados' };
                    }
                    // Limpar campos primeiro
                    emailElement.value = '';
                    passwordElement.value = '';
                    // Preencher caracter por caracter para simular digitação
                    emailElement.focus();
                    emailElement.value = email;
                    passwordElement.focus();
                    passwordElement.value = password;
                    // Disparar eventos múltiplos
                    const events = ['input', 'change', 'keyup', 'blur'];
                    events.forEach(eventType => {
                        emailElement.dispatchEvent(new Event(eventType, { bubbles: true }));
                        passwordElement.dispatchEvent(new Event(eventType, { bubbles: true }));
                    });
                    // Tentar método AngularJS se disponível
                    if (window.angular) {
                        try {
                            const angular = window.angular;
                            const emailScope = angular.element(emailElement).scope();
                            if (emailScope && emailScope.user) {
                                emailScope.user.email = email;
                                emailScope.user.password = password;
                                emailScope.$apply();
                                console.log('AngularJS scope atualizado');
                            }
                        }
                        catch (angularError) {
                            console.log('Erro no AngularJS:', angularError);
                        }
                    }
                    return { success: true, message: 'Campos preenchidos' };
                }
                catch (error) {
                    return { success: false, message: `Erro: ${error.message}` };
                }
            }, {
                email: process.env.RIDES_LOGIN,
                password: process.env.RIDES_PASSWORD
            });
            if (!success.success) {
                yield browser.close();
                return success;
            }
            yield page.waitForTimeout(2000);
            console.log('Procurando botão de login...');
            const buttonClick = yield page.evaluate(() => {
                const button = document.getElementById('loginButton') ||
                    document.querySelector('button[type="submit"]') ||
                    document.querySelector('.login button');
                if (button) {
                    button.click();
                    return true;
                }
                return false;
            });
            if (!buttonClick) {
                yield browser.close();
                return {
                    success: false,
                    message: 'Botão de login não encontrado'
                };
            }
            console.log('Aguardando resposta...');
            yield page.waitForTimeout(8000);
            const finalUrl = page.url();
            console.log('URL final:', finalUrl);
            // Verificar se há mensagem de erro
            const errorCheck = yield page.evaluate(() => {
                const errorSelectors = [
                    '.error',
                    '.alert-danger',
                    '.alert-warning',
                    '[class*="error"]',
                    '[class*="invalid"]'
                ];
                for (const selector of errorSelectors) {
                    const element = document.querySelector(selector);
                    if (element && element.textContent && element.textContent.trim()) {
                        return element.textContent.trim();
                    }
                }
                // Verificar se ainda tem os campos de login visíveis
                const emailField = document.getElementById('exampleInputEmail1');
                if (emailField && emailField.offsetParent !== null) {
                    return 'Ainda na página de login';
                }
                return null;
            });
            yield browser.close();
            const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
            if (errorCheck) {
                return {
                    success: false,
                    message: `Erro detectado: ${errorCheck}`
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
