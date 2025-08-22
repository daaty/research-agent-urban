import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WindowPositioner {
  private static instance: WindowPositioner;
  
  public static getInstance(): WindowPositioner {
    if (!WindowPositioner.instance) {
      WindowPositioner.instance = new WindowPositioner();
    }
    return WindowPositioner.instance;
  }

  /**
   * 🎯 Move janela do Chrome para posição específica
   */
  async moveWindow(instanceName: string, position: WindowPosition): Promise<boolean> {
    try {
      console.log(`🎯 [WINDOW] Movendo janela ${instanceName} para (${position.x}, ${position.y})`);

      // 1. Encontrar janelas do Chrome
      const windows = await this.findChromeWindows();
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
      await this.moveAndResizeWindow(windowId, position);

      console.log(`✅ [WINDOW] Janela ${instanceName} posicionada com sucesso`);
      return true;

    } catch (error) {
      console.error(`❌ [WINDOW] Erro ao mover janela ${instanceName}:`, error);
      return false;
    }
  }

  /**
   * 🔍 Encontra todas as janelas do Chrome
   */
  private async findChromeWindows(): Promise<string[]> {
    try {
      const { stdout } = await execAsync('xdotool search --name "Chrome"');
      const windowIds = stdout.trim().split('\n').filter(id => id.length > 0);
      return windowIds;
    } catch (error) {
      // Tentar busca alternativa
      try {
        const { stdout } = await execAsync('xdotool search --class "chrome"');
        const windowIds = stdout.trim().split('\n').filter(id => id.length > 0);
        return windowIds;
      } catch (error2) {
        console.log('⚠️ [WINDOW] Não foi possível encontrar janelas do Chrome');
        return [];
      }
    }
  }

  /**
   * 📍 Determina índice da janela baseado na instância
   */
  private getWindowIndex(instanceName: string): number {
    // Mapear instâncias para índices de janela
    const indexMap: { [key: string]: number } = {
      // LADO ESQUERDO (primeira janela)
      'rides_scraper': 0,      
      'hybrid_operation': 0,   
      'default': 0,            
      
      // LADO DIREITO (segunda janela) 
      'drivers_scraper': 1,    
      'hybrid_scraper': 1      
    };

    const index = indexMap[instanceName] ?? 0;
    console.log(`📋 [WINDOW] Instância ${instanceName} → Índice: ${index}`);
    return index;
  }

  /**
   * 🎯 Move e redimensiona janela específica
   */
  private async moveAndResizeWindow(windowId: string, position: WindowPosition): Promise<void> {
    // Comandos xdotool para mover e redimensionar
    const commands = [
      `xdotool windowunmap ${windowId}`,      // Minimizar temporariamente
      `xdotool windowsize ${windowId} ${position.width} ${position.height}`, // Redimensionar
      `xdotool windowmove ${windowId} ${position.x} ${position.y}`,          // Mover
      `xdotool windowmap ${windowId}`,        // Remapear/mostrar
      `xdotool windowraise ${windowId}`       // Trazer para frente
    ];

    for (const command of commands) {
      try {
        await execAsync(command);
        await this.sleep(100); // Pequena pausa entre comandos
      } catch (error) {
        console.log(`⚠️ [WINDOW] Comando falhou: ${command}`);
      }
    }
  }

  /**
   * 🎯 Organiza todas as janelas automaticamente
   */
  async arrangeAllWindows(): Promise<void> {
    console.log('🎯 [WINDOW] Organizando todas as janelas em split-screen...');

    // Aguardar um pouco para as janelas abrirem
    await this.sleep(3000);

    const windows = await this.findChromeWindows();
    
    if (windows.length < 2) {
      console.log(`⚠️ [WINDOW] Apenas ${windows.length} janela(s) encontrada(s), aguardando mais...`);
      await this.sleep(2000);
      return this.arrangeAllWindows();
    }

    // Posições para split-screen
    const leftPosition: WindowPosition = { x: 0, y: 0, width: 800, height: 1170 };
    const rightPosition: WindowPosition = { x: 800, y: 0, width: 800, height: 1170 };

    // Mover primeira janela para esquerda
    if (windows[0]) {
      await this.moveAndResizeWindow(windows[0], leftPosition);
      console.log('✅ [WINDOW] Janela 1 posicionada à esquerda');
    }

    // Mover segunda janela para direita
    if (windows[1]) {
      await this.moveAndResizeWindow(windows[1], rightPosition);
      console.log('✅ [WINDOW] Janela 2 posicionada à direita');
    }

    console.log('🎉 [WINDOW] Split-screen organizado com sucesso!');
    
    // 🎯 Configurar sistema de foco após organizar janelas
    try {
      console.log('🎯 [WINDOW] Configurando sistema de foco automático...');
      await execAsync('bash /app/manage-window-focus.sh');
      console.log('✅ [WINDOW] Sistema de foco configurado!');
    } catch (error) {
      console.log('⚠️ [WINDOW] Erro ao configurar foco:', error);
    }
  }

  /**
   * ⏱️ Utilitário para pausas
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 🔍 Lista todas as janelas para debug
   */
  async listAllWindows(): Promise<void> {
    try {
      const { stdout } = await execAsync('xdotool search --name ".*"');
      const windowIds = stdout.trim().split('\n');
      
      console.log('🔍 [WINDOW] Todas as janelas encontradas:');
      for (const windowId of windowIds.slice(0, 10)) { // Mostrar apenas as primeiras 10
        try {
          const { stdout: nameOutput } = await execAsync(`xdotool getwindowname ${windowId}`);
          const name = nameOutput.trim();
          console.log(`  - ID: ${windowId} | Nome: ${name}`);
        } catch (error) {
          // Ignorar erros de janelas que não podem ser consultadas
        }
      }
    } catch (error) {
      console.log('⚠️ [WINDOW] Erro ao listar janelas:', error);
    }
  }

  /**
   * 🎯 Focar em uma janela específica por instância
   */
  async focusWindow(instanceName: string): Promise<boolean> {
    try {
      console.log(`🎯 [FOCUS] Focando janela: ${instanceName}`);
      
      // Encontrar janela do Chrome por título/classe
      const { stdout } = await execAsync(`DISPLAY=:99 xdotool search --class chrome 2>/dev/null || echo ""`);
      const windowIds = stdout.trim().split('\n').filter(id => id.length > 0);
      
      if (windowIds.length === 0) {
        console.log('❌ [FOCUS] Nenhuma janela do Chrome encontrada');
        return false;
      }
      
      // Mapear instância para índice da janela
      const instanceWindowMap: { [key: string]: number } = {
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
      
      // Focar e ativar janela
      await execAsync(`DISPLAY=:99 xdotool windowfocus ${windowId}`);
      await execAsync(`DISPLAY=:99 xdotool windowactivate ${windowId}`);
      await execAsync(`DISPLAY=:99 xdotool windowraise ${windowId}`);
      
      console.log(`✅ [FOCUS] Janela ${instanceName} (ID: ${windowId}) focada com sucesso`);
      return true;
      
    } catch (error) {
      console.error(`❌ [FOCUS] Erro ao focar janela ${instanceName}:`, error);
      return false;
    }
  }
  
  /**
   * 🔄 Alternar foco entre janelas
   */
  async switchFocus(): Promise<void> {
    try {
      console.log('🔄 [FOCUS] Alternando foco entre janelas...');
      
      const { stdout } = await execAsync(`DISPLAY=:99 xdotool search --class chrome 2>/dev/null || echo ""`);
      const windowIds = stdout.trim().split('\n').filter(id => id.length > 0);
      
      if (windowIds.length < 2) {
        console.log('❌ [FOCUS] Menos de 2 janelas encontradas para alternar');
        return;
      }
      
      // Pegar janela com foco atual
      const { stdout: activeWindow } = await execAsync(`DISPLAY=:99 xdotool getwindowfocus 2>/dev/null || echo ""`);
      const currentFocus = activeWindow.trim();
      
      // Alternar para a próxima janela
      const nextWindowIndex = windowIds.indexOf(currentFocus) === 0 ? 1 : 0;
      const nextWindowId = windowIds[nextWindowIndex];
      
      await execAsync(`DISPLAY=:99 xdotool windowfocus ${nextWindowId}`);
      await execAsync(`DISPLAY=:99 xdotool windowactivate ${nextWindowId}`);
      
      console.log(`✅ [FOCUS] Foco alternado para janela ${nextWindowId}`);
      
    } catch (error) {
      console.error('❌ [FOCUS] Erro ao alternar foco:', error);
    }
  }
}

export default WindowPositioner;
