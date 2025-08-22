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
exports.N8nService = void 0;
const axios_1 = __importDefault(require("axios"));
class N8nService {
    constructor(webhookUrl) {
        this.webhookUrl = webhookUrl;
    }
    sendData(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios_1.default.post(this.webhookUrl, data, {
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    timeout: 30000, // 30 segundos
                });
                console.log('✅ Dados enviados para n8n com sucesso:', response.status);
                return true;
            }
            catch (error) {
                console.error('❌ Erro ao enviar dados para n8n:', error.message);
                if (error.response) {
                    console.error('Status:', error.response.status);
                    console.error('Response data:', error.response.data);
                }
                return false;
            }
        });
    }
    sendTableData(sourceUrl_1, tables_1) {
        return __awaiter(this, arguments, void 0, function* (sourceUrl, tables, includeMetadata = true) {
            const webhookData = {
                timestamp: new Date().toISOString(),
                sourceUrl,
                tables,
            };
            if (includeMetadata) {
                webhookData.metadata = {
                    totalTables: tables.length,
                    emptyTables: tables.filter(table => table.rows.length === 0).length,
                    authenticationRequired: true,
                };
            }
            return yield this.sendData(webhookData);
        });
    }
    sendSummarizedData(sourceUrl, tables, summary) {
        return __awaiter(this, void 0, void 0, function* () {
            const webhookData = {
                timestamp: new Date().toISOString(),
                sourceUrl,
                tables,
                summary,
                metadata: {
                    totalTables: tables.length,
                    emptyTables: tables.filter(table => table.rows.length === 0).length,
                    authenticationRequired: true,
                },
            };
            return yield this.sendData(webhookData);
        });
    }
}
exports.N8nService = N8nService;
