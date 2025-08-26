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
const express_1 = require("express");
const rechargeController_1 = __importDefault(require("./rechargeController"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
const router = (0, express_1.Router)();
// Rotas para controle de recargas internas
router.use('/recharge', rechargeController_1.default);
// 🖱️ Endpoint para resetar cursor do VNC
router.post('/vnc/reset-cursor', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🖱️ Resetando cursor do VNC...');
        yield execAsync('bash /app/reset-vnc-cursor.sh');
        res.json({
            success: true,
            message: 'Cursor do VNC resetado com sucesso'
        });
    }
    catch (error) {
        console.error('❌ Erro ao resetar cursor:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao resetar cursor do VNC'
        });
    }
}));
// 🎯 Endpoint para dar foco à janela da esquerda (Rides)
router.post('/vnc/focus-left', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🎯 Dando foco à janela esquerda...');
        yield execAsync('bash /app/focus-left.sh');
        res.json({
            success: true,
            message: 'Foco na janela esquerda (Rides) ativado'
        });
    }
    catch (error) {
        console.error('❌ Erro ao dar foco:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao dar foco à janela esquerda'
        });
    }
}));
// 🎯 Endpoint para dar foco à janela da direita (Drivers/Híbrido)
router.post('/vnc/focus-right', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        console.log('🎯 Dando foco à janela direita...');
        yield execAsync('bash /app/focus-right.sh');
        res.json({
            success: true,
            message: 'Foco na janela direita (Drivers/Híbrido) ativado'
        });
    }
    catch (error) {
        console.error('❌ Erro ao dar foco:', error);
        res.status(500).json({
            success: false,
            error: 'Erro ao dar foco à janela direita'
        });
    }
}));
exports.default = router;
