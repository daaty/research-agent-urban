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
exports.testBrowserSimple = testBrowserSimple;
const playwright_1 = require("playwright");
function testBrowserSimple() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('Iniciando teste simples do browser...');
            const browser = yield playwright_1.chromium.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--no-first-run',
                    '--no-zygote',
                    '--disable-gpu',
                    '--disable-extensions',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-renderer-backgrounding'
                ]
            });
            console.log('Browser lançado com sucesso!');
            const page = yield browser.newPage();
            console.log('Nova página criada!');
            // Testar com Google
            yield page.goto('https://www.google.com', {
                waitUntil: 'load',
                timeout: 30000
            });
            const title = yield page.title();
            const url = page.url();
            console.log('Página carregada - Título:', title);
            yield browser.close();
            return {
                success: true,
                message: `Browser funcionando! Título: ${title}, URL: ${url}`
            };
        }
        catch (error) {
            console.error('Erro no teste do browser:', error);
            return {
                success: false,
                message: error.message
            };
        }
    });
}
