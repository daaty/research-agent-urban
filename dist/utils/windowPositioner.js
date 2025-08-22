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
exports.WindowPositioner = void 0;
const child_process_1 = require("child_process");
const util_1 = require("util");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class WindowPositioner {
    static getInstance() {
        if (!WindowPositioner.instance) {
            WindowPositioner.instance = new WindowPositioner();
        }
        return WindowPositioner.instance;
    }
    /**
     * 🎯 Move janela do Chrome para posição específica
     */
    moveWindow(instanceName, position) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🎯 [WINDOW] Movendo janela ${instanceName} para (${position.x}, ${position.y})`);
                // 1. Encontrar janelas do Chrome
                const windows = yield this.findChromeWindows();
                console.log(`🔍 [WINDOW] Encontradas ${windows.length} janelas do Chrome`);
                if (windows.length === 0) {
                    console.log('⚠️ [WINDOW] Nenhuma janela do Chrome encontrada');
                    return false;
                }
                // 2. Determinar qual janela mover baseado na instância
                const windowIndex = this.getWindowIndex(instanceName);
                if (windowIndex >= windows.length) {
                    console.log(`⚠️ [WINDOW] Índice ${windowIndex} maior que janelas disponíveis ${windows.length}`);
                    return false;
                }
                const windowId = windows[windowIndex];
                console.log(`🎯 [WINDOW] Movendo janela ID: ${windowId} (índice: ${windowIndex})`);
                // 3. Mover e redimensionar a janela
                yield this.moveAndResizeWindow(windowId, position);
                console.log(`✅ [WINDOW] Janela ${instanceName} posicionada com sucesso`);
                return true;
            }
            catch (error) {
                console.error(`❌ [WINDOW] Erro ao mover janela ${instanceName}:`, error);
                return false;
            }
        });
    }
    /**
     * 🔍 Encontra todas as janelas do Chrome
     */
    findChromeWindows() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { stdout } = yield execAsync('xdotool search --name "Chrome"');
                const windowIds = stdout.trim().split('\n').filter(id => id.length > 0);
                return windowIds;
            }
            catch (error) {
                // Tentar busca alternativa
                try {
                    const { stdout } = yield execAsync('xdotool search --class "chrome"');
                    const windowIds = stdout.trim().split('\n').filter(id => id.length > 0);
                    return windowIds;
                }
                catch (error2) {
                    console.log('⚠️ [WINDOW] Não foi possível encontrar janelas do Chrome');
                    return [];
                }
            }
        });
    }
    /**
     * 🔍 Método público para obter janelas do Chrome (para FocusManager)
     */
    getChromeWindows() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.findChromeWindows();
        });
    }
    /**
     * 📍 Determina índice da janela baseado na instância
     */
    getWindowIndex(instanceName) {
        var _a;
        // Mapear instâncias para índices de janela
        const indexMap = {
            // LADO ESQUERDO (primeira janela)
            'rides_scraper': 0,
            'hybrid_operation': 0,
            'default': 0,
            // LADO DIREITO (segunda janela) 
            'drivers_scraper': 1,
            'hybrid_scraper': 1
        };
        const index = (_a = indexMap[instanceName]) !== null && _a !== void 0 ? _a : 0;
        console.log(`📋 [WINDOW] Instância ${instanceName} → Índice: ${index}`);
        return index;
    }
    /**
     * 🎯 Move e redimensiona janela específica
     */
    moveAndResizeWindow(windowId, position) {
        return __awaiter(this, void 0, void 0, function* () {
            // Comandos xdotool para mover e redimensionar
            const commands = [
                `xdotool windowunmap ${windowId}`, // Minimizar temporariamente
                `xdotool windowsize ${windowId} ${position.width} ${position.height}`, // Redimensionar
                `xdotool windowmove ${windowId} ${position.x} ${position.y}`, // Mover
                `xdotool windowmap ${windowId}`, // Remapear/mostrar
                `xdotool windowraise ${windowId}` // Trazer para frente
            ];
            for (const command of commands) {
                try {
                    yield execAsync(command);
                    yield this.sleep(100); // Pequena pausa entre comandos
                }
                catch (error) {
                    console.log(`⚠️ [WINDOW] Comando falhou: ${command}`);
                }
            }
        });
    }
    /**
     * 🎯 Organiza todas as janelas automaticamente
     */
    arrangeAllWindows() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🎯 [WINDOW] Organizando todas as janelas em split-screen...');
            // Aguardar um pouco para as janelas abrirem
            yield this.sleep(3000);
            const windows = yield this.findChromeWindows();
            if (windows.length < 2) {
                console.log(`⚠️ [WINDOW] Apenas ${windows.length} janela(s) encontrada(s), aguardando mais...`);
                yield this.sleep(2000);
                return this.arrangeAllWindows();
            }
            // Posições para split-screen
            const leftPosition = { x: 0, y: 0, width: 800, height: 1170 };
            const rightPosition = { x: 800, y: 0, width: 800, height: 1170 };
            // Mover primeira janela para esquerda
            if (windows[0]) {
                yield this.moveAndResizeWindow(windows[0], leftPosition);
                console.log('✅ [WINDOW] Janela 1 posicionada à esquerda');
            }
            // Mover segunda janela para direita
            if (windows[1]) {
                yield this.moveAndResizeWindow(windows[1], rightPosition);
                console.log('✅ [WINDOW] Janela 2 posicionada à direita');
            }
            console.log('🎉 [WINDOW] Split-screen organizado com sucesso!');
            // 🎯 Configurar sistema de foco após organizar janelas
            try {
                console.log('🎯 [WINDOW] Configurando sistema de foco automático...');
                yield execAsync('bash /app/manage-window-focus.sh');
                console.log('✅ [WINDOW] Sistema de foco configurado!');
            }
            catch (error) {
                console.log('⚠️ [WINDOW] Erro ao configurar foco:', error);
            }
        });
    }
    /**
     * ⏱️ Utilitário para pausas
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * 🔍 Lista todas as janelas para debug
     */
    listAllWindows() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { stdout } = yield execAsync('xdotool search --name ".*"');
                const windowIds = stdout.trim().split('\n');
                console.log('🔍 [WINDOW] Todas as janelas encontradas:');
                for (const windowId of windowIds.slice(0, 10)) { // Mostrar apenas as primeiras 10
                    try {
                        const { stdout: nameOutput } = yield execAsync(`xdotool getwindowname ${windowId}`);
                        const name = nameOutput.trim();
                        console.log(`  - ID: ${windowId} | Nome: ${name}`);
                    }
                    catch (error) {
                        // Ignorar erros de janelas que não podem ser consultadas
                    }
                }
            }
            catch (error) {
                console.log('⚠️ [WINDOW] Erro ao listar janelas:', error);
            }
        });
    }
    /**
     * 🎯 Focar em uma janela específica por instância
     */
    focusWindow(instanceName) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log(`🎯 [FOCUS] Focando janela: ${instanceName}`);
                // Encontrar janela do Chrome por título/classe
                const { stdout } = yield execAsync(`DISPLAY=:99 xdotool search --class chrome 2>/dev/null || echo ""`);
                const windowIds = stdout.trim().split('\n').filter(id => id.length > 0);
                if (windowIds.length === 0) {
                    console.log('❌ [FOCUS] Nenhuma janela do Chrome encontrada');
                    return false;
                }
                // Mapear instância para índice da janela
                const instanceWindowMap = {
                    'rides_scraper': 0,
                    'hybrid_scraper': 1,
                    'drivers_scraper': 1,
                    'hybrid_operation': 0,
                    'default': 0
                };
                const windowIndex = instanceWindowMap[instanceName] || 0;
                const windowId = windowIds[windowIndex];
                if (!windowId) {
                    console.log(`❌ [FOCUS] Janela ${windowIndex} não encontrada para ${instanceName}`);
                    return false;
                }
                // Método 1: Tentar wmctrl primeiro (mais compatível com Openbox)
                try {
                    yield execAsync(`DISPLAY=:99 wmctrl -i -a ${windowId}`);
                    console.log(`✅ [FOCUS] Janela ${instanceName} (ID: ${windowId}) focada via wmctrl`);
                    return true;
                }
                catch (wmctrlError) {
                    console.log(`⚠️ [FOCUS] wmctrl falhou, tentando xdotool...`);
                }
                // Método 2: Focar com xdotool (original)
                try {
                    yield execAsync(`DISPLAY=:99 xdotool windowraise ${windowId}`);
                    yield execAsync(`DISPLAY=:99 xdotool windowfocus ${windowId}`);
                    yield execAsync(`DISPLAY=:99 xdotool windowactivate ${windowId}`);
                    console.log(`✅ [FOCUS] Janela ${instanceName} (ID: ${windowId}) focada via xdotool`);
                    return true;
                }
                catch (xdotoolError) {
                    console.log(`⚠️ [FOCUS] xdotool falhou, tentando click simulado...`);
                }
                // Método 3: Click no centro da janela para forçar foco
                try {
                    const { stdout: geometry } = yield execAsync(`DISPLAY=:99 xdotool getwindowgeometry ${windowId}`);
                    const match = geometry.match(/Geometry: (\d+)x(\d+)/);
                    if (match) {
                        const centerX = Math.floor(parseInt(match[1]) / 2);
                        const centerY = Math.floor(parseInt(match[2]) / 2);
                        yield execAsync(`DISPLAY=:99 xdotool windowraise ${windowId}`);
                        yield execAsync(`DISPLAY=:99 xdotool mousemove --window ${windowId} ${centerX} ${centerY}`);
                        yield execAsync(`DISPLAY=:99 xdotool click --window ${windowId} 1`);
                        console.log(`✅ [FOCUS] Janela ${instanceName} (ID: ${windowId}) focada via click simulado`);
                        return true;
                    }
                }
                catch (clickError) {
                    console.log(`❌ [FOCUS] Todos os métodos falharam para ${instanceName}`);
                }
                return false;
            }
            catch (error) {
                console.error(`❌ [FOCUS] Erro ao focar janela ${instanceName}:`, error);
                return false;
            }
        });
    }
    /**
     * 🔄 Alternar foco entre janelas
     */
    switchFocus() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                console.log('🔄 [FOCUS] Alternando foco entre janelas...');
                const { stdout } = yield execAsync(`DISPLAY=:99 xdotool search --class chrome 2>/dev/null || echo ""`);
                const windowIds = stdout.trim().split('\n').filter(id => id.length > 0);
                if (windowIds.length < 2) {
                    console.log('❌ [FOCUS] Menos de 2 janelas encontradas para alternar');
                    return;
                }
                // Pegar janela com foco atual
                const { stdout: activeWindow } = yield execAsync(`DISPLAY=:99 xdotool getwindowfocus 2>/dev/null || echo ""`);
                const currentFocus = activeWindow.trim();
                // Alternar para a próxima janela
                const nextWindowIndex = windowIds.indexOf(currentFocus) === 0 ? 1 : 0;
                const nextWindowId = windowIds[nextWindowIndex];
                yield execAsync(`DISPLAY=:99 xdotool windowfocus ${nextWindowId}`);
                yield execAsync(`DISPLAY=:99 xdotool windowactivate ${nextWindowId}`);
                console.log(`✅ [FOCUS] Foco alternado para janela ${nextWindowId}`);
            }
            catch (error) {
                console.error('❌ [FOCUS] Erro ao alternar foco:', error);
            }
        });
    }
}
exports.WindowPositioner = WindowPositioner;
exports.default = WindowPositioner;
