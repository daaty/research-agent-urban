/**
 * 🖥️ Window Manager - Controla posicionamento de janelas no VNC
 * Usa comandos do sistema para mover janelas após abertura
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { Logger } from '../utils/logger';

const execAsync = promisify(exec);

export interface WindowPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WindowManager {
  private static instance: WindowManager;
  private logger: Logger;

  private constructor() {
    this.logger = Logger.getInstance();
  }

  public static getInstance(): WindowManager {
    if (!WindowManager.instance) {
      WindowManager.instance = new WindowManager();
    }
    return WindowManager.instance;
  }

  /**
   * 🎯 Posições predefinidas para split-screen 1600x1200
   */
  private getWindowPositions(): { [key: string]: WindowPosition } {
    return {
      'left': { x: 0, y: 0, width: 800, height: 1170 },      // Lado esquerdo
      'right': { x: 800, y: 0, width: 800, height: 1170 },   // Lado direito
      
      // Mapeamento por instância
      'rides_scraper': { x: 0, y: 0, width: 800, height: 1170 },
      'drivers_scraper': { x: 800, y: 0, width: 800, height: 1170 },
      'hybrid_operation': { x: 0, y: 0, width: 800, height: 1170 },
      'hybrid_scraper': { x: 800, y: 0, width: 800, height: 1170 }
    };
  }

  /**
   * 🔍 Listar todas as janelas ativas
   */
  private async listWindows(): Promise<string> {
    try {
      const { stdout } = await execAsync('wmctrl -l');
      return stdout;
    } catch (error) {
      this.logger.warn('WINDOW', 'wmctrl não disponível, tentando xdotool...');
      try {
        const { stdout } = await execAsync('xdotool search --onlyvisible --class chrome');
        return stdout;
      } catch (xdotoolError) {
        this.logger.error('WINDOW', 'Nenhuma ferramenta de janela disponível');
        return '';
      }
    }
  }

  /**
   * 🎯 Encontrar janelas do Chrome por título ou classe
   */
  private async findChromeWindows(): Promise<string[]> {
    try {
      // Tentar wmctrl primeiro
      const { stdout } = await execAsync('wmctrl -l | grep -i chrome');
      const lines = stdout.trim().split('\n').filter(line => line.length > 0);
      return lines.map(line => line.split(' ')[0]); // Extrair window IDs
    } catch (error) {
      try {
        // Fallback para xdotool
        const { stdout } = await execAsync('xdotool search --onlyvisible --class chrome');
        return stdout.trim().split('\n').filter(id => id.length > 0);
      } catch (xdotoolError) {
        this.logger.error('WINDOW', 'Não foi possível encontrar janelas do Chrome');
        return [];
      }
    }
  }

  /**
   * 🚀 Mover janela específica para posição
   */
  private async moveWindow(windowId: string, position: WindowPosition): Promise<boolean> {
    try {
      // Tentar wmctrl primeiro
      const moveCommand = `wmctrl -i -r ${windowId} -e 0,${position.x},${position.y},${position.width},${position.height}`;
      await execAsync(moveCommand);
      
      this.logger.info('WINDOW', `Janela ${windowId} movida para (${position.x},${position.y}) ${position.width}x${position.height}`);
      return true;
    } catch (error) {
      try {
        // Fallback para xdotool
        await execAsync(`xdotool windowmove ${windowId} ${position.x} ${position.y}`);
        await execAsync(`xdotool windowsize ${windowId} ${position.width} ${position.height}`);
        
        this.logger.info('WINDOW', `Janela ${windowId} movida via xdotool para (${position.x},${position.y})`);
        return true;
      } catch (xdotoolError) {
        this.logger.error('WINDOW', `Falha ao mover janela ${windowId}: ${error}`);
        return false;
      }
    }
  }

  /**
   * 🎯 Posicionar janelas automaticamente para split-screen
   */
  public async arrangeWindowsForSplitScreen(): Promise<boolean> {
    this.logger.info('WINDOW', '🖥️ Iniciando arranjo automático de janelas para split-screen...');
    
    try {
      // Aguardar um pouco para janelas abrirem
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const windowIds = await this.findChromeWindows();
      this.logger.info('WINDOW', `Encontradas ${windowIds.length} janelas do Chrome`);
      
      if (windowIds.length === 0) {
        this.logger.warn('WINDOW', 'Nenhuma janela do Chrome encontrada');
        return false;
      }
      
      const positions = this.getWindowPositions();
      
      // Se há 2 janelas, posicionar uma à esquerda e outra à direita
      if (windowIds.length >= 2) {
        await this.moveWindow(windowIds[0], positions['left']);
        await this.moveWindow(windowIds[1], positions['right']);
        
        this.logger.success('WINDOW', '✅ Split-screen configurado: 2 janelas posicionadas');
        return true;
      }
      
      // Se há apenas 1 janela, posicionar à esquerda
      if (windowIds.length === 1) {
        await this.moveWindow(windowIds[0], positions['left']);
        this.logger.info('WINDOW', 'ℹ️ Apenas 1 janela posicionada à esquerda');
        return true;
      }
      
      return false;
    } catch (error) {
      this.logger.error('WINDOW', `Erro no arranjo de janelas: ${error}`);
      return false;
    }
  }

  /**
   * 🔄 Mover janela específica por instância
   */
  public async moveWindowByInstance(instanceName: string): Promise<boolean> {
    const positions = this.getWindowPositions();
    const position = positions[instanceName];
    
    if (!position) {
      this.logger.warn('WINDOW', `Posição não encontrada para instância: ${instanceName}`);
      return false;
    }
    
    const windowIds = await this.findChromeWindows();
    if (windowIds.length === 0) {
      return false;
    }
    
    // Para simplificar, mover a última janela encontrada
    const windowId = windowIds[windowIds.length - 1];
    return await this.moveWindow(windowId, position);
  }

  /**
   * 🔧 Instalar ferramentas necessárias (se não existirem)
   */
  public async installWindowTools(): Promise<void> {
    this.logger.info('WINDOW', 'Verificando ferramentas de janela...');
    
    try {
      // Verificar se wmctrl existe
      await execAsync('which wmctrl');
      this.logger.info('WINDOW', '✅ wmctrl disponível');
    } catch (error) {
      try {
        // Tentar instalar wmctrl
        this.logger.info('WINDOW', 'Instalando wmctrl...');
        await execAsync('apt-get update && apt-get install -y wmctrl');
        this.logger.success('WINDOW', '✅ wmctrl instalado');
      } catch (installError) {
        this.logger.warn('WINDOW', 'Falha na instalação do wmctrl, tentando xdotool...');
        
        try {
          await execAsync('apt-get install -y xdotool');
          this.logger.success('WINDOW', '✅ xdotool instalado como fallback');
        } catch (xdotoolInstallError) {
          this.logger.error('WINDOW', 'Falha na instalação de ferramentas de janela');
        }
      }
    }
  }

  /**
   * 📊 Obter informações das janelas atuais
   */
  public async getWindowInfo(): Promise<void> {
    this.logger.info('WINDOW', '📊 Informações das janelas:');
    
    try {
      const windowList = await this.listWindows();
      console.log('Janelas ativas:');
      console.log(windowList);
      
      const chromeWindows = await this.findChromeWindows();
      console.log(`Janelas do Chrome encontradas: ${chromeWindows.length}`);
      chromeWindows.forEach((id, index) => {
        console.log(`  ${index + 1}. Window ID: ${id}`);
      });
    } catch (error) {
      this.logger.error('WINDOW', `Erro ao obter informações: ${error}`);
    }
  }
}

export default WindowManager;
