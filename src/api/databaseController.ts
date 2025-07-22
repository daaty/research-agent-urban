import express from 'express';
import { DatabaseManager } from '../services/databaseManager';
import { DataTransformer } from '../services/dataTransformer';

const router = express.Router();
const databaseManager = DatabaseManager.getInstance();
const dataTransformer = DataTransformer.getInstance();

/**
 * Obter estatísticas do banco de dados
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await dataTransformer.getDatabaseStats();
    
    res.json({
      success: true,
      stats,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao obter estatísticas:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Buscar dados por período
 */
router.get('/rides', async (req, res) => {
  try {
    const { startDate, endDate, tableName } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'startDate e endDate são obrigatórios'
      });
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Datas inválidas'
      });
    }

    const rides = await databaseManager.getRidesByDateRange(
      start, 
      end, 
      tableName as string
    );
    
    res.json({
      success: true,
      data: rides,
      count: rides.length,
      period: { startDate, endDate, tableName },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar dados:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Buscar dados recentes (últimas 24h)
 */
router.get('/rides/recent', async (req, res) => {
  try {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24h atrás
    
    const rides = await databaseManager.getRidesByDateRange(startDate, endDate);
    
    res.json({
      success: true,
      data: rides,
      count: rides.length,
      period: 'last_24_hours',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar dados recentes:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Teste de conexão com banco
 */
router.get('/test-connection', async (req, res) => {
  try {
    const isConnected = databaseManager.isConnectedToDatabase();
    
    if (!isConnected) {
      // Tentar reconectar
      await databaseManager.initialize();
    }
    
    const stats = await databaseManager.getDatabaseStats();
    
    res.json({
      success: true,
      isConnected: true,
      stats,
      message: 'Conexão com PostgreSQL funcionando',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro na conexão:', error);
    res.status(500).json({
      success: false,
      isConnected: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Buscar dados para dashboard (agregados)
 */
router.get('/dashboard-data', async (req, res) => {
  try {
    if (!databaseManager.isConnectedToDatabase()) {
      return res.status(503).json({
        success: false,
        message: 'Banco de dados não conectado'
      });
    }

    const stats = await databaseManager.getDatabaseStats();
    
    // Buscar dados dos últimos 7 dias
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentRides = await databaseManager.getRidesByDateRange(startDate, endDate);
    
    // Agrupar dados por tabela e dia
    const dataByTable = recentRides.reduce((acc: any, ride: any) => {
      const tableName = ride.table_name;
      const day = ride.scraped_at.toISOString().split('T')[0];
      
      if (!acc[tableName]) {
        acc[tableName] = {};
      }
      
      if (!acc[tableName][day]) {
        acc[tableName][day] = 0;
      }
      
      // Contar registros (assumindo que ride_data.rows existe)
      const rideData = typeof ride.ride_data === 'string' 
        ? JSON.parse(ride.ride_data) 
        : ride.ride_data;
        
      acc[tableName][day] += rideData.rows?.length || 0;
      
      return acc;
    }, {});
    
    res.json({
      success: true,
      dashboardData: {
        overview: stats,
        last7Days: dataByTable,
        recentRides: recentRides.slice(0, 10), // Últimos 10 registros
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao obter dados do dashboard:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Buscar sessões de scraping
 */
router.get('/sessions', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    // Query direta para buscar sessões (implementação simples)
    // Em produção, seria melhor criar um método específico no DatabaseManager
    const stats = await databaseManager.getDatabaseStats();
    
    res.json({
      success: true,
      message: 'Endpoint em desenvolvimento',
      availableStats: stats,
      limit: parseInt(limit as string),
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    console.error('❌ Erro ao buscar sessões:', error);
    res.status(500).json({
      success: false,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

export default router;
