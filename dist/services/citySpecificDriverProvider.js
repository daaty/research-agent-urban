"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
exports.CitySpecificDriverProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
/**
 * Provedor de IDs específico para uma cidade
 * Cada instância do scraper trabalha com uma cidade específica
 */
class CitySpecificDriverProvider {
    constructor(config) {
        this.cache = null;
        this.fallbackIds = [];
        // Configurações
        this.cacheExpirationMinutes = 30;
        this.requestTimeoutMs = 10000;
        this.maxRetries = 3;
        this.config = config;
        this.cacheFilePath = path.join(process.cwd(), `driver-ids-cache-${config.cityCode.toLowerCase()}.json`);
        this.loadConfiguration();
        this.loadCache();
    }
    static getInstance(config) {
        const key = config.cityCode;
        if (!CitySpecificDriverProvider.instances.has(key)) {
            CitySpecificDriverProvider.instances.set(key, new CitySpecificDriverProvider(config));
        }
        return CitySpecificDriverProvider.instances.get(key);
    }
    /**
     * Carrega configuração específica da cidade
     */
    loadConfiguration() {
        try {
            // IDs de fallback específicos da cidade do .env
            const fallbackEnvKey = `FALLBACK_DRIVER_IDS_${this.config.cityCode.toUpperCase()}`;
            this.fallbackIds = process.env[fallbackEnvKey] ?
                process.env[fallbackEnvKey].split(',').map(id => id.trim()) :
                [`${this.config.cityCode}001`, `${this.config.cityCode}002`, `${this.config.cityCode}003`];
            console.log(`📋 Configuração carregada para ${this.config.cityName}: ${this.fallbackIds.length} IDs fallback`);
        }
        catch (error) {
            console.error(`❌ Erro ao carregar configuração para ${this.config.cityName}:`, error);
            this.loadDefaultConfiguration();
        }
    }
    /**
     * Carrega configuração padrão em caso de erro
     */
    loadDefaultConfiguration() {
        this.fallbackIds = [`${this.config.cityCode}001`, `${this.config.cityCode}002`, `${this.config.cityCode}003`];
    }
    /**
     * Carrega cache do arquivo específico da cidade
     */
    loadCache() {
        try {
            if (fs.existsSync(this.cacheFilePath)) {
                const data = fs.readFileSync(this.cacheFilePath, 'utf8');
                const loaded = JSON.parse(data);
                // Converter datas de string para Date
                this.cache = Object.assign(Object.assign({}, loaded), { lastUpdated: new Date(loaded.lastUpdated), expiresAt: new Date(loaded.expiresAt) });
                if (this.cache && this.cache.drivers) {
                    console.log(`💾 Cache carregado para ${this.config.cityName}: ${this.cache.drivers.length} motoristas`);
                }
            }
        }
        catch (error) {
            console.error(`⚠️ Erro ao carregar cache para ${this.config.cityName}:`, error);
            this.cache = null;
        }
    }
    /**
     * Salva cache no arquivo específico da cidade
     */
    saveCache() {
        try {
            if (this.cache) {
                fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cache, null, 2));
            }
        }
        catch (error) {
            console.error(`❌ Erro ao salvar cache para ${this.config.cityName}:`, error);
        }
    }
    /**
     * Busca IDs de motoristas da cidade específica
     */
    getDriverIds() {
        return __awaiter(this, arguments, void 0, function* (forceRefresh = false) {
            console.log(`🔍 Buscando IDs de motoristas de ${this.config.cityName}...`);
            if (!this.config.enabled) {
                console.log(`⚠️ Cidade ${this.config.cityName} está desabilitada`);
                return this.getFallbackIds();
            }
            // Verificar cache se não for refresh forçado
            if (!forceRefresh && this.cache && new Date() <= this.cache.expiresAt) {
                console.log(`📋 Usando cache para ${this.config.cityName}: ${this.cache.drivers.length} motoristas`);
                return this.cache.drivers;
            }
            // Buscar da API da cidade
            try {
                console.log(`🌐 Buscando IDs da API: ${this.config.cityName}`);
                const drivers = yield this.fetchDriversFromCityAPI();
                // Salvar no cache
                this.setCachedDrivers(drivers);
                return drivers;
            }
            catch (error) {
                console.error(`❌ Erro ao buscar ${this.config.cityName} da API:`, error);
                // Tentar usar cache expirado como fallback
                if (this.cache) {
                    console.log(`🔄 Usando cache expirado para ${this.config.cityName}`);
                    return this.cache.drivers;
                }
                // Usar IDs de fallback específicos da cidade
                console.log(`🔄 Usando IDs de fallback para ${this.config.cityName}`);
                return this.getFallbackIds();
            }
        });
    }
    /**
     * Busca motoristas da API específica da cidade
     */
    fetchDriversFromCityAPI() {
        return __awaiter(this, void 0, void 0, function* () {
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': `CityDriverExtractor/${this.config.cityCode}/1.0`
            };
            // Adicionar token de autenticação se disponível
            if (this.config.apiToken) {
                headers['Authorization'] = `Bearer ${this.config.apiToken}`;
            }
            const response = yield axios_1.default.get(this.config.dashboardApiUrl, {
                headers,
                timeout: this.requestTimeoutMs,
                validateStatus: (status) => status < 500
            });
            if (response.status !== 200) {
                throw new Error(`API retornou status ${response.status} para ${this.config.cityName}`);
            }
            const data = response.data;
            // Diferentes formatos de resposta da API
            let driversData = [];
            if (Array.isArray(data)) {
                driversData = data;
            }
            else if (data.drivers && Array.isArray(data.drivers)) {
                driversData = data.drivers;
            }
            else if (data.data && Array.isArray(data.data)) {
                driversData = data.data;
            }
            else {
                throw new Error(`Formato de resposta da API não reconhecido para ${this.config.cityName}`);
            }
            // Mapear para formato padrão específico da cidade
            const drivers = driversData.map(driver => ({
                id: driver.id || driver.driver_id || driver.driverId,
                name: driver.name || driver.driver_name || driver.full_name,
                city: this.config.cityName,
                cityCode: this.config.cityCode,
                status: driver.status || driver.driver_status,
                lastActivity: driver.last_activity ? new Date(driver.last_activity) : undefined,
                priority: this.determinePriority(driver)
            })).filter(driver => driver.id); // Filtrar IDs válidos
            // Limitar por lote se configurado
            if (this.config.maxDriversPerBatch && drivers.length > this.config.maxDriversPerBatch) {
                drivers.splice(this.config.maxDriversPerBatch);
            }
            console.log(`✅ ${this.config.cityName}: ${drivers.length} motoristas encontrados`);
            return drivers;
        });
    }
    /**
     * Determina prioridade do motorista baseado nos dados
     */
    determinePriority(driver) {
        // Lógica para determinar prioridade específica da cidade
        if (driver.status === 'vip' || driver.priority === 'high')
            return 'high';
        if (driver.last_activity) {
            const lastActivity = new Date(driver.last_activity);
            const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceActivity > 30)
                return 'high'; // Motoristas inativos há muito tempo
        }
        return 'normal';
    }
    /**
     * Obtém IDs de fallback específicos da cidade
     */
    getFallbackIds() {
        return this.fallbackIds.map(id => ({
            id,
            city: this.config.cityName,
            cityCode: this.config.cityCode,
            priority: 'normal'
        }));
    }
    /**
     * Salva motoristas no cache específico da cidade
     */
    setCachedDrivers(drivers) {
        const now = new Date();
        const expiresAt = new Date(now.getTime() + this.cacheExpirationMinutes * 60 * 1000);
        this.cache = {
            cityCode: this.config.cityCode,
            drivers,
            lastUpdated: now,
            expiresAt
        };
        this.saveCache();
    }
    /**
     * Limpa cache específico da cidade
     */
    clearCache() {
        this.cache = null;
        if (fs.existsSync(this.cacheFilePath)) {
            fs.unlinkSync(this.cacheFilePath);
        }
        console.log(`🗑️ Cache limpo para ${this.config.cityName}`);
    }
    /**
     * Obtém configuração da cidade
     */
    getConfig() {
        return Object.assign({}, this.config);
    }
    /**
     * Atualiza configuração da cidade
     */
    updateConfig(newConfig) {
        this.config = Object.assign(Object.assign({}, this.config), newConfig);
        console.log(`🔄 Configuração atualizada para ${this.config.cityName}`);
    }
    /**
     * Obtém estatísticas específicas da cidade
     */
    getStats() {
        var _a, _b;
        return {
            cityName: this.config.cityName,
            cityCode: this.config.cityCode,
            enabled: this.config.enabled,
            cached: this.cache !== null,
            cacheExpiry: (_a = this.cache) === null || _a === void 0 ? void 0 : _a.expiresAt,
            fallbackIdsCount: this.fallbackIds.length,
            lastDriversCount: ((_b = this.cache) === null || _b === void 0 ? void 0 : _b.drivers.length) || 0
        };
    }
}
exports.CitySpecificDriverProvider = CitySpecificDriverProvider;
CitySpecificDriverProvider.instances = new Map();
