"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const scrapeController_1 = __importDefault(require("./api/scrapeController"));
const tableScrapingController_1 = __importDefault(require("./api/tableScrapingController"));
const ridesController_1 = __importDefault(require("./api/ridesController"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use(express_1.default.json());
// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
app.use('/api/scrape', scrapeController_1.default);
app.use('/api/scrape-tables', tableScrapingController_1.default);
app.use('/api/rides', ridesController_1.default);
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Endpoints disponíveis:`);
    console.log(`- POST /api/scrape (scraping original com LinkedIn)`);
    console.log(`- POST /api/scrape-tables (scraping genérico de tabelas)`);
    console.log(`- POST /api/rides (scraping do Rides Dashboard)`);
    console.log(`- POST /api/rides/test-login (testar login)`);
    console.log(`- POST /api/rides/preview (preview das tabelas)`);
});
