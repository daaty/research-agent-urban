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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.summarizeContentWithOllama = summarizeContentWithOllama;
const node_fetch_1 = __importDefault(require("node-fetch"));
const OLLAMA_URL = 'http://localhost:11434/api/generate'; // ← assuming your Ollama runs here
function summarizeWithLlama(prompt) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield (0, node_fetch_1.default)('http://localhost:11434/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'mistral', // your ollama model
                prompt: prompt,
                stream: false,
            }),
        });
        if (!response.ok) {
            throw new Error(`Ollama API call failed with status: ${response.status}`);
        }
        const data = yield response.json();
        return data.response.trim();
    });
}
function summarizeContentWithOllama(websiteText, linkedinPosts) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const websitePrompt = `
  Summarize the following website content into 5-6 lines focusing on key services, expertise, and offerings:
  "${websiteText}"
      `;
            const websiteSummary = yield summarizeWithLlama(websitePrompt);
            const linkedinPrompt = `
  Summarize the following LinkedIn posts into major topics, client news, blog posts, and important announcements:
  "${linkedinPosts.join('\n\n')}"
      `;
            const linkedinSummary = yield summarizeWithLlama(linkedinPrompt);
            return {
                websiteSummary,
                linkedinSummary
            };
        }
        catch (error) {
            console.error('Error during summarization:', error);
            throw error;
        }
    });
}
