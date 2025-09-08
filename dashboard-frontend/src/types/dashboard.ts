export interface ScraperStatus {
  id: string;
  name: string;
  status: 'ONLINE_ACTIVE' | 'ONLINE_IDLE' | 'OFFLINE' | 'ERROR' | 'STARTING';
  lastHeartbeat: number;
  lastActivity: number;
  metrics: {
    successRate: number;
    ridesScraped: number;
    driversScraped: number;
    errorsCount: number;
    responseTimeMs: number;
  };
  startTime: number;
}

export interface DashboardStats {
  totalScrapers: number;
  onlineScrapers: number;
  activeScrapers: number;
  offlineScrapers: number;
  errorScrapers: number;
  totalRides: number;
  totalDrivers: number;
  totalErrors: number;
  overallSuccessRate: number;
}

export interface WebhookSystemStatus {
  retryManager: {
    metrics: any;
    healthStatus: string;
    circuitBreakerStatus: string;
    deadLetterQueueSize: number;
    recentFailures: any[];
  };
  rateLimiter: {
    metrics: any;
    healthStatus: string;
    details: string;
    tokensAvailable: number;
    blockedPercentage: number;
    recommendations: string[];
  };
  webhookValidator: {
    enabled: boolean;
    strictMode: boolean;
    sanitizationEnabled: boolean;
  };
  recommendations: string;
}

export interface DashboardData {
  scrapers: ScraperStatus[];
  stats: DashboardStats;
  webhookSystem: WebhookSystemStatus;
  environment: {
    nodeEnv: string;
    ridesUsername: string;
    scrapeInterval: string;
    headlessMode: string;
    databaseConnected: boolean;
  };
}

export interface StatusUpdate {
  scraperId: string;
  status: ScraperStatus['status'];
  timestamp: string;
  metrics?: ScraperStatus['metrics'];
}
