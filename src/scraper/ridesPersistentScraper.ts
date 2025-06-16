import { BrowserSessionManager } from '../services/browserSessionManager';

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
}

export class RidesPersistentScraper {
  private sessionManager: BrowserSessionManager;
  private ridesPages = [
    { name: 'Ongoing Rides', url: 'https://rides.ec2dashboard.com/#/app/ongoing-rides/' },
    { name: 'Scheduled Rides', url: 'https://rides.ec2dashboard.com/#/app/scheduled-rides/' },
    { name: 'Completed Rides', url: 'https://rides.ec2dashboard.com/#/app/completed-rides/' },
    { name: 'Cancelled Rides', url: 'https://rides.ec2dashboard.com/#/app/cancelled-rides/4/' },
    { name: 'Missed Rides', url: 'https://rides.ec2dashboard.com/#/app/missed-rides/3/' }
  ];

  constructor() {
    this.sessionManager = BrowserSessionManager.getInstance();
  }

  /**
   * Executa scraping usando sessão persistente
   */
  public async scrapeAllData(): Promise<PersistentScrapeResult> {
    try {
      console.log('🚀 Iniciando scraping com sessão persistente...');
      
      // Verificar status do browser antes de começar
      const browserWasActive = this.sessionManager.isActive();
      
      // Garantir que está logado
      const loginSuccess = await this.sessionManager.ensureLogin();
      
      if (!loginSuccess) {
        return {
          success: false,
          data: [],
          message: '❌ Falha no login - não foi possível autenticar',
          sessionInfo: {
            isNewLogin: false,
            browserStatus: 'login_failed',
            sessionValid: false
          }
        };
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
      
      return {
        success: true,
        data: allData,
        message: `✅ Scraping concluído! ${allData.length} páginas processadas, ${totalRecords} registros extraídos.`,
        sessionInfo: {
          isNewLogin: !browserWasActive,
          browserStatus: 'active',
          sessionValid: true
        }
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
   * Retorna informações sobre o status da sessão
   */
  public async getSessionStatus(): Promise<{
    browserActive: boolean;
    sessionValid: boolean;
    message: string;
    availablePages: string[];
  }> {
    const browserActive = this.sessionManager.isActive();
    
    return {
      browserActive,
      sessionValid: browserActive, // Simplificado por enquanto
      message: browserActive ? 
        '✅ Browser ativo e sessão válida' : 
        '⚠️ Browser inativo - será inicializado no próximo scraping',
      availablePages: this.ridesPages.map(page => page.name)
    };
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
export async function scrapeAllRidesDataPersistent(): Promise<PersistentScrapeResult> {
  const scraper = getPersistentScraper();
  return await scraper.scrapeAllData();
}
