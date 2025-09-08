/**
 * 📡 WEBSOCKET HANDLER
 * 
 * Gerencia conexões WebSocket para updates em tempo real do dashboard
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { MonitoringService } from '../../services/monitoringService';
import { ScraperStatusService, StatusUpdate } from '../services/scraperStatusService';

export interface DashboardWebSocket {
  io: SocketIOServer;
  monitoring: MonitoringService;
  statusService: ScraperStatusService;
}

let dashboardSocket: DashboardWebSocket;

/**
 * 🚀 Inicializar WebSocket do dashboard
 */
export function initWebSocket(io: SocketIOServer, monitoring: MonitoringService): DashboardWebSocket {
  const statusService = ScraperStatusService.getInstance();
  
  // 🔗 INTEGRAR MonitoringService com ScraperStatusService
  monitoring.setDashboardStatusService(statusService);
  console.log('🔗 [WebSocket] MonitoringService integrado com Dashboard StatusService');
  
  dashboardSocket = {
    io,
    monitoring,
    statusService
  };

  // Configurar namespace do dashboard
  const dashboardNamespace = io.of('/dashboard');

  dashboardNamespace.on('connection', (socket: Socket) => {
    console.log(`📡 [WebSocket] Dashboard client connected: ${socket.id}`);

    // Enviar status inicial
    handleInitialConnection(socket);

    // Configurar event listeners
    setupSocketListeners(socket);

    // Cleanup na desconexão
    socket.on('disconnect', (reason: string) => {
      console.log(`📡 [WebSocket] Dashboard client disconnected: ${socket.id} (${reason})`);
    });
  });

  // Configurar listeners do sistema
  setupSystemListeners();

  console.log('📡 [WebSocket] Dashboard WebSocket initialized');
  return dashboardSocket;
}

/**
 * 🔗 Configurar listeners do sistema para broadcast automático
 */
function setupSystemListeners(): void {
  // TODO: Integrar com eventos do MonitoringService
  // Quando implementarmos eventos no MonitoringService, adicionar aqui
  
  // Por enquanto, usaremos polling para detectar mudanças
  setInterval(checkForStatusChanges, 30000); // 30 segundos
}

/**
 * 🔄 Verificar mudanças de status periodicamente
 */
