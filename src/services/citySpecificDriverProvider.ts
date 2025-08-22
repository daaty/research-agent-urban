import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Configuração específica da cidade para este scraper
 */
export interface CitySpecificConfig {
  cityName: string;
  cityCode: string; // Código único da cidade (ex: SP, RJ, BH)
  dashboardApiUrl: string;
  rechargeApiUrl: string;
  apiToken?: string;
  enabled: boolean;
  maxDriversPerBatch?: number;
}

/**
 * Dados do motorista específicos da cidade
 */
export interface CityDriverInfo {
  id: string;
  name?: string;
  city: string;
  cityCode: string;
  status?: string;
  lastActivity?: Date;
  priority?: 'high' | 'normal';
}

/**
 * Cache de IDs específico da cidade
 */
interface CityDriverCache {
  cityCode: string;
  drivers: CityDriverInfo[];
  lastUpdated: Date;
  expiresAt: Date;
}

/**
 * Provedor de IDs específico para uma cidade
 * Cada instância do scraper trabalha com uma cidade específica
 */
export class CitySpecificDriverProvider {
  private static instances: Map<string, CitySpecificDriverProvider> = new Map();
  private config: CitySpecificConfig;
  private cache: CityDriverCache | null = null;
  private cacheFilePath: string;
  private fallbackIds: string[] = [];
  
  // Configurações
  private cacheExpirationMinutes: number = 30;
  private requestTimeoutMs: number = 10000;
  private maxRetries: number = 3;

  private constructor(config: CitySpecificConfig) {
    this.config = config;
    this.cacheFilePath = path.join(process.cwd(), `driver-ids-cache-${config.cityCode.toLowerCase()}.json`);
    this.loadConfiguration();
    this.loadCache();
  }

  public static getInstance(config: CitySpecificConfig): CitySpecificDriverProvider {
    const key = config.cityCode;
    if (!CitySpecificDriverProvider.instances.has(key)) {
      CitySpecificDriverProvider.instances.set(key, new CitySpecificDriverProvider(config));
    }
    return CitySpecificDriverProvider.instances.get(key)!;
  }

  /**
   * Carrega configuração específica da cidade
   */
  private loadConfiguration(): void {
    try {
      // IDs de fallback específicos da cidade do .env
      const fallbackEnvKey = `FALLBACK_DRIVER_IDS_${this.config.cityCode.toUpperCase()}`;
      this.fallbackIds = process.env[fallbackEnvKey] ? 
        process.env[fallbackEnvKey]!.split(',').map(id => id.trim()) : 
        [`${this.config.cityCode}001`, `${this.config.cityCode}002`, `${this.config.cityCode}003`];

      console.log(`📋 Configuração carregada para ${this.config.cityName}: ${this.fallbackIds.length} IDs fallback`);
      
    } catch (error) {
      console.error(`❌ Erro ao carregar configuração para ${this.config.cityName}:`, error);
      this.loadDefaultConfiguration();
    }
  }

  /**
   * Carrega configuração padrão em caso de erro
   */
  private loadDefaultConfiguration(): void {
    this.fallbackIds = [`${this.config.cityCode}001`, `${this.config.cityCode}002`, `${this.config.cityCode}003`];
  }

  /**
   * Carrega cache do arquivo específico da cidade
   */
  private loadCache(): void {
    try {
      if (fs.existsSync(this.cacheFilePath)) {
        const data = fs.readFileSync(this.cacheFilePath, 'utf8');
        const loaded = JSON.parse(data);
        
        // Converter datas de string para Date
        this.cache = {
          ...loaded,
          lastUpdated: new Date(loaded.lastUpdated),
          expiresAt: new Date(loaded.expiresAt)
        };
        
        if (this.cache && this.cache.drivers) {
          console.log(`💾 Cache carregado para ${this.config.cityName}: ${this.cache.drivers.length} motoristas`);
        }
      }
    } catch (error) {
      console.error(`⚠️ Erro ao carregar cache para ${this.config.cityName}:`, error);
      this.cache = null;
    }
  }

