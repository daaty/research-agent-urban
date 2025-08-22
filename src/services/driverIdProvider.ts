import axios from 'axios';

/**
 * Configuração simples para uma cidade específica
 */
export interface CityConfig {
  name: string;
  apiUrl: string;
  enabled: boolean;
}

/**
 * Dados do motorista retornados pela API
 */
export interface DriverInfo {
  id: string;
  name?: string;
  city: string;
  status?: string;
  lastActivity?: Date;
  priority?: 'high' | 'normal';
}

/**
 * Cache de IDs para otimização
 */
interface DriverCache {
  city: string;
  drivers: DriverInfo[];
  lastUpdated: Date;
  expiresAt: Date;
}

/**
 * Provedor de IDs de motoristas simplificado para uma cidade específica
 */
export class DriverIdProvider {
  private static instance: DriverIdProvider;
  private cityConfig: CityConfig = {
    name: 'Cidade Padrão',
    apiUrl: 'https://api.exemplo.com/drivers',
    enabled: false
  };
  private cache: DriverInfo[] = [];
  private cacheExpiresAt: Date = new Date(0);
  private fallbackIds: string[] = [];
  
  // Configurações
  private cacheExpirationMinutes: number = 30;
  private requestTimeoutMs: number = 10000;

  private constructor() {
    this.loadConfiguration();
  }

  public static getInstance(): DriverIdProvider {
    if (!DriverIdProvider.instance) {
      DriverIdProvider.instance = new DriverIdProvider();
    }
    return DriverIdProvider.instance;
  }

  /**
   * Carrega configuração do .env
   */
  private loadConfiguration(): void {
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
      
    } catch (error) {
      console.error('❌ Erro ao carregar configuração:', error);
      this.loadDefaultConfiguration();
    }
  }

  /**
   * Carrega configuração padrão em caso de erro
   */
  private loadDefaultConfiguration(): void {
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
  public async getAllDriverIds(forceRefresh: boolean = false): Promise<DriverInfo[]> {
    console.log(`🔍 DriverIdProvider: Sistema configurado para usar APENAS IDs reais da Active Drivers page`);
    console.log('⚠️ API/Fallback IDs desabilitados - retornando array vazio para forçar uso de extrações reais');
    
    // Retorna array vazio para garantir que apenas IDs reais da dashboard sejam usados
    return [];
  }

  /**
   * Busca motoristas da API
   */
  private async fetchDriversFromAPI(): Promise<DriverInfo[]> {
    const headers: Record<string, string> = {
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

    const response = await axios.get(url, {
      headers,
      timeout: this.requestTimeoutMs,
      validateStatus: (status) => status < 500
    });

    if (response.status !== 200) {
      throw new Error(`API retornou status ${response.status}`);
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
      throw new Error('Formato de resposta da API não reconhecido');
    }

    // Mapear para formato padrão
    const drivers: DriverInfo[] = driversData.map(driver => ({
      id: driver.id || driver.driver_id || driver.driverId,
      name: driver.name || driver.driver_name || driver.full_name,
      city: this.cityConfig.name,
      status: driver.status || driver.driver_status,
      lastActivity: driver.last_activity ? new Date(driver.last_activity) : undefined,
      priority: this.determinePriority(driver)
    })).filter(driver => driver.id); // Filtrar IDs válidos

    console.log(`✅ ${this.cityConfig.name}: ${drivers.length} motoristas encontrados`);
    return drivers;
  }

  /**
   * Determina prioridade do motorista baseado nos dados
   */
  private determinePriority(driver: any): 'high' | 'normal' {
    // Lógica para determinar prioridade
    if (driver.status === 'vip' || driver.priority === 'high') return 'high';
    if (driver.last_activity) {
      const lastActivity = new Date(driver.last_activity);
      const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity > 30) return 'high'; // Motoristas inativos há muito tempo
    }
    return 'normal';
  }

  /**
   * Retorna drivers de fallback - DESABILITADO: usando apenas IDs reais da Active Drivers page
   */
  private getFallbackDrivers(): DriverInfo[] {
    console.log('⚠️ Fallback IDs desabilitados - sistema usa apenas IDs reais extraídos da Active Drivers page');
    return []; // Retorna array vazio para forçar uso apenas de IDs reais
  }

  /**
   * Verifica se cache ainda é válido
   */
  private isCacheValid(): boolean {
    return new Date() < this.cacheExpiresAt && this.cache.length > 0;
  }

  /**
   * Atualiza cache com novos dados
   */
  private updateCache(drivers: DriverInfo[]): void {
    this.cache = drivers;
    this.cacheExpiresAt = new Date(Date.now() + this.cacheExpirationMinutes * 60 * 1000);
  }

  /**
   * Limpa cache
   */
  public clearCache(): void {
    this.cache = [];
    this.cacheExpiresAt = new Date(0);
    console.log('🗑️ Cache limpo');
  }

  /**
   * Atualiza configuração da cidade
   */
  public updateCityConfig(name: string, apiUrl: string, enabled: boolean = true): void {
    this.cityConfig = { name, apiUrl, enabled };
    this.clearCache();
    console.log(`� Configuração atualizada: ${name}`);
  }

  /**
   * Obtém estatísticas do provedor
   */
  public getStats() {
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
