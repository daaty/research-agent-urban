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
exports.FocusManager = void 0;
const windowPositioner_1 = __importDefault(require("./windowPositioner"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
/**
 * 🎯 Gerenciador de foco para facilitar interação no VNC
 * Permite alternar facilmente entre os browsers do sistema híbrido
 */
class FocusManager {
    constructor() {
        this.windowPositioner = windowPositioner_1.default.getInstance();
    }
    static getInstance() {
        if (!FocusManager.instance) {
            FocusManager.instance = new FocusManager();
        }
        return FocusManager.instance;
    }
    /**
     * 🎯 Método alternativo de foco compatível com Openbox
     */
    focusWindowAlternative(windowId) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🎯 [FOCUS] Tentando foco alternativo na janela ${windowId}...`);
                // Método 1: Usar wmctrl (mais compatível com Openbox)
                try {
                    yield execAsync(`DISPLAY=:99 wmctrl -i -a ${windowId}`);
                    console.log(`✅ [FOCUS] Foco aplicado via wmctrl: ${windowId}`);
                    return true;
                }
                catch (wmctrlError) {
                    console.log(`⚠️ [FOCUS] wmctrl falhou, tentando método 2...`);
                }
                // Método 2: Combinação de raise + focus
                try {
                    yield execAsync(`DISPLAY=:99 xdotool windowraise ${windowId}`);
                    yield execAsync(`DISPLAY=:99 xdotool windowfocus ${windowId}`);
                    console.log(`✅ [FOCUS] Foco aplicado via xdotool raise+focus: ${windowId}`);
                    return true;
                }
                catch (xdotoolError) {
                    console.log(`⚠️ [FOCUS] xdotool raise+focus falhou, tentando método 3...`);
                }
                // Método 3: Click no centro da janela para forçar foco
                try {
                    const { stdout } = yield execAsync(`DISPLAY=:99 xdotool getwindowgeometry ${windowId}`);
                    const geometry = stdout.match(/Geometry: (\d+)x(\d+)/);
                    if (geometry) {
                        const centerX = Math.floor(parseInt(geometry[1]) / 2);
                        const centerY = Math.floor(parseInt(geometry[2]) / 2);
                        yield execAsync(`DISPLAY=:99 xdotool windowraise ${windowId}`);
                        yield execAsync(`DISPLAY=:99 xdotool mousemove --window ${windowId} ${centerX} ${centerY}`);
                        yield execAsync(`DISPLAY=:99 xdotool click --window ${windowId} 1`);
                        console.log(`✅ [FOCUS] Foco aplicado via click simulado: ${windowId}`);
                        return true;
                    }
                }
                catch (clickError) {
                    console.log(`⚠️ [FOCUS] Click simulado falhou...`);
                }
                return false;
            }
            catch (error) {
                console.error(`❌ [FOCUS] Todos os métodos de foco falharam para ${windowId}:`, error);
                return false;
            }
        });
    }
    /**
     * 🎯 Focar na janela do rides_scraper (esquerda)
     */
    focusRidesScraper() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🎯 [FOCUS] Focando no Rides Scraper...');
            // Primeiro tentar método original
            const originalResult = yield this.windowPositioner.focusWindow('rides_scraper');
            if (originalResult) {
                return true;
            }
            // Se falhou, tentar método alternativo
            console.log('🔄 [FOCUS] Método original falhou, tentando alternativo...');
            const windows = yield this.windowPositioner.getChromeWindows();
            if (windows.length > 0) {
                return yield this.focusWindowAlternative(windows[0]);
            }
            return false;
        });
    }
    /**
     * 🎯 Focar na janela do hybrid_scraper (direita)
     */
    focusHybridScraper() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🎯 [FOCUS] Focando no Hybrid Scraper...');
            // Primeiro tentar método original
            const originalResult = yield this.windowPositioner.focusWindow('hybrid_scraper');
            if (originalResult) {
                return true;
            }
            // Se falhou, tentar método alternativo
            console.log('🔄 [FOCUS] Método original falhou, tentando alternativo...');
            const windows = yield this.windowPositioner.getChromeWindows();
            if (windows.length > 1) {
                return yield this.focusWindowAlternative(windows[1]);
            }
            return false;
        });
    }
    /**
     * 🔄 Alternar foco entre as duas janelas
     */
    switchFocus() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🔄 [FOCUS] Alternando foco entre janelas...');
            yield this.windowPositioner.switchFocus();
        });
    }
    /**
     * 🔍 Listar todas as janelas disponíveis (debug)
     */
    listAllWindows() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.windowPositioner.listAllWindows();
        });
    }
    /**
     * 📋 Status das janelas do sistema
     */
    getWindowStatus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const leftFocus = yield this.windowPositioner.focusWindow('rides_scraper');
                const rightFocus = yield this.windowPositioner.focusWindow('hybrid_scraper');
                return {
                    leftWindow: leftFocus,
                    rightWindow: rightFocus
                };
            }
            catch (error) {
                console.error('❌ [FOCUS] Erro ao verificar status das janelas:', error);
                return { leftWindow: false, rightWindow: false };
            }
        });
    }
}
exports.FocusManager = FocusManager;
exports.default = FocusManager;
