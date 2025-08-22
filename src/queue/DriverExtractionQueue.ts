import { EventEmitter } from 'events';

export interface QueueItem {
  id: string;
  driverId: string;
  priority: number;
  retryCount: number;
  maxRetries: number;
  createdAt: Date;
  lastAttempt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'retrying';
  error?: string;
  data?: any;
}

export interface QueueConfig {
  maxConcurrent: number;
  retryDelay: number;
  maxRetries: number;
  processingTimeout: number;
  rateLimitDelay: number;
}

export class DriverExtractionQueue extends EventEmitter {
  private queue: QueueItem[] = [];
  private processing: Map<string, QueueItem> = new Map();
  private completed: Map<string, QueueItem> = new Map();
  private failed: Map<string, QueueItem> = new Map();
  
  private config: QueueConfig = {
    maxConcurrent: 1,        // ✅ APENAS 1 extração simultânea para evitar conflitos de navegação
    retryDelay: 8000,        // ✅ 8 segundos entre tentativas (mais tempo para recuperar)
    maxRetries: 3,           // Máximo 3 tentativas por item
    processingTimeout: 90000, // ✅ 90 segundos timeout (mais tempo para carregamento lento)
    rateLimitDelay: 5000     // ✅ 5 segundos entre cada nova extração (delay humano)
  };

  private isRunning: boolean = false;
  private processCount: number = 0;
  private lastProcessTime: number = 0;

  constructor(config?: Partial<QueueConfig>) {
    super();
    if (config) {
      this.config = { ...this.config, ...config };
    }
    console.log('🔄 DriverExtractionQueue inicializada com configurações:', this.config);
  }

  /**
   * Adiciona uma lista de driver IDs à fila
   */
  addDriverIds(driverIds: string[], priority: number = 1): void {
    console.log(`📋 Adicionando ${driverIds.length} motoristas à fila com prioridade ${priority}`);
    
    for (const driverId of driverIds) {
      // Verificar se já existe na fila ou foi processado
      if (this.isDriverInQueue(driverId) || this.completed.has(driverId)) {
        console.log(`⚠️ Motorista ${driverId} já está na fila ou foi processado, pulando...`);
        continue;
      }

      const queueItem: QueueItem = {
        id: `item_${Date.now()}_${driverId}`,
        driverId,
        priority,
        retryCount: 0,
        maxRetries: this.config.maxRetries,
        createdAt: new Date(),
        status: 'pending'
      };

      this.queue.push(queueItem);
      console.log(`✅ Motorista ${driverId} adicionado à fila (ID: ${queueItem.id})`);
    }

    // Ordenar por prioridade (maior prioridade primeiro)
    this.queue.sort((a, b) => b.priority - a.priority);
    
    console.log(`📊 Fila atualizada: ${this.queue.length} itens pendentes`);
    this.emit('queueUpdated', this.getQueueStats());
  }

  /**
   * Verifica se um motorista já está na fila
   */
  private isDriverInQueue(driverId: string): boolean {
    return this.queue.some(item => item.driverId === driverId) ||
           this.processing.has(driverId) ||
           Array.from(this.processing.values()).some(item => item.driverId === driverId);
  }

  /**
   * Inicia o processamento da fila
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Fila já está em execução');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Iniciando processamento da fila...');
    this.emit('queueStarted');

    while (this.isRunning && (this.queue.length > 0 || this.processing.size > 0)) {
      await this.processNextBatch();
      await this.sleep(100); // Pequena pausa para evitar loop intensivo
    }

    console.log('✅ Processamento da fila concluído');
    this.isRunning = false;
    this.emit('queueCompleted', this.getQueueStats());
  }

  /**
   * Para o processamento da fila
   */
  stop(): void {
    console.log('🛑 Parando processamento da fila...');
    this.isRunning = false;
    this.emit('queueStopped');
  }

  /**
   * Processa o próximo lote de itens
   */
  private async processNextBatch(): Promise<void> {
    // Verificar se podemos iniciar novos processamentos
    const availableSlots = this.config.maxConcurrent - this.processing.size;
    if (availableSlots <= 0 || this.queue.length === 0) {
      return;
    }

    // ✅ APLICAR RATE LIMITING HUMANO MAIS ROBUSTO
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessTime;
    const minDelay = this.config.rateLimitDelay;
    
    if (timeSinceLastProcess < minDelay) {
      const waitTime = minDelay - timeSinceLastProcess;
      console.log(`🐌 Aplicando delay humano na fila: ${waitTime}ms`);
      await this.sleep(waitTime);
    }

    // Processar itens disponíveis (agora apenas 1 por vez)
    const itemsToProcess = Math.min(availableSlots, this.queue.length, 1); // ✅ Máximo 1 item por vez
    
    for (let i = 0; i < itemsToProcess; i++) {
      const item = this.queue.shift();
      if (item) {
        console.log(`🎯 Processando item ${i+1}/${itemsToProcess}: ${item.driverId}`);
        this.startProcessingItem(item);
        this.lastProcessTime = Date.now();
        
        // ✅ Delay entre início de processamentos (se houver múltiplos no futuro)
        if (i < itemsToProcess - 1) {
          await this.sleep(1000);
        }
      }
    }
  }

