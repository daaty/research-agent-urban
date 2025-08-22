"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const databaseManager_1 = require("../services/databaseManager");
const dataTransformer_1 = require("../services/dataTransformer");
const router = express_1.default.Router();
const databaseManager = databaseManager_1.DatabaseManager.getInstance();
const dataTransformer = dataTransformer_1.DataTransformer.getInstance();
/**
 * Obter estatísticas do banco de dados
 */
router.get('/stats', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const stats = yield dataTransformer.getDatabaseStats();
        res.json({
            success: true,
            stats,
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao obter estatísticas:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
/**
 * Buscar dados recentes (últimas 24h)
 */
router.get('/recent', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24h atrás
        const rides = yield databaseManager.getRidesByDateRange(startDate, endDate);
        res.json({
            success: true,
            data: rides,
            count: rides.length,
            period: 'last_24_hours',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao buscar dados recentes:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
/**
 * Teste de conexão com banco
 */
router.get('/test-connection', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const isConnected = databaseManager.isConnectedToDatabase();
        if (!isConnected) {
            // Tentar reconectar
            yield databaseManager.initialize();
        }
        const stats = yield databaseManager.getDatabaseStats();
        res.json({
            success: true,
            isConnected: true,
            stats,
            message: 'Conexão com PostgreSQL funcionando',
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro na conexão:', error);
        res.status(500).json({
            success: false,
            isConnected: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
/**
 * Buscar dados para dashboard (agregados)
 */
router.get('/dashboard', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!databaseManager.isConnectedToDatabase()) {
            return res.status(503).json({
                success: false,
                message: 'Banco de dados não conectado'
            });
        }
        const stats = yield databaseManager.getDatabaseStats();
        // Buscar dados dos últimos 7 dias
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentRides = yield databaseManager.getRidesByDateRange(startDate, endDate);
        // Agrupar dados por tabela e dia
        const dataByTable = recentRides.reduce((acc, ride) => {
            var _a;
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
            acc[tableName][day] += ((_a = rideData.rows) === null || _a === void 0 ? void 0 : _a.length) || 0;
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
    }
    catch (error) {
        console.error('❌ Erro ao obter dados do dashboard:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
/**
 * Buscar dados por período
 */
router.post('/query', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { startDate, endDate, tableName } = req.body;
        if (!startDate || !endDate) {
            return res.status(400).json({
                success: false,
                message: 'startDate e endDate são obrigatórios'
            });
        }
        const start = new Date(startDate);
        const end = new Date(endDate);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({
                success: false,
                message: 'Datas inválidas'
            });
        }
        const rides = yield databaseManager.getRidesByDateRange(start, end, tableName);
        res.json({
            success: true,
            data: rides,
            count: rides.length,
            period: { startDate, endDate, tableName },
            timestamp: new Date().toISOString()
        });
    }
    catch (error) {
        console.error('❌ Erro ao buscar dados:', error);
        res.status(500).json({
            success: false,
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}));
exports.default = router;
