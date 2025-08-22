/**
 * 🔍 Environment Detector
 * Detecta automaticamente o ambiente de execução e configura display adequado
 */

export interface EnvironmentConfig {
  isDocker: boolean;
  isCodespace: boolean;
  isLocal: boolean;
  displayMode: 'vnc' | 'xvfb' | 'headless';
  displayVar?: string;
  needsXvfb: boolean;
  vncEnabled: boolean;
}

export class EnvironmentDetector {
  private static instance: EnvironmentDetector;
  private config: EnvironmentConfig;

  private constructor() {
    this.config = this.detectEnvironment();
  }

  public static getInstance(): EnvironmentDetector {
    if (!EnvironmentDetector.instance) {
      EnvironmentDetector.instance = new EnvironmentDetector();
    }
    return EnvironmentDetector.instance;
  }

  /**
   * Detecta o ambiente de execução atual
   */
  private detectEnvironment(): EnvironmentConfig {
    // 🐳 Detectar Docker
    const isDocker = this.isRunningInDocker();
    
    // 🌐 Detectar Codespace
    const isCodespace = this.isRunningInCodespace();
    
    // 🖥️ Detectar Local
    const isLocal = !isDocker && !isCodespace;

    // 🖥️ Configurar modo de display
    let displayMode: 'vnc' | 'xvfb' | 'headless' = 'headless';
    let displayVar: string | undefined;
    let needsXvfb = false;
    let vncEnabled = false;

    if (isDocker) {
      // Docker: usar VNC se disponível
      if (process.env.VNC_PORT || process.env.NOVNC_PORT) {
        displayMode = 'vnc';
        displayVar = ':99'; // Display padrão VNC
        vncEnabled = true;
      } else {
        displayMode = 'headless';
      }
    } else if (isCodespace) {
      // Codespace: usar Xvfb
      displayMode = 'xvfb';
      displayVar = process.env.DISPLAY || ':99';
      needsXvfb = true;
    } else if (isLocal) {
      // Local: verificar se tem display disponível
      if (process.env.DISPLAY && process.env.DISPLAY !== '') {
        displayMode = 'vnc'; // Display local
        displayVar = process.env.DISPLAY;
      } else {
        displayMode = 'xvfb';
        displayVar = ':99';
        needsXvfb = true;
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
  private isRunningInDocker(): boolean {
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
          process.env.HOSTNAME?.startsWith('docker-') ||
          process.env.PWD?.includes('/workspaces/')) {
        return true;
      }

      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Detecta se está rodando em GitHub Codespace
   */
  private isRunningInCodespace(): boolean {
    return !!(
      process.env.CODESPACES ||
      process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN ||
      process.env.CODESPACE_NAME ||
      process.env.PWD?.includes('/workspaces/')
    );
  }

  /**
   * Obtém a configuração do ambiente
   */
  public getConfig(): EnvironmentConfig {
    return { ...this.config };
  }

  /**
   * Gera comando de inicialização do browser baseado no ambiente
   */
  public getBrowserStartCommand(): string[] {
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
          'xvfb-run -a -s "-screen 0 1600x1200x24"',
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
  public getPlaywrightConfig(): any {
    const config = this.getConfig();
    
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
        '--window-size=1600,1200',
        '--window-position=0,0'
      ]
    };

    if (config.displayMode === 'vnc' || config.displayMode === 'xvfb') {
      baseConfig.args.push(`--display=${config.displayVar}`);
      // Configurações específicas para VNC
      baseConfig.args.push(
        '--force-device-scale-factor=1',
        '--disable-features=VizDisplayCompositor',
        '--disable-gpu-sandbox',
        '--start-maximized'
      );
    }

    if (config.isDocker) {
      baseConfig.args.push(
        '--disable-gpu',
        '--disable-software-rasterizer',
        '--no-first-run'
      );
    }

    return baseConfig;
  }

  /**
   * Log da configuração detectada
   */
  public logEnvironmentInfo(): void {
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
  public getAccessUrls(): { api: string; vnc?: string; novnc?: string } {
    const config = this.getConfig();
    const port = process.env.PORT || 3000;
    
    let baseUrl = 'localhost';
    
    if (config.isCodespace && process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN) {
      baseUrl = `${process.env.CODESPACE_NAME}-${port}.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`;
    }
    
    const urls: any = {
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

export default EnvironmentDetector;
