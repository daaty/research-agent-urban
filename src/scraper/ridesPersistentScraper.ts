import { BrowserSessionManager } from '../services/browserSessionManager';
import { DataCacheManager } from '../services/dataCacheManager';

export interface RideTableData {
  name: string;
  url: string;
  headers: string[];
  rows: string[][];
  isEmpty: boolean;
}

export interface PersistentScrapeResult {
  success: boolean;
  data: RideTableData[];
  message: string;
  sessionInfo?: {
    isNewLogin: boolean;
    browserStatus: string;
    sessionValid: boolean;
  };
  hasChanges?: boolean;
  onlyNewData?: boolean;
  differences?: any[];
}

export class RidesPersistentScraper {
  private sessionManager: BrowserSessionManager;
  private cacheManager: DataCacheManager;
  private baseUrl: string;
  private ridesPages: Array<{name: string, url: string}>;
  
  // 🔥 CONTROLE INTERNO DE LOGIN
  private static hasLoggedInSuccessfully: boolean = false;

  constructor() {
    this.sessionManager = BrowserSessionManager.getInstance();
    this.cacheManager = DataCacheManager.getInstance();
    
    // Extrair domínio base da URL de login
    const loginUrl = process.env.RIDES_LOGIN_URL || 'https://rides.ec2dashboard.com/#/page/login';
    this.baseUrl = loginUrl.split('#')[0]; // https://rides.ec2dashboard.com/
    
    // Montar URLs dinamicamente baseado no domínio
    this.ridesPages = [
      { name: 'Ongoing Rides', url: `${this.baseUrl}#/app/ongoing-rides/` },
      { name: 'Scheduled Rides', url: `${this.baseUrl}#/app/scheduled-rides/` },
      { name: 'Completed Rides', url: `${this.baseUrl}#/app/completed-rides/` },
      { name: 'Cancelled Rides', url: `${this.baseUrl}#/app/cancelled-rides/4/` },
      { name: 'Missed Rides', url: `${this.baseUrl}#/app/missed-rides/3/` }
    ];
  }