function checkForStatusChanges(): void {
  try {
    const scrapers = dashboardSocket.statusService.getAllScrapers();
    
    // Broadcast status geral
    dashboardSocket.io.of('/dashboard').emit('status-update', {
      type: 'SCRAPERS_STATUS',
      data: scrapers,
      timestamp: new Date().toISOString()
    });

    // Broadcast métricas
    const metrics = dashboardSocket.monitoring.getRetryMetrics();
    dashboardSocket.io.of('/dashboard').emit('metrics-update', {
      type: 'SYSTEM_METRICS',
      data: metrics,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [WebSocket] Error checking status changes:', error);
  }
}

/**
 * 📤 Lidar com conexão inicial - enviar dados atuais
 */
function handleInitialConnection(socket: Socket): void {
  try {
    // Enviar status atual dos scrapers
    const scrapers = dashboardSocket.statusService.getAllScrapers();
    socket.emit('initial-data', {
      type: 'INITIAL_SCRAPERS',
      data: scrapers,
      timestamp: new Date().toISOString()
    });

    // Enviar métricas atuais
    const metrics = dashboardSocket.monitoring.getRetryMetrics();
    socket.emit('initial-data', {
      type: 'INITIAL_METRICS', 
      data: metrics,
      timestamp: new Date().toISOString()
    });

    // Enviar status do webhook system
    const webhookStatus = dashboardSocket.monitoring.getWebhookSystemStatus();
    socket.emit('initial-data', {
      type: 'INITIAL_WEBHOOK_STATUS',
      data: webhookStatus,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ [WebSocket] Error sending initial data:', error);
    socket.emit('error', {
      type: 'INITIAL_DATA_ERROR',
      message: 'Failed to send initial data',
      timestamp: new Date().toISOString()
    });
  }
}

/**
 * 👂 Configurar listeners para eventos do cliente
 */
function setupSocketListeners(socket: Socket): void {
  // Cliente solicita atualização de status
  socket.on('request-status-update', () => {
    try {
      const scrapers = dashboardSocket.statusService.getAllScrapers();
      socket.emit('status-update', {
        type: 'SCRAPERS_STATUS',
        data: scrapers,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [WebSocket] Error handling status update request:', error);
      socket.emit('error', {
        type: 'STATUS_UPDATE_ERROR',
        message: 'Failed to get status update',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Cliente solicita métricas
  socket.on('request-metrics', () => {
    try {
      const metrics = dashboardSocket.monitoring.getRetryMetrics();
      const dlq = dashboardSocket.monitoring.getDeadLetterQueue();
      const overallStats = dashboardSocket.statusService.getOverallStats();

      socket.emit('metrics-update', {
        type: 'SYSTEM_METRICS',
        data: {
          retry: metrics,
          deadLetterQueue: dlq,
          scrapers: overallStats
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ [WebSocket] Error handling metrics request:', error);
      socket.emit('error', {
        type: 'METRICS_ERROR',
        message: 'Failed to get metrics',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Cliente quer se inscrever em updates de um scraper específico
  socket.on('subscribe-scraper', (scraperId: string) => {
    const room = `scraper-${scraperId}`;
    socket.join(room);
    console.log(`📡 [WebSocket] Client ${socket.id} subscribed to ${room}`);
  });

  // Cliente quer se desinscrever
  socket.on('unsubscribe-scraper', (scraperId: string) => {
    const room = `scraper-${scraperId}`;
    socket.leave(room);
    console.log(`📡 [WebSocket] Client ${socket.id} unsubscribed from ${room}`);
  });

  // Ping/Pong para manter conexão viva
  socket.on('ping', () => {
    socket.emit('pong', {
      timestamp: new Date().toISOString()
    });
  });
}

/**
 * 📢 Broadcast mudança de status para todos os clientes
 */
export function broadcastStatusChange(update: StatusUpdate): void {
  if (!dashboardSocket) {
    console.warn('⚠️ [WebSocket] Dashboard socket not initialized');
    return;
  }

  try {
    // Broadcast geral
    dashboardSocket.io.of('/dashboard').emit('status-change', {
      type: 'SCRAPER_STATUS_CHANGE',
      data: update,
      timestamp: new Date().toISOString()
    });

    // Broadcast específico para subscribers do scraper
    const room = `scraper-${update.scraperId}`;
    dashboardSocket.io.of('/dashboard').to(room).emit('scraper-update', {
      type: 'SPECIFIC_SCRAPER_UPDATE',
      data: update,
      timestamp: new Date().toISOString()
    });

    console.log(`📢 [WebSocket] Broadcasted status change: ${update.scraperId} → ${update.status}`);

  } catch (error) {
    console.error('❌ [WebSocket] Error broadcasting status change:', error);
  }
}

/**
 * 📊 Broadcast atualização de métricas
 */
export function broadcastMetricsUpdate(metrics: any): void {
  if (!dashboardSocket) {
    console.warn('⚠️ [WebSocket] Dashboard socket not initialized');
    return;
  }

  try {
    dashboardSocket.io.of('/dashboard').emit('metrics-update', {
      type: 'SYSTEM_METRICS',
      data: metrics,
      timestamp: new Date().toISOString()
    });

    console.log(`📊 [WebSocket] Broadcasted metrics update`);

  } catch (error) {
    console.error('❌ [WebSocket] Error broadcasting metrics update:', error);
  }
}

/**
 * 🚨 Broadcast alerta para o dashboard
 */
export function broadcastAlert(alert: {
  type: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  scraperId?: string;
  details?: any;
}): void {
  if (!dashboardSocket) {
    console.warn('⚠️ [WebSocket] Dashboard socket not initialized');
    return;
  }

  try {
    dashboardSocket.io.of('/dashboard').emit('alert', {
      type: 'SYSTEM_ALERT',
      data: alert,
      timestamp: new Date().toISOString()
    });

    console.log(`🚨 [WebSocket] Broadcasted alert: ${alert.type} (${alert.severity})`);

  } catch (error) {
    console.error('❌ [WebSocket] Error broadcasting alert:', error);
  }
}

/**
 * 📈 Broadcast atividade de scraping
 */
export function broadcastScrapingActivity(activity: {
  scraperId: string;
  type: 'RIDES' | 'DRIVERS' | 'BOTH';
  count: number;
  duration: number;
  success: boolean;
}): void {
  if (!dashboardSocket) {
    console.warn('⚠️ [WebSocket] Dashboard socket not initialized');
    return;
  }

  try {
    dashboardSocket.io.of('/dashboard').emit('scraping-activity', {
      type: 'SCRAPING_ACTIVITY',
      data: activity,
      timestamp: new Date().toISOString()
    });

    // Atualizar status service
    if (activity.success) {
      const metrics = activity.type === 'RIDES' ? 
        { ridesScraped: activity.count } :
        activity.type === 'DRIVERS' ?
        { driversScraped: activity.count } :
        { ridesScraped: Math.floor(activity.count / 2), driversScraped: Math.floor(activity.count / 2) };

      dashboardSocket.statusService.updateActivity(activity.scraperId, {
        ...metrics,
        responseTimeMs: activity.duration
      });
    } else {
      dashboardSocket.statusService.reportError(activity.scraperId, 'Scraping activity failed');
    }

    console.log(`📈 [WebSocket] Broadcasted scraping activity: ${activity.scraperId} (${activity.type})`);

  } catch (error) {
    console.error('❌ [WebSocket] Error broadcasting scraping activity:', error);
  }
}
