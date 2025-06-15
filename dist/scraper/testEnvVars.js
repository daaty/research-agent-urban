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
exports.testEnvironmentVariables = testEnvironmentVariables;
const dotenv_1 = __importDefault(require("dotenv"));
// Carregar variáveis de ambiente
dotenv_1.default.config();
function testEnvironmentVariables() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            console.log('=== Debug das Variáveis de Ambiente ===');
            console.log('RIDES_URL:', process.env.RIDES_URL);
            console.log('RIDES_LOGIN:', process.env.RIDES_LOGIN);
            console.log('RIDES_PASSWORD:', process.env.RIDES_PASSWORD ? '***DEFINIDA***' : 'UNDEFINED');
            console.log('NODE_ENV:', process.env.NODE_ENV);
            console.log('PWD:', process.env.PWD);
            if (!process.env.RIDES_URL) {
                return {
                    success: false,
                    message: 'RIDES_URL não está definida'
                };
            }
            if (!process.env.RIDES_LOGIN) {
                return {
                    success: false,
                    message: 'RIDES_LOGIN não está definida'
                };
            }
            if (!process.env.RIDES_PASSWORD) {
                return {
                    success: false,
                    message: 'RIDES_PASSWORD não está definida'
                };
            }
            return {
                success: true,
                message: `Todas as variáveis estão definidas: URL=${process.env.RIDES_URL}, LOGIN=${process.env.RIDES_LOGIN}`
            };
        }
        catch (error) {
            return {
                success: false,
                message: `Erro ao verificar variáveis: ${error.message}`
            };
        }
    });
}