  /**
   * Executa scraping usando sessão persistente
   */
  public async scrapeAllData(skipLoginVerification: boolean = false): Promise<PersistentScrapeResult> {
    try {
      console.log('🚀 Iniciando scraping com sessão persistente...');
      console.log(`🔧 [RIDES] Skip Login Verification PARÂMETRO: ${skipLoginVerification}`);
      
      // 🔥 CONTROLE INTERNO: Se já fez login uma vez, sempre pular
      let finalSkipLogin = skipLoginVerification;
      if (RidesPersistentScraper.hasLoggedInSuccessfully) {
        finalSkipLogin = true;
        console.log('🔥 [RIDES-CONTROL] JÁ FEZ LOGIN ANTES - FORÇANDO skipLogin=true');
      } else {
        console.log('🔥 [RIDES-CONTROL] PRIMEIRA EXECUÇÃO - USANDO parâmetro original');
      }
      
      console.log(`🔧 [RIDES] Skip Login Verification FINAL: ${finalSkipLogin}`);
      
      // Verificar status detalhado antes de começar
      const browserWasActive = this.sessionManager.isActive();
      const sessionStatus = await this.sessionManager.getSessionStatus();
      
      console.log('📊 Status da sessão:', sessionStatus.message);
      
      // 🔥 NOVA LÓGICA: Pular verificação se solicitado
      let loginSuccess = true;
      
      if (finalSkipLogin) {
        console.log('⚡ [RIDES] Pulando verificação de login - assumindo login manual válido');
        console.log('🔧 [RIDES] skipLoginVerification === true - NÃO chamando ensureLoginWithCaptchaHandling()');
        
        // Garantir que browser está ativo
        if (!this.sessionManager.isActive()) {
          console.log('🔧 [RIDES] Browser inativo, inicializando...');
          await this.sessionManager.initializeBrowser();
        } else {
          console.log('🔧 [RIDES] Browser já está ativo - seguindo direto para scraping');
        }
      } else {
        console.log('🔧 [RIDES] skipLoginVerification === false - chamando ensureLoginWithCaptchaHandling()');
        // Garantir que está logado (com tratamento de captcha)
        loginSuccess = await this.sessionManager.ensureLoginWithCaptchaHandling(false);
        
        if (!loginSuccess) {
          const finalStatus = await this.sessionManager.getSessionStatus();
          return {
            success: false,
            data: [],
            message: finalStatus.requiresManualLogin 
              ? 'Captcha detectado - por favor faça login manualmente no navegador e tente novamente'
              : 'Falha no login',
            sessionInfo: {
              isNewLogin: !browserWasActive,
              browserStatus: 'login_failed',
              sessionValid: false
            }
          };
        }
      }

      console.log('✅ Login verificado/realizado com sucesso');
      
      // Extrair dados de todas as páginas
      const allData: RideTableData[] = [];
      
      for (const ridePage of this.ridesPages) {
        console.log(`📊 Processando: ${ridePage.name}...`);
        
        try {
          // Navegar para a página
          await this.sessionManager.navigateToPage(ridePage.url);
          
          // Aguardar tabela carregar
          await this.delay(5000);
          
          // Extrair dados da tabela
          const tableData = await this.sessionManager.extractTableData(ridePage.name);
          allData.push(tableData);
          
          const recordCount = tableData.isEmpty ? 0 : tableData.rows.length;
          console.log(`✅ ${ridePage.name}: ${recordCount} registros encontrados`);
          
        } catch (error: any) {
          console.error(`❌ Erro ao processar ${ridePage.name}:`, error.message);
          allData.push({
            name: ridePage.name,
            url: ridePage.url,
            headers: [],
            rows: [],
            isEmpty: true
          });
        }
      }

      const totalRecords = allData.reduce((sum, table) => sum + table.rows.length, 0);
      
      // ⭐ NOVA FUNCIONALIDADE: Comparar com dados anteriores
      console.log('🔍 Comparando com dados anteriores...');
      const comparison = this.cacheManager.compareAndGetDifferences(allData);

      let resultMessage = '';
      if (comparison.hasChanges) {
        const newRecords = comparison.differences.reduce((sum, diff) => sum + diff.totalNewRecords, 0);
        resultMessage = `✅ Scraping concluído! ${newRecords} novos registros encontrados de ${totalRecords} total`;
      } else {
        resultMessage = `✅ Scraping concluído! Nenhuma mudança detectada (${totalRecords} registros existentes)`;
      }

      console.log(resultMessage);
      
      // 🔥 MARCAR LOGIN COMO BEM-SUCEDIDO
      if (!RidesPersistentScraper.hasLoggedInSuccessfully) {
        RidesPersistentScraper.hasLoggedInSuccessfully = true;
        console.log('🔥 [RIDES-CONTROL] ✅ MARCANDO LOGIN COMO BEM-SUCEDIDO - Próximas execuções pularão login');
      }
      
      return {
        success: true,
        data: allData,
        message: resultMessage,
        sessionInfo: {
          isNewLogin: !browserWasActive,
          browserStatus: 'active',
          sessionValid: true
        },
        hasChanges: comparison.hasChanges,
        onlyNewData: true,
        differences: comparison.differences
      };
      
    } catch (error: any) {
      console.error('❌ Erro durante scraping persistente:', error);
      return {
        success: false,
        data: [],
        message: `❌ Erro durante scraping: ${error.message}`,
        sessionInfo: {
          isNewLogin: false,
          browserStatus: 'error',
          sessionValid: false
        }
      };
    }
  }

