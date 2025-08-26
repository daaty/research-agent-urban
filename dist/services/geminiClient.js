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
exports.GeminiClient = void 0;
const generative_ai_1 = require("@google/generative-ai");
class GeminiClient {
    constructor(apiKey) {
        this.genAI = new generative_ai_1.GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    }
    /**
     * Analisa comando e retorna ações para executar
     */
    analyzeAndPlan(request) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const prompt = this.buildAnalysisPrompt(request);
                const result = yield this.model.generateContent(prompt);
                const response = result.response.text();
                // Parse da resposta para extrair ações
                const actions = this.parseActionsFromResponse(response);
                return {
                    success: true,
                    response,
                    actions
                };
            }
            catch (error) {
                console.error('❌ Erro no Gemini:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
    /**
     * Analisa screenshot e identifica elementos
     */
    analyzeScreenshot(screenshot, command, context) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const prompt = this.buildVisionPrompt(command, context);
                const result = yield this.model.generateContent([
                    prompt,
                    {
                        inlineData: {
                            data: screenshot,
                            mimeType: 'image/png'
                        }
                    }
                ]);
                const response = result.response.text();
                const actions = this.parseActionsFromResponse(response);
                return {
                    success: true,
                    response,
                    actions
                };
            }
            catch (error) {
                console.error('❌ Erro na análise visual:', error);
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
    /**
     * Gera resposta conversacional sobre dados
     */
    generateInsight(data, question) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const prompt = `
Analise os seguintes dados e responda à pergunta:

DADOS:
${JSON.stringify(data, null, 2)}

PERGUNTA: ${question}

Forneça uma resposta clara, objetiva e insights úteis baseados nos dados.
`;
                const result = yield this.model.generateContent(prompt);
                const response = result.response.text();
                return {
                    success: true,
                    response
                };
            }
            catch (error) {
                return {
                    success: false,
                    error: error.message
                };
            }
        });
    }
    /**
     * Constrói prompt para análise de comandos
     */
    buildAnalysisPrompt(request) {
        return `
Você é um AI Web Agent especialista em automação de navegadores. 

COMANDO DO USUÁRIO: "${request.command}"
URL ATUAL: ${request.pageUrl || 'não informada'}
CONTEXTO: ${request.context || 'Sistema de corridas Rides Dashboard'}

Analise o comando e retorne uma sequência de ações para executar no navegador.

AÇÕES DISPONÍVEIS:
- click: clicar em elemento (forneça selector CSS)
- type: digitar texto (forneça selector e texto)
- scroll: rolar página (up/down/element)
- wait: aguardar (milissegundos)
- navigate: navegar para URL
- screenshot: capturar tela

FORMATO DE RESPOSTA:
Sempre retorne em JSON com array de ações:

{
  "explanation": "Explicação do que vai fazer",
  "actions": [
    {
      "type": "navigate",
      "url": "https://exemplo.com"
    },
    {
      "type": "type",
      "selector": "#email",
      "text": "usuario@exemplo.com"
    },
    {
      "type": "click",
      "selector": "button[type='submit']"
    }
  ]
}

Seja específico com seletores CSS. Se não tiver certeza, use "screenshot" primeiro.
`;
    }
    /**
     * Constrói prompt para análise visual
     */
    buildVisionPrompt(command, context) {
        return `
Analise esta screenshot de uma página web e execute o comando solicitado.

COMANDO: "${command}"
CONTEXTO: ${context || 'Sistema web'}

Identifique os elementos necessários e retorne ações específicas.

IMPORTANTE:
- Identifique seletores CSS precisos
- Se for fazer login, identifique campos de email/senha
- Se for clicar em botão, identifique o seletor exato
- Se houver captcha, indique isso
- Se houver erros na página, mencione

FORMATO DE RESPOSTA JSON:
{
  "analysis": "O que você vê na tela",
  "actions": [
    {
      "type": "click",
      "selector": "button.login-btn",
      "coordinates": {"x": 100, "y": 200}
    }
  ],
  "warnings": ["Avisos importantes"]
}
`;
    }
    /**
     * Extrai ações da resposta do Gemini
     */
    parseActionsFromResponse(response) {
        try {
            // Tentar extrair JSON da resposta
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return parsed.actions || [];
            }
            // Fallback: parse manual de ações comuns
            return this.fallbackParseActions(response);
        }
        catch (error) {
            console.warn('⚠️ Erro ao parsear ações, usando fallback');
            return this.fallbackParseActions(response);
        }
    }
    /**
     * Parse manual para casos onde JSON falha
     */
    fallbackParseActions(response) {
        const actions = [];
        // Detectar navegação
        if (response.toLowerCase().includes('navegar') || response.includes('navigate')) {
            const urlMatch = response.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
                actions.push({
                    type: 'navigate',
                    url: urlMatch[0]
                });
            }
        }
        // Detectar clique
        if (response.toLowerCase().includes('clicar') || response.includes('click')) {
            actions.push({
                type: 'screenshot' // Capturar tela primeiro para análise visual
            });
        }
        return actions;
    }
}
exports.GeminiClient = GeminiClient;
