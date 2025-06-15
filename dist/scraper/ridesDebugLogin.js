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
            console.log('Iniciando browser para debug do login...');
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
            // Verificar todos os elementos da página antes do login
            console.log('=== ANÁLISE DA PÁGINA DE LOGIN ===');
            // Verificar se há campos ocultos
            const hiddenInputs = yield page.$$eval('input[type="hidden"]', inputs => inputs.map(input => ({
                name: input.name,
                value: input.value,
                id: input.id
            })));
            console.log('Campos ocultos encontrados:', hiddenInputs);
            // Verificar todos os inputs
            const allInputs = yield page.$$eval('input', inputs => inputs.map(input => ({
                type: input.type,
                name: input.name || '',
                id: input.id || '',
                placeholder: input.placeholder || '',
                value: input.value || '',
                required: input.required
            })));
            console.log('Todos os inputs:', allInputs);
            // Verificar se há formulários
            const forms = yield page.$$eval('form', forms => forms.map(form => ({
                action: form.action,
                method: form.method,
                id: form.id || '',
                className: form.className || ''
            })));
            console.log('Formulários encontrados:', forms);
            // Preencher os campos devagar
            console.log('Preenchendo email devagar...');
            yield page.click('#exampleInputEmail1');
            yield page.fill('#exampleInputEmail1', '');
            yield page.type('#exampleInputEmail1', process.env.RIDES_LOGIN, { delay: 100 });
            console.log('Preenchendo senha devagar...');
            yield page.click('#exampleInputPassword1');
            yield page.fill('#exampleInputPassword1', '');
            yield page.type('#exampleInputPassword1', process.env.RIDES_PASSWORD, { delay: 100 });
            yield page.waitForTimeout(2000);
            // Verificar valores preenchidos
            const emailValue = yield page.inputValue('#exampleInputEmail1');
            const passwordValue = yield page.inputValue('#exampleInputPassword1');
            console.log('Email preenchido:', emailValue);
            console.log('Senha preenchida:', '[HIDDEN]', passwordValue.length, 'caracteres');
            // Procurar todos os botões
            const allButtons = yield page.$$eval('button, input[type="submit"]', buttons => buttons.map(button => {
                var _a;
                return ({
                    text: (_a = button.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                    type: button.type,
                    className: button.className,
                    id: button.id || '',
                    disabled: button.disabled
                });
            }));
            console.log('Todos os botões:', allButtons);
            // Tentar encontrar o botão de login de forma mais específica
            const loginButton = (yield page.$('button[type="submit"]')) ||
                (yield page.$('input[type="submit"]')) ||
                (yield page.$('button:has-text("Login")')) ||
                (yield page.$('button:has-text("Entrar")')) ||
                (yield page.$('.btn-primary')) ||
                (yield page.$('button'));
            if (!loginButton) {
                yield browser.close();
                return {
                    success: false,
                    message: `Nenhum botão encontrado. Análise completa: Inputs: ${JSON.stringify(allInputs, null, 2)}, Botões: ${JSON.stringify(allButtons, null, 2)}`
                };
            }
            console.log('Clicando no botão de login...');
            yield loginButton.click();
            // Aguardar um pouco e verificar se apareceu algum erro
            yield page.waitForTimeout(3000);
            // Procurar por mensagens de erro
            const errorSelectors = [
                '.alert-danger',
                '.error',
                '.invalid-feedback',
                '[class*="error"]',
                '[class*="danger"]',
                '.text-danger'
            ];
            let errorMessage = '';
            for (const selector of errorSelectors) {
                try {
                    const errorElement = yield page.$(selector);
                    if (errorElement) {
                        errorMessage = (yield errorElement.textContent()) || '';
                        if (errorMessage.trim()) {
                            console.log('Erro encontrado com seletor', selector, ':', errorMessage);
                            break;
                        }
                    }
                }
                catch (e) {
                    // Ignorar erros de seletor
                }
            }
            // Se não encontrou erro específico, procurar qualquer texto de erro na página
            if (!errorMessage) {
                const pageText = yield page.textContent('body');
                const errorKeywords = ['incorrect', 'invalid', 'wrong', 'error', 'fail', 'erro', 'inválido', 'incorreto'];
                for (const keyword of errorKeywords) {
                    if (pageText === null || pageText === void 0 ? void 0 : pageText.toLowerCase().includes(keyword.toLowerCase())) {
                        const sentences = pageText.split(/[.!?]+/);
                        const errorSentence = sentences.find(s => s.toLowerCase().includes(keyword.toLowerCase()));
                        if (errorSentence) {
                            errorMessage = errorSentence.trim();
                            break;
                        }
                    }
                }
            }
            const finalUrl = page.url();
            const finalTitle = yield page.title();
            yield browser.close();
            const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
            return {
                success: loginSuccess,
                message: `Debug completo - Login ${loginSuccess ? 'bem-sucedido' : 'falhou'}! URL final: ${finalUrl}, Título: ${finalTitle}, ${errorMessage ? 'Erro: ' + errorMessage : 'Sem erros visíveis'}, Credenciais testadas: ${emailValue} / [senha com ${passwordValue.length} caracteres]`
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
