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
exports.testRidesSimple = testRidesSimple;
const playwright_1 = require("playwright");
function testRidesSimple() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando browser...');
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
            const title = yield page.title();
            const url = page.url();
            console.log('Título:', title);
            console.log('URL:', url);
            // Verificar se há inputs na página
            const inputs = yield page.$$eval('input', inputs => inputs.map(input => ({
                type: input.type,
                name: input.name || '',
                id: input.id || '',
                placeholder: input.placeholder || '',
                className: input.className || ''
            })));
            yield browser.close();
            return {
                success: true,
                message: `Página carregada! Título: ${title}, URL: ${url}, Inputs encontrados: ${inputs.length}. Detalhes: ${JSON.stringify(inputs, null, 2)}`
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
