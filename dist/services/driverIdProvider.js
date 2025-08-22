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
exports.DriverIdProvider = void 0;
const axios_1 = __importDefault(require("axios"));
/**
 * Provedor de IDs de motoristas simplificado para uma cidade específica
 */
class DriverIdProvider {
    constructor() {
        this.cityConfig = {
            name: 'Cidade Padrão',
            apiUrl: 'https://api.exemplo.com/drivers',
            enabled: false
        };
        this.cache = [];
        this.cacheExpiresAt = new Date(0);
        this.fallbackIds = [];
        // Configurações
        this.cacheExpirationMinutes = 30;
        this.requestTimeoutMs = 10000;
        this.loadConfiguration();
    }
    static getInstance() {
        if (!DriverIdProvider.instance) {
            DriverIdProvider.instance = new DriverIdProvider();
        }
        return DriverIdProvider.instance;
    }
    /**
     * Carrega configuração do .env
     */
    loadConfiguration() {
        try {
            // Configuração da cidade específica
            this.cityConfig = {
                name: process.env.CITY_NAME || 'Cidade Padrão',
                apiUrl: process.env.CITY_API_URL || 'https://api.exemplo.com/drivers',
                enabled: false // FORÇADO PARA FALSE - usamos apenas IDs reais da dashboard
            };
            // IDs de fallback do .env (não usados mais)
            this.fallbackIds = process.env.FALLBACK_DRIVER_IDS ?
                process.env.FALLBACK_DRIVER_IDS.split(',').map(id => id.trim()) :
                [];
            console.log(`📋 DriverIdProvider configurado: ${this.cityConfig.name}`);
            console.log(`🚫 API e Fallback IDs DESABILITADOS - sistema usa APENAS IDs reais da Active Drivers page`);
            console.log(`🎯 Para funcionamento correto, certifique-se que extractAllDriverIds() está extraindo IDs reais`);
        }
        catch (error) {
            console.error('❌ Erro ao carregar configuração:', error);
            this.loadDefaultConfiguration();
        }
    }
    /**
     * Carrega configuração padrão em caso de erro
     */
    loadDefaultConfiguration() {
        this.cityConfig = {
            name: 'Cidade Padrão',
            apiUrl: 'https://api.exemplo.com/drivers',
            enabled: false // DESABILITADO - usar apenas IDs reais
        };
        this.fallbackIds = []; // Array vazio - sem fallback IDs
        console.log('🚫 Configuração padrão: API e Fallback IDs desabilitados');
    }
    /**
     * Busca IDs de motoristas da cidade configurada - DESABILITADO: usando apenas extrações reais
     */
    getAllDriverIds() {
        return __awaiter(this, arguments, void 0, function* (forceRefresh = false) {
            console.log(`🔍 DriverIdProvider: Sistema configurado para usar APENAS IDs reais da Active Drivers page`);
            console.log('⚠️ API/Fallback IDs desabilitados - retornando array vazio para forçar uso de extrações reais');
            // Retorna array vazio para garantir que apenas IDs reais da dashboard sejam usados
            return [];
        });
    }
    /**
     * Busca motoristas da API
     */
    fetchDriversFromAPI() {
        return __awaiter(this, void 0, void 0, function* () {
            const headers = {
                'Content-Type': 'application/json',
                'User-Agent': 'DriverExtractor/1.0'
            };
            // Adicionar token de autenticação se disponível
            const authToken = process.env.CITY_API_TOKEN;
            if (authToken) {
                headers['Authorization'] = `Bearer ${authToken}`;
            }
            // Parâmetro da cidade se necessário
            const cityParam = process.env.CITY_PARAM || this.cityConfig.name;
            const url = this.cityConfig.apiUrl.includes('?')
                ? `${this.cityConfig.apiUrl}&city=${encodeURIComponent(cityParam)}`
                : `${this.cityConfig.apiUrl}?city=${encodeURIComponent(cityParam)}`;
            const response = yield axios_1.default.get(url, {
                headers,
                timeout: this.requestTimeoutMs,
                validateStatus: (status) => status < 500
            });
            if (response.status !== 200) {
                throw new Error(`API retornou status ${response.status}`);
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
                throw new Error('Formato de resposta da API não reconhecido');
            }
            // Mapear para formato padrão
            const drivers = driversData.map(driver => ({
                id: driver.id || driver.driver_id || driver.driverId,
                name: driver.name || driver.driver_name || driver.full_name,
                city: this.cityConfig.name,
                status: driver.status || driver.driver_status,
                lastActivity: driver.last_activity ? new Date(driver.last_activity) : undefined,
                priority: this.determinePriority(driver)
            })).filter(driver => driver.id); // Filtrar IDs válidos
            console.log(`✅ ${this.cityConfig.name}: ${drivers.length} motoristas encontrados`);
            return drivers;
        });
    }
    /**
     * Determina prioridade do motorista baseado nos dados
     */
    determinePriority(driver) {
        // Lógica para determinar prioridade
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
     * Retorna drivers de fallback - DESABILITADO: usando apenas IDs reais da Active Drivers page
     */
    getFallbackDrivers() {
        console.log('⚠️ Fallback IDs desabilitados - sistema usa apenas IDs reais extraídos da Active Drivers page');
        return []; // Retorna array vazio para forçar uso apenas de IDs reais
    }
    /**
     * Verifica se cache ainda é válido
     */
    isCacheValid() {
        return new Date() < this.cacheExpiresAt && this.cache.length > 0;
    }
    /**
     * Atualiza cache com novos dados
     */
    updateCache(drivers) {
        this.cache = drivers;
        this.cacheExpiresAt = new Date(Date.now() + this.cacheExpirationMinutes * 60 * 1000);
    }
    /**
     * Limpa cache
     */
    clearCache() {
        this.cache = [];
        this.cacheExpiresAt = new Date(0);
        console.log('🗑️ Cache limpo');
    }
    /**
     * Atualiza configuração da cidade
     */
    updateCityConfig(name, apiUrl, enabled = true) {
        this.cityConfig = { name, apiUrl, enabled };
        this.clearCache();
        console.log(`� Configuração atualizada: ${name}`);
    }
    /**
     * Obtém estatísticas do provedor
     */
    getStats() {
        return {
            cityName: this.cityConfig.name,
            apiUrl: this.cityConfig.apiUrl,
            enabled: this.cityConfig.enabled,
            cacheValid: this.isCacheValid(),
            cacheSize: this.cache.length,
            cacheExpiry: this.cacheExpiresAt,
            fallbackIdsCount: this.fallbackIds.length
        };
    }
}
exports.DriverIdProvider = DriverIdProvider;
