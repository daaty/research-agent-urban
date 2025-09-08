import axios from 'axios';
import { DashboardData, ScraperStatus } from '../types/dashboard';

const API_BASE_URL = '/api'; // Proxy via Vite

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para logs
api.interceptors.request.use((config) => {
  console.log(`🌐 API Request: ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.config.url} - ${response.status}`);
    return response;
  },
  (error) => {
    console.error(`❌ API Error: ${error.config?.url} - ${error.response?.status || 'Network Error'}`);
    return Promise.reject(error);
  }
);

export const dashboardApi = {
  // Status geral do dashboard
  async getStatus(): Promise<{ data: DashboardData }> {
    const response = await api.get('/dashboard/status');
    return response.data;
  },

  // Lista de scrapers
  async getScrapers(): Promise<{ data: ScraperStatus[] }> {
    const response = await api.get('/scrapers');
    return response.data;
  },

  // Detalhes de um scraper específico
  async getScraper(id: string): Promise<{ data: ScraperStatus }> {
    const response = await api.get(`/scrapers/${id}`);
    return response.data;
  },

  // Controles dos scrapers
  async startScraper(id: string): Promise<void> {
    await api.post('/scrapers/start');
  },

  async stopScraper(id: string): Promise<void> {
    await api.post('/scrapers/stop');
  },

  async runOnce(id: string): Promise<void> {
    await api.post('/scrapers/run-once');
  },

  // Métricas
  async getMetrics(): Promise<any> {
    const response = await api.get('/metrics');
    return response.data;
  },

  // Health check
  async healthCheck(): Promise<any> {
    const response = await api.get('/dashboard/status');
    return response.data;
  }
};

export default api;
