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
const authenticatedTableScraper_1 = require("../scraper/authenticatedTableScraper");
const router = express_1.default.Router();
router.post('/', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { url, credentials, tableSelectors, options = {} } = req.body;
        // Validação básica
        if (!url) {
            return res.status(400).json({ error: 'URL é obrigatória' });
        }
        if (!(tableSelectors === null || tableSelectors === void 0 ? void 0 : tableSelectors.tableSelector)) {
            return res.status(400).json({ error: 'Seletor de tabela é obrigatório' });
        }
        console.log(`Iniciando scraping de tabelas para: ${url}`);
        const result = yield (0, authenticatedTableScraper_1.scrapeAuthenticatedTables)(url, credentials || null, tableSelectors, options);
        console.log(`Scraping concluído: ${result.totalTables} tabelas encontradas, ${result.emptyTables} vazias`);
        res.json({
            success: true,
            data: result,
            summary: {
                totalTables: result.totalTables,
                emptyTables: result.emptyTables,
                nonEmptyTables: result.totalTables - result.emptyTables,
                timestamp: result.timestamp
            }
        });
    }
    catch (error) {
        console.error('Erro no scraping de tabelas:', error.message);
        res.status(500).json({
            success: false,
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
}));
// Endpoint para testar conectividade
router.get('/test', (req, res) => {
    res.json({
        message: 'Authenticated Table Scraper API está funcionando',
        timestamp: new Date().toISOString()
    });
});
exports.default = router;