  /**
   * Scraping de uma página específica
   */
  public async scrapeSinglePage(pageName: string): Promise<PersistentScrapeResult> {
    try {
      const ridePage = this.ridesPages.find(page => 
        page.name.toLowerCase().includes(pageName.toLowerCase())
      );

      if (!ridePage) {
        return {
          success: false,
          data: [],
          message: `❌ Página '${pageName}' não encontrada. Páginas disponíveis: ${this.ridesPages.map(p => p.name).join(', ')}`
        };
      }

      // Garantir login
      const loginSuccess = await this.sessionManager.ensureLogin();
      if (!loginSuccess) {
        return {
          success: false,
          data: [],
          message: '❌ Falha no login'
        };
      }

      // Navegar e extrair dados
      await this.sessionManager.navigateToPage(ridePage.url);
      await this.delay(5000);
      
      const tableData = await this.sessionManager.extractTableData(ridePage.name);
      
      return {
        success: true,
        data: [tableData],
        message: `✅ Página '${ridePage.name}' processada: ${tableData.rows.length} registros`
      };

    } catch (error: any) {
      return {
        success: false,
        data: [],
        message: `❌ Erro ao processar página '${pageName}': ${error.message}`
      };
    }
  }

  /**
   * Força um novo login e limpa o cache
   */
  public async forceNewLogin(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🔄 Forçando novo login...');
      const success = await this.sessionManager.forceRelogin();
      
      return {
        success,
        message: success ? '✅ Novo login realizado com sucesso' : '❌ Falha no novo login'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: `❌ Erro ao forçar novo login: ${error.message}`
      };
    }
  }

  /**
   * Obtém status detalhado da sessão
   */
  public async getSessionStatus() {
    return await this.sessionManager.getSessionStatus();
  }

  /**
   * Executa limpeza completa (fechar browser e limpar cache)
   */
  public async cleanup(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧹 Executando limpeza completa...');
      
      this.sessionManager.clearSession();
      await this.sessionManager.closeBrowser();
      
      return {
        success: true,
        message: '✅ Limpeza completa realizada - browser fechado e sessão limpa'
      };
      
    } catch (error: any) {
      return {
        success: false,
        message: `❌ Erro durante limpeza: ${error.message}`
      };
    }
  }

  /**
   * Função auxiliar para delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Lista as páginas disponíveis para scraping
   */
  public getAvailablePages(): { name: string; url: string }[] {
    return this.ridesPages.map(page => ({
      name: page.name,
      url: page.url
    }));
  }

  /**
   * Aguarda que o usuário faça login manual
   */
  public async waitForManualLogin(timeoutMs: number = 300000): Promise<boolean> {
    return await this.sessionManager.waitForManualLogin(timeoutMs);
  }

  /**
   * Inicializa o navegador
   */
  public async initializeBrowser(): Promise<void> {
    return await this.sessionManager.initializeBrowser();
  }

  /**
   * Obtém a página atual
   */
  public getPage() {
    return this.sessionManager.getPage();
  }

  /**
   * Limpa o cache de dados (útil para testes)
   */
  public clearCache(): void {
    this.cacheManager.clearCache();
  }

  /**
   * Obtém estatísticas do cache
   */
  public getCacheStats() {
    return this.cacheManager.getCacheStats();
  }

  /**
   * Obtém payload otimizado para webhook (somente dados novos)
   */
  public getWebhookPayload(result: PersistentScrapeResult) {
    if (!result.hasChanges || !result.differences) {
      return null;
    }

    const comparison = this.cacheManager.compareAndGetDifferences(result.data);
    return {
      ...comparison.webhookPayload,
      sessionInfo: result.sessionInfo
    };
  }
}

// Instância singleton do scraper
let scraperInstance: RidesPersistentScraper | null = null;

/**
 * Função utilitária para obter a instância do scraper
 */
export function getPersistentScraper(): RidesPersistentScraper {
  if (!scraperInstance) {
    scraperInstance = new RidesPersistentScraper();
  }
  return scraperInstance;
}

/**
 * Função principal para compatibilidade com o sistema existente
 */
export async function scrapeAllRidesDataPersistent(skipLoginVerification: boolean = false): Promise<PersistentScrapeResult> {
  const scraper = getPersistentScraper();
  return await scraper.scrapeAllData(skipLoginVerification);
}
