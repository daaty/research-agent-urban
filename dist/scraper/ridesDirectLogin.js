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
exports.testDirectLogin = testDirectLogin;
const playwright_1 = require("playwright");
function testDirectLogin() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando browser para login direto...');
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
            // Tentar chamar diretamente a função de login do AngularJS
            console.log('Tentando login direto via AngularJS...');
            const loginResult = yield page.evaluate((email, password) => {
                try {
                    // Verificar se o AngularJS está disponível
                    if (typeof window.angular === 'undefined') {
                        return { success: false, message: 'AngularJS não encontrado' };
                    }
                    // Pegar o scope do elemento
                    const element = document.getElementById('LoginForm');
                    if (!element) {
                        return { success: false, message: 'Formulário de login não encontrado' };
                    }
                    const scope = window.angular.element(element).scope();
                    if (!scope) {
                        return { success: false, message: 'Scope do AngularJS não encontrado' };
                    }
                    // Definir os dados do usuário
                    scope.user = {
                        email: email,
                        password: password
                    };
                    // Aplicar as mudanças
                    scope.$apply();
                    // Chamar a função de login
                    if (typeof scope.loginAdmin === 'function') {
                        scope.loginAdmin(scope.user);
                        return { success: true, message: 'Função de login chamada com sucesso' };
                    }
                    else {
                        return { success: false, message: 'Função loginAdmin não encontrada' };
                    }
                }
                catch (error) {
                    return { success: false, message: `Erro: ${error.message}` };
                }
            }, process.env.RIDES_LOGIN, process.env.RIDES_PASSWORD);
            if (!loginResult.success) {
                yield browser.close();
                return loginResult;
            }
            console.log('Aguardando redirecionamento após login direto...');
            yield page.waitForTimeout(10000);
            const finalUrl = page.url();
            const finalTitle = yield page.title();
            yield browser.close();
            const loginSuccess = !finalUrl.includes('login') && finalUrl !== process.env.RIDES_URL;
            return {
                success: loginSuccess,
                message: `Login direto ${loginSuccess ? 'bem-sucedido' : 'falhou'}! URL final: ${finalUrl}, Título: ${finalTitle}`
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