  /**
   * Salva cache no arquivo específico da cidade
   */
  private saveCache(): void {
    try {
      if (this.cache) {
        fs.writeFileSync(this.cacheFilePath, JSON.stringify(this.cache, null, 2));
      }
    } catch (error) {
      console.error(`❌ Erro ao salvar cache para ${this.config.cityName}:`, error);
    }
  }

  /**
   * Busca IDs de motoristas da cidade específica
   */
  public async getDriverIds(forceRefresh: boolean = false): Promise<CityDriverInfo[]> {
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
      const drivers = await this.fetchDriversFromCityAPI();
      
      // Salvar no cache
      this.setCachedDrivers(drivers);
      
      return drivers;
      
    } catch (error) {
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
  }

  /**
   * Busca motoristas da API específica da cidade
   */
  private async fetchDriversFromCityAPI(): Promise<CityDriverInfo[]> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': `CityDriverExtractor/${this.config.cityCode}/1.0`
    };

    // Adicionar token de autenticação se disponível
    if (this.config.apiToken) {
      headers['Authorization'] = `Bearer ${this.config.apiToken}`;
    }

    const response = await axios.get(this.config.dashboardApiUrl, {
      headers,
      timeout: this.requestTimeoutMs,
      validateStatus: (status) => status < 500
    });

    if (response.status !== 200) {
      throw new Error(`API retornou status ${response.status} para ${this.config.cityName}`);
    }

    const data = response.data;
    
    // Diferentes formatos de resposta da API
    let driversData: any[] = [];
    
    if (Array.isArray(data)) {
      driversData = data;
    } else if (data.drivers && Array.isArray(data.drivers)) {
      driversData = data.drivers;
    } else if (data.data && Array.isArray(data.data)) {
      driversData = data.data;
    } else {
      throw new Error(`Formato de resposta da API não reconhecido para ${this.config.cityName}`);
    }

    // Mapear para formato padrão específico da cidade
    const drivers: CityDriverInfo[] = driversData.map(driver => ({
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
  }

  /**
   * Determina prioridade do motorista baseado nos dados
   */
  private determinePriority(driver: any): 'high' | 'normal' {
    // Lógica para determinar prioridade específica da cidade
    if (driver.status === 'vip' || driver.priority === 'high') return 'high';
    if (driver.last_activity) {
      const lastActivity = new Date(driver.last_activity);
      const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 30) return 'high'; // Motoristas inativos há muito tempo
    }
    return 'normal';
  }

  /**
   * Obtém IDs de fallback específicos da cidade
   */
  private getFallbackIds(): CityDriverInfo[] {
    return this.fallbackIds.map(id => ({
      id,
      city: this.config.cityName,
      cityCode: this.config.cityCode,
      priority: 'normal' as const
    }));
  }

  /**
   * Salva motoristas no cache específico da cidade
   */
  private setCachedDrivers(drivers: CityDriverInfo[]): void {
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
  public clearCache(): void {
    this.cache = null;
    if (fs.existsSync(this.cacheFilePath)) {
      fs.unlinkSync(this.cacheFilePath);
    }
    console.log(`🗑️ Cache limpo para ${this.config.cityName}`);
  }

  /**
   * Obtém configuração da cidade
   */
  public getConfig(): CitySpecificConfig {
    return { ...this.config };
  }

  /**
   * Atualiza configuração da cidade
   */
  public updateConfig(newConfig: Partial<CitySpecificConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log(`🔄 Configuração atualizada para ${this.config.cityName}`);
  }

  /**
   * Obtém estatísticas específicas da cidade
   */
  public getStats() {
    return {
      cityName: this.config.cityName,
      cityCode: this.config.cityCode,
      enabled: this.config.enabled,
      cached: this.cache !== null,
      cacheExpiry: this.cache?.expiresAt,
      fallbackIdsCount: this.fallbackIds.length,
      lastDriversCount: this.cache?.drivers.length || 0
    };
  }
}
