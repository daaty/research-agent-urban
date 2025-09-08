import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { ScraperStatus, DashboardData, StatusUpdate } from '../types/dashboard';
import { dashboardApi } from '../services/api';

interface ScraperContextType {
  scrapers: ScraperStatus[];
  dashboardData: DashboardData | null;
  loading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  startScraper: (id: string) => Promise<void>;
  stopScraper: (id: string) => Promise<void>;
  runOnce: (id: string) => Promise<void>;
}

const ScraperContext = createContext<ScraperContextType | undefined>(undefined);

export { ScraperContext }; // Export the context

export const useScrapers = () => {
  const context = useContext(ScraperContext);
  if (context === undefined) {
    throw new Error('useScrapers must be used within a ScraperProvider');
  }
  return context;
};

interface ScraperProviderProps {
  children: React.ReactNode;
}

export const ScraperProvider: React.FC<ScraperProviderProps> = ({ children }) => {
  const [scrapers, setScrapers] = useState<ScraperStatus[]>([]);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // Inicializar WebSocket
  useEffect(() => {
    const newSocket = io('http://localhost:3001', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('✅ WebSocket connected');
    });

    newSocket.on('statusUpdate', (update: StatusUpdate) => {
      console.log('📡 Status update received:', update);
      setScrapers(prev => 
        prev.map(scraper => 
          scraper.id === update.scraperId 
            ? { ...scraper, status: update.status, ...update.metrics && { metrics: update.metrics } }
            : scraper
        )
      );
    });

    newSocket.on('disconnect', () => {
      console.log('❌ WebSocket disconnected');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Carregar dados iniciais
  const refreshData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [statusResponse, scrapersResponse] = await Promise.all([
        dashboardApi.getStatus(),
        dashboardApi.getScrapers()
      ]);

      setDashboardData(statusResponse.data);
      setScrapers(scrapersResponse.data);
    } catch (err) {
      console.error('❌ Error fetching data:', err);
      setError('Erro ao carregar dados do dashboard');
    } finally {
      setLoading(false);
    }
  };

  // Controles dos scrapers
  const startScraper = async (id: string) => {
    try {
      await dashboardApi.startScraper(id);
      await refreshData();
    } catch (err) {
      console.error('❌ Error starting scraper:', err);
      setError('Erro ao iniciar scraper');
    }
  };

  const stopScraper = async (id: string) => {
    try {
      await dashboardApi.stopScraper(id);
      await refreshData();
    } catch (err) {
      console.error('❌ Error stopping scraper:', err);
      setError('Erro ao parar scraper');
    }
  };

  const runOnce = async (id: string) => {
    try {
      await dashboardApi.runOnce(id);
      await refreshData();
    } catch (err) {
      console.error('❌ Error running scraper once:', err);
      setError('Erro ao executar scraper');
    }
  };

  // Carregar dados na inicialização
  useEffect(() => {
    refreshData();
  }, []);

  // Refresh automático a cada 30 segundos
  useEffect(() => {
    const interval = setInterval(refreshData, 30000);
    return () => clearInterval(interval);
  }, []);

  const value: ScraperContextType = {
    scrapers,
    dashboardData,
    loading,
    error,
    refreshData,
    startScraper,
    stopScraper,
    runOnce
  };

  return (
    <ScraperContext.Provider value={value}>
      {children}
    </ScraperContext.Provider>
  );
};
