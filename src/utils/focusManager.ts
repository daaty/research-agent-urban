import WindowPositioner from './windowPositioner';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * 🎯 Gerenciador de foco para facilitar interação no VNC
 * Permite alternar facilmente entre os browsers do sistema híbrido
 */
export class FocusManager {
  private static instance: FocusManager;
  private windowPositioner: WindowPositioner;
  
  private constructor() {
    this.windowPositioner = WindowPositioner.getInstance();
  }
  
  public static getInstance(): FocusManager {
    if (!FocusManager.instance) {
      FocusManager.instance = new FocusManager();
    }
    return FocusManager.instance;
  }

  /**
   * 🎯 Método alternativo de foco compatível com Openbox
   */
  private async focusWindowAlternative(windowId: string): Promise<boolean> {
    try {
      console.log(`🎯 [FOCUS] Tentando foco alternativo na janela ${windowId}...`);
      
      // Método 1: Usar wmctrl (mais compatível com Openbox)
      try {
        await execAsync(`DISPLAY=:99 wmctrl -i -a ${windowId}`);
        console.log(`✅ [FOCUS] Foco aplicado via wmctrl: ${windowId}`);
        return true;
      } catch (wmctrlError) {
        console.log(`⚠️ [FOCUS] wmctrl falhou, tentando método 2...`);
      }

      // Método 2: Combinação de raise + focus
      try {
        await execAsync(`DISPLAY=:99 xdotool windowraise ${windowId}`);
        await execAsync(`DISPLAY=:99 xdotool windowfocus ${windowId}`);
        console.log(`✅ [FOCUS] Foco aplicado via xdotool raise+focus: ${windowId}`);
        return true;
      } catch (xdotoolError) {
        console.log(`⚠️ [FOCUS] xdotool raise+focus falhou, tentando método 3...`);
      }

      // Método 3: Click no centro da janela para forçar foco
      try {
        const { stdout } = await execAsync(`DISPLAY=:99 xdotool getwindowgeometry ${windowId}`);
        const geometry = stdout.match(/Geometry: (\d+)x(\d+)/);
        if (geometry) {
          const centerX = Math.floor(parseInt(geometry[1]) / 2);
          const centerY = Math.floor(parseInt(geometry[2]) / 2);
          
          await execAsync(`DISPLAY=:99 xdotool windowraise ${windowId}`);
          await execAsync(`DISPLAY=:99 xdotool mousemove --window ${windowId} ${centerX} ${centerY}`);
          await execAsync(`DISPLAY=:99 xdotool click --window ${windowId} 1`);
          
          console.log(`✅ [FOCUS] Foco aplicado via click simulado: ${windowId}`);
          return true;
        }
      } catch (clickError) {
        console.log(`⚠️ [FOCUS] Click simulado falhou...`);
      }

      return false;
    } catch (error) {
      console.error(`❌ [FOCUS] Todos os métodos de foco falharam para ${windowId}:`, error);
      return false;
    }
  }
  
  /**
   * 🎯 Focar na janela do rides_scraper (esquerda)
   */
  async focusRidesScraper(): Promise<boolean> {
    console.log('🎯 [FOCUS] Focando no Rides Scraper...');
    
    // Primeiro tentar método original
    const originalResult = await this.windowPositioner.focusWindow('rides_scraper');
    if (originalResult) {
      return true;
    }
    
    // Se falhou, tentar método alternativo
    console.log('🔄 [FOCUS] Método original falhou, tentando alternativo...');
    const windows = await this.windowPositioner.getChromeWindows();
    if (windows.length > 0) {
      return await this.focusWindowAlternative(windows[0]);
    }
    
    return false;
  }
  
  /**
   * 🎯 Focar na janela do hybrid_scraper (direita) 
   */
  async focusHybridScraper(): Promise<boolean> {
    console.log('🎯 [FOCUS] Focando no Hybrid Scraper...');
    
    // Primeiro tentar método original
    const originalResult = await this.windowPositioner.focusWindow('hybrid_scraper');
    if (originalResult) {
      return true;
    }
    
    // Se falhou, tentar método alternativo
    console.log('🔄 [FOCUS] Método original falhou, tentando alternativo...');
    const windows = await this.windowPositioner.getChromeWindows();
    if (windows.length > 1) {
      return await this.focusWindowAlternative(windows[1]);
    }
    
    return false;
  }
  
  /**
   * 🔄 Alternar foco entre as duas janelas
   */
  async switchFocus(): Promise<void> {
    console.log('🔄 [FOCUS] Alternando foco entre janelas...');
    await this.windowPositioner.switchFocus();
  }
  
  /**
   * 🔍 Listar todas as janelas disponíveis (debug)
   */
  async listAllWindows(): Promise<void> {
    await this.windowPositioner.listAllWindows();
  }
  
  /**
   * 📋 Status das janelas do sistema
   */
  async getWindowStatus(): Promise<{leftWindow: boolean, rightWindow: boolean}> {
    try {
      const leftFocus = await this.windowPositioner.focusWindow('rides_scraper');
      const rightFocus = await this.windowPositioner.focusWindow('hybrid_scraper');
      
      return {
        leftWindow: leftFocus,
        rightWindow: rightFocus
      };
    } catch (error) {
      console.error('❌ [FOCUS] Erro ao verificar status das janelas:', error);
      return { leftWindow: false, rightWindow: false };
    }
  }
}

export default FocusManager;
