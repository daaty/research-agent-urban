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
exports.captureNetworkRequests = captureNetworkRequests;
const playwright_1 = require("playwright");
function captureNetworkRequests() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando captura de rede...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            // Capturar todas as requisições de rede
            const requests = [];
            page.on('request', request => {
                if (request.url().includes('login') || request.method() === 'POST') {
                    requests.push({
                        url: request.url(),
                        method: request.method(),
                        headers: request.headers(),
                        postData: request.postData()
                    });
                }
            });
            console.log('Navegando para:', process.env.RIDES_URL);
            yield page.goto(process.env.RIDES_URL, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });
            yield page.waitForTimeout(3000);
            // Preencher e submeter o formulário
            yield page.fill('#exampleInputEmail1', process.env.RIDES_LOGIN);
            yield page.fill('#exampleInputPassword1', process.env.RIDES_PASSWORD);
            yield page.waitForTimeout(1000);
            // Clicar no botão de login
            yield page.click('#loginButton');
            // Aguardar requisições
            yield page.waitForTimeout(5000);
            yield browser.close();
            return {
                success: true,
                message: `Requisições capturadas: ${JSON.stringify(requests, null, 2)}`
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
