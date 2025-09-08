/**
 * 📊 DASHBOARD MODULE INDEX
 * 
 * Ponto de entrada principal para o módulo do dashboard integrado
 */

export { dashboardRoutes } from './routes';
export { DashboardController } from './controllers/dashboardController';
export { ScraperStatusService, ScraperStatus } from './services/scraperStatusService';
export { 
  initWebSocket, 
  broadcastStatusChange, 
  broadcastMetricsUpdate, 
  broadcastAlert, 
  broadcastScrapingActivity 
} from './websocket';

// Re-exportar tipos úteis
export type { ScraperData, StatusUpdate } from './services/scraperStatusService';
