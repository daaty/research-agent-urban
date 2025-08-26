"use strict";
/**
 * 🔍 Environment Detector
 * Detecta automaticamente o ambiente de execução e configura display adequado
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnvironmentDetector = void 0;
class EnvironmentDetector {
    constructor() {
        this.config = this.detectEnvironment();
    }
    static getInstance() {
        if (!EnvironmentDetector.instance) {
            EnvironmentDetector.instance = new EnvironmentDetector();
        }
        return EnvironmentDetector.instance;
    }
    /**
     * Detecta o ambiente de execução atual
     */
    detectEnvironment() {
        // 🐳 Detectar Docker
        const isDocker = this.isRunningInDocker();
        // 🌐 Detectar Codespace
        const isCodespace = this.isRunningInCodespace();
        // 🖥️ Detectar Local
        const isLocal = !isDocker && !isCodespace;
        // 🖥️ Configurar modo de display
        let displayMode = 'headless';
        let displayVar;
        let needsXvfb = false;
        let vncEnabled = false;
        if (isDocker) {
            // Docker: usar VNC se disponível
            if (process.env.VNC_PORT || process.env.NOVNC_PORT) {
                displayMode = 'vnc';
                displayVar = ':99'; // Display padrão VNC
                vncEnabled = true;
            }
            else {
                displayMode = 'headless';
            }
        }
        else if (isCodespace) {
            // Codespace: usar Xvfb
            displayMode = 'xvfb';
            displayVar = process.env.DISPLAY || ':99';
            needsXvfb = true;
        }
        else if (isLocal) {
            // Local: verificar sistema operacional
            const isWindows = process.platform === 'win32';
            if (isWindows) {
                // Windows: usar modo visual por padrão para desenvolvimento
                // Só usar headless se explicitamente definido na env
                if (process.env.HEADLESS_MODE === 'true') {
                    displayMode = 'headless';
                }
                else {
                    displayMode = 'vnc'; // Modo visual no Windows (sem XVFB)
                }
                needsXvfb = false;
                vncEnabled = false;
            }
            else {
                // Linux/Mac: verificar se tem display disponível
                if (process.env.DISPLAY && process.env.DISPLAY !== '') {
                    displayMode = 'vnc'; // Display local
                    displayVar = process.env.DISPLAY;
                }
                else {
                    displayMode = 'xvfb';
                    displayVar = ':99';
                    needsXvfb = true;
                }
            }
        }
        return {
            isDocker,
            isCodespace,
            isLocal,
            displayMode,
            displayVar,
            needsXvfb,
            vncEnabled
        };
    }
    /**
     * Detecta se está rodando em Docker
     */
    isRunningInDocker() {
        var _a, _b;
        try {
            // Verificar arquivo /.dockerenv
            const fs = require('fs');
            if (fs.existsSync('/.dockerenv')) {
                return true;
            }
            // Verificar cgroup
            if (fs.existsSync('/proc/1/cgroup')) {
                const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
                if (cgroup.includes('docker') || cgroup.includes('containerd')) {
                    return true;
                }
            }
            // Verificar variáveis de ambiente Docker
            if (process.env.DOCKER_CONTAINER ||
                ((_a = process.env.HOSTNAME) === null || _a === void 0 ? void 0 : _a.startsWith('docker-')) ||
                ((_b = process.env.PWD) === null || _b === void 0 ? void 0 : _b.includes('/workspaces/'))) {
                return true;
            }
            return false;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Detecta se está rodando em GitHub Codespace
     */
    isRunningInCodespace() {
        var _a;
        return !!(process.env.CODESPACES ||
            process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ||
            process.env.CODESPACE_NAME ||
            ((_a = process.env.PWD) === null || _a === void 0 ? void 0 : _a.includes('/workspaces/')));
    }
    /**
     * Obtém a configuração do ambiente
     */
    getConfig() {
        return Object.assign({}, this.config);
    }
    /**
     * Gera comando de inicialização do browser baseado no ambiente
     */
    getBrowserStartCommand() {
        const config = this.getConfig();
        switch (config.displayMode) {
            case 'vnc':
                return [
                    `DISPLAY=${config.displayVar}`,
                    'npm run prod'
                ];
            case 'xvfb':
                return [
                    `DISPLAY=${config.displayVar}`,
                    'xvfb-run -a -s "-screen 0 1920x1080x24"',
                    'npm run prod'
                ];
            case 'headless':
            default:
                return ['npm run prod'];
        }
    }
    /**
     * Obtém configurações do Playwright baseadas no ambiente
     */
    getPlaywrightConfig() {
        const config = this.getConfig();
        const isWindows = process.platform === 'win32';
        const baseConfig = {
            headless: config.displayMode === 'headless',
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-web-security',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                // 🔧 Melhorias específicas para VNC/Docker
                '--disable-blink-features=AutomationControlled',
                '--disable-features=VizDisplayCompositor',
                '--disable-ipc-flooding-protection',
                '--disable-hang-monitor',
                '--disable-prompt-on-repost',
                '--disable-client-side-phishing-detection',
                '--disable-sync',
                '--metrics-recording-only',
                '--no-first-run',
                '--safebrowsing-disable-auto-update',
                '--enable-automation',
                '--password-store=basic',
                '--use-mock-keychain',
                // 🚀 Performance para VNC
                '--memory-pressure-off',
                '--max_old_space_size=4096'
            ]
        };
        // 🔧 Configurações específicas para Linux/Docker com display
        if (config.displayMode === 'xvfb' && config.displayVar) {
            baseConfig.args.push(`--display=${config.displayVar}`);
            baseConfig.args.push('--disable-gpu-sandbox', '--disable-software-rasterizer', '--disable-background-networking', '--disable-default-apps', '--disable-extensions', '--disable-sync', '--disable-translate', '--hide-scrollbars', '--mute-audio', '--no-default-browser-check', '--no-first-run');
        }
        // 🔧 Configurações específicas para Windows (não adicionar --display)
        if (isWindows && config.displayMode === 'vnc') {
            // Windows em modo visual - não usar --display
            baseConfig.args.push('--disable-background-networking', '--disable-default-apps', '--no-default-browser-check', '--no-first-run');
        }
        if (config.isDocker) {
            baseConfig.args.push('--disable-gpu', '--disable-software-rasterizer', '--no-first-run');
        }
        return baseConfig;
    }
    /**
     * Log da configuração detectada
     */
    logEnvironmentInfo() {
        const config = this.getConfig();
        console.log('🔍' + '='.repeat(50));
        console.log('🔍 ENVIRONMENT DETECTOR');
        console.log('🔍' + '='.repeat(50));
        console.log(`🐳 Docker: ${config.isDocker ? '✅' : '❌'}`);
        console.log(`🌐 Codespace: ${config.isCodespace ? '✅' : '❌'}`);
        console.log(`🖥️  Local: ${config.isLocal ? '✅' : '❌'}`);
        console.log(`📺 Display Mode: ${config.displayMode.toUpperCase()}`);
        console.log(`📺 Display Var: ${config.displayVar || 'N/A'}`);
        console.log(`🖼️  VNC Enabled: ${config.vncEnabled ? '✅' : '❌'}`);
        console.log(`⚡ Needs Xvfb: ${config.needsXvfb ? '✅' : '❌'}`);
        console.log('🔍' + '='.repeat(50));
    }
    /**
     * Obtém URLs de acesso baseadas no ambiente
     */
    getAccessUrls() {
        const config = this.getConfig();
        const port = process.env.PORT || 3000;
        let baseUrl = 'localhost';
        if (config.isCodespace && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
            baseUrl = `${process.env.CODESPACE_NAME}-${port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
        }
        const urls = {
            api: `http://${baseUrl}:${port}`
        };
        if (config.vncEnabled) {
            if (process.env.VNC_PORT) {
                urls.vnc = `vnc://${baseUrl}:${process.env.VNC_PORT}`;
            }
            if (process.env.NOVNC_PORT) {
                urls.novnc = `http://${baseUrl}:${process.env.NOVNC_PORT}`;
            }
        }
        return urls;
    }
}
exports.EnvironmentDetector = EnvironmentDetector;
exports.default = EnvironmentDetector;
