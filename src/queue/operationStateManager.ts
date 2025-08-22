import * as fs from 'fs';
import * as path from 'path';

/**
 * Estado da operação híbrida para persistência
 */
export interface OperationState {
  currentDriverId: string | null;
  extractionMode: boolean;
  rechargeMode: boolean;
  lastSavedAt: Date;
  totalProcessed: number;
  sessionStarted: Date;
  currentUrl?: string;
  lastError?: string;
  queueSnapshot: {
    driverIds: string[];
    rechargeCount: number;
  };
}

/**
 * Gerenciador de persistência de estado da operação híbrida
 */
export class OperationStateManager {
  private static instance: OperationStateManager;
  private stateFilePath: string;
  private state: OperationState;

  private constructor() {
    this.stateFilePath = path.join(process.cwd(), 'hybrid-operation-state.json');
    this.state = this.loadState();
  }

  public static getInstance(): OperationStateManager {
    if (!OperationStateManager.instance) {
      OperationStateManager.instance = new OperationStateManager();
    }
    return OperationStateManager.instance;
  }

  /**
   * Carrega estado do arquivo
   */
  private loadState(): OperationState {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        const data = fs.readFileSync(this.stateFilePath, 'utf8');
        const loaded = JSON.parse(data);
        
        // Converter strings de data de volta para objetos Date
        loaded.lastSavedAt = new Date(loaded.lastSavedAt);
        loaded.sessionStarted = new Date(loaded.sessionStarted);
        
        console.log(`🔄 Estado carregado: processando ID ${loaded.currentDriverId || 'nenhum'}`);
        return loaded;
      }
    } catch (error) {
      console.log('⚠️ Erro ao carregar estado, criando novo estado');
    }

    return this.createInitialState();
  }

  /**
   * Cria estado inicial
   */
  private createInitialState(): OperationState {
    return {
      currentDriverId: null,
      extractionMode: true,
      rechargeMode: false,
      lastSavedAt: new Date(),
      totalProcessed: 0,
      sessionStarted: new Date(),
      queueSnapshot: {
        driverIds: [],
        rechargeCount: 0
      }
    };
  }

  /**
   * Salva estado no arquivo
   */
  public saveState(): void {
    try {
      this.state.lastSavedAt = new Date();
      fs.writeFileSync(this.stateFilePath, JSON.stringify(this.state, null, 2));
      console.log(`💾 Estado salvo: processando ID ${this.state.currentDriverId || 'nenhum'}`);
    } catch (error) {
      console.error('❌ Erro ao salvar estado:', error);
    }
  }

  /**
   * Atualiza ID atual sendo processado
   */
  public setCurrentDriverId(driverId: string | null): void {
    this.state.currentDriverId = driverId;
    this.saveState();
  }

  /**
   * Define modo de operação
   */
  public setMode(extraction: boolean, recharge: boolean): void {
    this.state.extractionMode = extraction;
    this.state.rechargeMode = recharge;
    this.saveState();
  }

  /**
   * Incrementa contador de processados
   */
  public incrementProcessed(): void {
    this.state.totalProcessed++;
    this.saveState();
  }

  /**
   * Define URL atual
   */
  public setCurrentUrl(url: string): void {
    this.state.currentUrl = url;
    this.saveState();
  }

  /**
   * Define último erro
   */
  public setLastError(error: string): void {
    this.state.lastError = error;
    this.saveState();
  }

  /**
   * Atualiza snapshot das filas
   */
  public updateQueueSnapshot(driverIds: string[], rechargeCount: number): void {
    this.state.queueSnapshot = {
      driverIds,
      rechargeCount
    };
    this.saveState();
  }

  /**
   * Obtém estado atual
   */
  public getState(): OperationState {
    return { ...this.state };
  }

  /**
   * Reseta estado para inicial
   */
  public reset(): void {
    this.state = this.createInitialState();
    this.saveState();
    console.log('🔄 Estado resetado para inicial');
  }

  /**
   * Verifica se há estado para recuperar
   */
  public hasRecoveryState(): boolean {
    return this.state.currentDriverId !== null || 
           this.state.totalProcessed > 0 ||
           this.state.queueSnapshot.driverIds.length > 0;
  }

  /**
   * Obtém informações de recuperação
   */
  public getRecoveryInfo(): {
    shouldRecover: boolean;
    currentDriverId: string | null;
    totalProcessed: number;
    sessionDuration: number;
    lastSavedMinutesAgo: number;
  } {
    const now = new Date();
    const sessionDuration = now.getTime() - this.state.sessionStarted.getTime();
    const lastSavedMinutesAgo = (now.getTime() - this.state.lastSavedAt.getTime()) / (1000 * 60);

    return {
      shouldRecover: this.hasRecoveryState(),
      currentDriverId: this.state.currentDriverId,
      totalProcessed: this.state.totalProcessed,
      sessionDuration,
      lastSavedMinutesAgo
    };
  }

  /**
   * Remove arquivo de estado
   */
  public clearStateFile(): void {
    try {
      if (fs.existsSync(this.stateFilePath)) {
        fs.unlinkSync(this.stateFilePath);
        console.log('🗑️ Arquivo de estado removido');
      }
    } catch (error) {
      console.error('❌ Erro ao remover arquivo de estado:', error);
    }
  }
}