  /**
   * Inicia o processamento de um item específico
   */
  private async startProcessingItem(item: QueueItem): Promise<void> {
    item.status = 'processing';
    item.lastAttempt = new Date();
    this.processing.set(item.driverId, item);

    console.log(`🔄 Iniciando processamento do motorista ${item.driverId} (tentativa ${item.retryCount + 1})`);
    this.emit('itemStarted', item);

    // Configurar timeout
    const timeoutId = setTimeout(() => {
      this.handleItemTimeout(item);
    }, this.config.processingTimeout);

    try {
      // Emitir evento para processamento externo
      this.emit('processItem', item, (error: Error | null, data?: any) => {
        clearTimeout(timeoutId);
        this.handleItemCompletion(item, error, data);
      });

    } catch (error: any) {
      clearTimeout(timeoutId);
      this.handleItemCompletion(item, error);
    }
  }

  /**
   * Handles item timeout
   */
  private handleItemTimeout(item: QueueItem): void {
    console.log(`⏰ Timeout no processamento do motorista ${item.driverId}`);
    const timeoutError = new Error(`Timeout após ${this.config.processingTimeout}ms`);
    this.handleItemCompletion(item, timeoutError);
  }

  /**
   * Handles item completion (success or failure)
   */
  private handleItemCompletion(item: QueueItem, error: Error | null, data?: any): void {
    this.processing.delete(item.driverId);

    if (error) {
      item.error = error.message;
      item.retryCount++;

      console.log(`❌ Erro no processamento do motorista ${item.driverId}: ${error.message}`);

      // Verificar se deve tentar novamente
      if (item.retryCount < item.maxRetries) {
        item.status = 'retrying';
        console.log(`🔄 Reagendando motorista ${item.driverId} para nova tentativa (${item.retryCount}/${item.maxRetries})`);
        
        // Reagendar com delay
        setTimeout(() => {
          if (this.isRunning) {
            this.queue.unshift(item); // Adicionar no início da fila
            this.queue.sort((a, b) => b.priority - a.priority);
          }
        }, this.config.retryDelay);

        this.emit('itemRetried', item);
      } else {
        // Falha definitiva
        item.status = 'failed';
        this.failed.set(item.driverId, item);
        console.log(`💀 Motorista ${item.driverId} falhou definitivamente após ${item.retryCount} tentativas`);
        this.emit('itemFailed', item);
      }
    } else {
      // Sucesso
      item.status = 'completed';
      item.data = data;
      this.completed.set(item.driverId, item);
      console.log(`✅ Motorista ${item.driverId} processado com sucesso`);
      this.emit('itemCompleted', item);
    }

    this.emit('queueUpdated', this.getQueueStats());
  }

  /**
   * Retorna estatísticas da fila
   */
  getQueueStats() {
    return {
      pending: this.queue.length,
      processing: this.processing.size,
      completed: this.completed.size,
      failed: this.failed.size,
      total: this.queue.length + this.processing.size + this.completed.size + this.failed.size,
      isRunning: this.isRunning
    };
  }

  /**
   * Retorna todos os itens completados
   */
  getCompletedItems(): QueueItem[] {
    return Array.from(this.completed.values());
  }

  /**
   * Retorna todos os itens que falharam
   */
  getFailedItems(): QueueItem[] {
    return Array.from(this.failed.values());
  }

  /**
   * Retorna itens atualmente sendo processados
   */
  getProcessingItems(): QueueItem[] {
    return Array.from(this.processing.values());
  }

  /**
   * Retorna itens pendentes na fila
   */
  getPendingItems(): QueueItem[] {
    return [...this.queue];
  }

  /**
   * Limpa todos os itens completados e falhados
   */
  clearCompleted(): void {
    const completedCount = this.completed.size;
    const failedCount = this.failed.size;
    
    this.completed.clear();
    this.failed.clear();
    
    console.log(`🧹 Limpeza concluída: ${completedCount} completados e ${failedCount} falhados removidos`);
    this.emit('queueCleaned', { completedCount, failedCount });
  }

  /**
   * Reprocessa itens que falharam
   */
  retryFailedItems(): void {
    const failedItems = Array.from(this.failed.values());
    this.failed.clear();

    for (const item of failedItems) {
      item.retryCount = 0;
      item.status = 'pending';
      item.error = undefined;
      this.queue.push(item);
    }

    this.queue.sort((a, b) => b.priority - a.priority);
    console.log(`🔄 ${failedItems.length} itens falhados readicionados à fila`);
    this.emit('queueUpdated', this.getQueueStats());
  }

  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
