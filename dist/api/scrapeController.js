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
const express_1 = __importDefault(require("express"));
const websiteScraper_1 = require("../scraper/websiteScraper");
const linkedinScraper_1 = require("../scraper/linkedinScraper");
const authenticatedTableScraper_1 = require("../scraper/authenticatedTableScraper");
// import { summarizeContent } from '../summarizer/summarizer';
const llamaSummarizer_1 = require("../summarizer/llamaSummarizer");
const n8nService_1 = require("../services/n8nService");
const router = express_1.default.Router();
// Rota original (mantida para compatibilidade)
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { companyUrl, linkedinUrl } = req.body;
        const websiteContent = yield (0, websiteScraper_1.scrapeWebsite)(companyUrl);
        const linkedinPosts = yield (0, linkedinScraper_1.scrapeLinkedIn)(linkedinUrl);
        // const summary = await summarizeContent(websiteContent, linkedinPosts);
        const summarized = yield (0, llamaSummarizer_1.summarizeContentWithOllama)(websiteContent, linkedinPosts);
        res.json(summarized);
    }
    catch (error) {
        console.error('Scraping failed:', error.message);
        res.status(500).json({ error: error.message });
    }
}));
// Nova rota para scraping de tabelas com envio para n8n
router.post('/tables-to-n8n', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url, loginCredentials, n8nWebhookUrl, sendSummary = false, tableSelectors } = req.body;
        // Validações
        if (!url || !n8nWebhookUrl) {
            return res.status(400).json({
                error: 'URL e n8nWebhookUrl são obrigatórios'
            });
        }
        // Fazer scraping das tabelas
        const tables = yield (0, authenticatedTableScraper_1.scrapeAuthenticatedTables)(url, loginCredentials, tableSelectors);
        // Inicializar serviço n8n
        const n8nService = new n8nService_1.N8nService(n8nWebhookUrl);
        let success = false;
        if (sendSummary) {
            // Se solicitado, criar resumo com LLM
            try {
                const tableContent = tables.map(table => `Tabela ${table.title}: ${table.rows.length} linhas`).join('\n');
                const summary = yield (0, llamaSummarizer_1.summarizeContentWithOllama)(`Dados extraídos de ${url}`, [tableContent]);
                success = yield n8nService.sendSummarizedData(url, tables, summary);
            }
            catch (summaryError) {
                console.warn('Erro ao gerar resumo, enviando dados brutos:', summaryError);
                success = yield n8nService.sendTableData(url, tables);
            }
        }
        else {
            // Enviar apenas dados brutos
            success = yield n8nService.sendTableData(url, tables);
        }
        if (success) {
            res.json({
                success: true,
                message: 'Dados enviados para n8n com sucesso',
                tablesFound: tables.length,
                emptyTables: tables.filter(t => t.rows.length === 0).length,
                totalRows: tables.reduce((sum, table) => sum + table.rows.length, 0)
            });
        }
        else {
            res.status(500).json({
                success: false,
                error: 'Falha ao enviar dados para n8n',
                tablesExtracted: tables.length
            });
        }
    }
    catch (error) {
        console.error('Erro no scraping com n8n:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));
// Nova rota para apenas scraping de tabelas (sem envio para n8n)
router.post('/tables', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url, loginCredentials, tableSelectors } = req.body;
        if (!url) {
            return res.status(400).json({ error: 'URL é obrigatória' });
        }
        const tables = yield (0, authenticatedTableScraper_1.scrapeAuthenticatedTables)(url, loginCredentials, tableSelectors);
        res.json({
            success: true,
            url,
            extractedAt: new Date().toISOString(),
            tables,
            summary: {
                totalTables: tables.length,
                emptyTables: tables.filter(t => t.rows.length === 0).length,
                totalRows: tables.reduce((sum, table) => sum + table.rows.length, 0)
            }
        });
    }
    catch (error) {
        console.error('Erro no scraping de tabelas:', error.message);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}));
exports.default = router;
