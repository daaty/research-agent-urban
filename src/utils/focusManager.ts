import WindowPositioner from './windowPositioner';

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
   * 🎯 Focar na janela do rides_scraper (esquerda)
   */
  async focusRidesScraper(): Promise<boolean> {
    console.log('🎯 [FOCUS] Focando no Rides Scraper...');
    return await this.windowPositioner.focusWindow('rides_scraper');
  }
  
  /**
   * 🎯 Focar na janela do hybrid_scraper (direita) 
   */
  async focusHybridScraper(): Promise<boolean> {
    console.log('🎯 [FOCUS] Focando no Hybrid Scraper...');
    return await this.windowPositioner.focusWindow('hybrid_scraper');
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
