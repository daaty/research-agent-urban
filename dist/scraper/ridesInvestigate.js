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
exports.investigateRidesForm = investigateRidesForm;
const playwright_1 = require("playwright");
function investigateRidesForm() {
    return __awaiter(this, void 0, void 0, function* () {
        let browser;
        try {
            console.log('Iniciando investigação do formulário...');
            browser = yield playwright_1.chromium.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
            });
            const page = yield browser.newPage();
            console.log('Navegando para a página de login...');
            yield page.goto(process.env.RIDES_URL, {
                waitUntil: 'networkidle',
                timeout: 30000
            });
            yield page.waitForTimeout(5000);
            // Capturar TODOS os elementos do formulário
            const formData = yield page.evaluate(() => {
                const forms = Array.from(document.querySelectorAll('form'));
                const allInputs = Array.from(document.querySelectorAll('input'));
                const allButtons = Array.from(document.querySelectorAll('button'));
                return {
                    forms: forms.map(form => ({
                        id: form.id,
                        className: form.className,
                        action: form.action,
                        method: form.method,
                        outerHTML: form.outerHTML.substring(0, 500)
                    })),
                    inputs: allInputs.map(input => ({
                        type: input.type,
                        name: input.name,
                        id: input.id,
                        value: input.value,
                        placeholder: input.placeholder,
                        required: input.required,
                        className: input.className,
                        style: input.style.cssText
                    })),
                    buttons: allButtons.map(button => {
                        var _a, _b;
                        return ({
                            type: button.type,
                            textContent: (_a = button.textContent) === null || _a === void 0 ? void 0 : _a.trim(),
                            className: button.className,
                            id: button.id,
                            onclick: ((_b = button.onclick) === null || _b === void 0 ? void 0 : _b.toString()) || null
                        });
                    })
                };
            });
            // Verificar se há scripts relacionados a login
            const scripts = yield page.evaluate(() => {
                const scriptTags = Array.from(document.querySelectorAll('script'));
                return scriptTags
                    .map(script => script.textContent || script.src)
                    .filter(content => content && (content.includes('login') ||
                    content.includes('password') ||
                    content.includes('auth') ||
                    content.includes('submit')))
                    .map(content => content.substring(0, 200));
            });
            yield browser.close();
            return {
                success: true,
                message: JSON.stringify({
                    forms: formData.forms,
                    inputs: formData.inputs,
                    buttons: formData.buttons,
                    relevantScripts: scripts
                }, null, 2)
            };
        }
        catch (error) {
            if (browser) {
                yield browser.close();
            }
            return {
                success: false,
                message: `Erro durante investigação: ${error.message}`
            };
        }
    });
}
