/**
 * Fila de recargas de créditos para motoristas
 */
export interface RechargeRequest {
  id: string; // ID único da requisição
  driverId: string;
  amount: number;
  priority: 'normal' | 'urgent';
  requestedAt: Date;
  attempts: number;
  lastAttempt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  requestId?: string; // ID opcional fornecido pelo cliente
}

export class RechargeQueue {
  private static instance: RechargeQueue;
  private queue: RechargeRequest[] = [];
  private processing: boolean = false;
  private currentRequest: RechargeRequest | null = null;
  private maxRetries: number = 3;

  private constructor() {}

  public static getInstance(): RechargeQueue {
    if (!RechargeQueue.instance) {
      RechargeQueue.instance = new RechargeQueue();
    }
    return RechargeQueue.instance;
  }

  /**
   * Adiciona nova solicitação de recarga
   */
  public addRechargeRequest(
    driverId: string, 
    amount: number, 
    priority: 'normal' | 'urgent' = 'normal',
    requestId?: string
  ): string {
    const id = this.generateRequestId();
    
    const request: RechargeRequest = {
      id,
      driverId,
      amount,
      priority,
      requestedAt: new Date(),
      attempts: 0,
      status: 'pending',
      requestId
    };

    // Adicionar à fila respeitando prioridade
    if (priority === 'urgent') {
      this.queue.unshift(request);
    } else {
      this.queue.push(request);
    }

    console.log(`🔋 Nova recarga adicionada: ${driverId} -> ${amount} créditos (prioridade: ${priority})`);
    console.log(`📊 Total de recargas na fila: ${this.queue.length}`);

    return id;
  }

  /**
   * Verifica se há recargas pendentes
   */
  public hasPending(): boolean {
    return this.queue.some(req => req.status === 'pending');
  }

  /**
   * Obtém próxima recarga da fila
   */
  public getNext(): RechargeRequest | null {
    // Filtrar apenas pendentes e que não excederam tentativas
    const pendingRequests = this.queue.filter(
      req => req.status === 'pending' && req.attempts < this.maxRetries
    );

    if (pendingRequests.length === 0) {
      return null;
    }

    // Priorizar por urgência e depois por ordem de chegada
    pendingRequests.sort((a, b) => {
      if (a.priority === 'urgent' && b.priority === 'normal') return -1;
      if (a.priority === 'normal' && b.priority === 'urgent') return 1;
      return a.requestedAt.getTime() - b.requestedAt.getTime();
    });

    const request = pendingRequests[0];
    request.status = 'processing';
    this.currentRequest = request;

    return request;
  }

  /**
   * Marca recarga como concluída
   */
  public markAsCompleted(requestId: string): void {
    const request = this.queue.find(req => req.id === requestId);
    if (request) {
      request.status = 'completed';
      this.currentRequest = null;
      console.log(`✅ Recarga concluída: ${request.driverId} -> ${request.amount} créditos`);
    }
  }

  /**
   * Marca recarga como falhou
   */
  public markAsFailed(requestId: string, error: string): void {
    const request = this.queue.find(req => req.id === requestId);
    if (request) {
      request.attempts++;
      request.lastAttempt = new Date();
      
      if (request.attempts < this.maxRetries) {
        request.status = 'pending'; // Recolocar na fila
        console.log(`⚠️ Recarga falhou (tentativa ${request.attempts}/${this.maxRetries}): ${request.driverId} -> ${error}`);
      } else {
        request.status = 'failed';
        console.log(`❌ Recarga removida após ${this.maxRetries} tentativas: ${request.driverId} -> ${error}`);
      }
      
      this.currentRequest = null;
    }
  }

  /**
   * Obtém estatísticas da fila
   */
  public getStats(): {
    total: number;
    pending: number;
    processing: number;
    completed: number;
    failed: number;
    urgent: number;
    normal: number;
    currentRequest: RechargeRequest | null;
  } {
    const pending = this.queue.filter(req => req.status === 'pending').length;
    const processing = this.queue.filter(req => req.status === 'processing').length;
    const completed = this.queue.filter(req => req.status === 'completed').length;
    const failed = this.queue.filter(req => req.status === 'failed').length;
    const urgent = this.queue.filter(req => req.priority === 'urgent').length;
    const normal = this.queue.filter(req => req.priority === 'normal').length;

    return {
      total: this.queue.length,
      pending,
      processing,
      completed,
      failed,
      urgent,
      normal,
      currentRequest: this.currentRequest
    };
  }

  /**
   * Limpa recargas concluídas/falhas antigas
   */
  public cleanup(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - (olderThanHours * 60 * 60 * 1000));
    const initialCount = this.queue.length;
    
    this.queue = this.queue.filter(req => {
      if (req.status === 'pending' || req.status === 'processing') {
        return true; // Manter pendentes e em processamento
      }
      return req.requestedAt > cutoff; // Remover antigas concluídas/falhas
    });

    const removed = initialCount - this.queue.length;
    if (removed > 0) {
      console.log(`🧹 Removidas ${removed} recargas antigas da fila`);
    }
  }

  /**
   * Gera ID único para requisição
   */
  private generateRequestId(): string {
    return `recharge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Verifica se está processando
   */
  public isProcessing(): boolean {
    return this.processing;
  }

  /**
   * Define estado de processamento
   */
  public setProcessing(processing: boolean): void {
    this.processing = processing;
  }

  /**
   * Obtém recarga por ID
   */
  public getRequestById(id: string): RechargeRequest | null {
    return this.queue.find(req => req.id === id) || null;
  }

  /**
   * Obtém todas as requisições
   */
  public getAllRequests(): RechargeRequest[] {
    return [...this.queue];
  }

  /**
   * Obtém próxima requisição para processamento
   */
  public getNextRequest(): RechargeRequest | null {
    const pendingRequests = this.queue.filter(req => req.status === 'pending');
    
    if (pendingRequests.length === 0) {
      return null;
    }

    // Ordenar por prioridade
    pendingRequests.sort((a, b) => {
      if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
      if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
      return a.requestedAt.getTime() - b.requestedAt.getTime();
    });

    const request = pendingRequests[0];
    request.status = 'processing';
    this.currentRequest = request;
    
    return request;
  }
}
