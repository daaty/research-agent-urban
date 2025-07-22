import { Page, Browser } from 'playwright';
import { GeminiClient, WebAction, AIAnalysisRequest, GeminiResponse } from './geminiClient';

export interface AITaskResult {
  success: boolean;
  message: string;
  screenshots?: string[];
  data?: any;
  actions_executed?: WebAction[];
  error?: string;
}

export interface AINavigationConfig {
  maxRetries: number;
  screenshotOnError: boolean;
  waitTimeout: number;
  contextMemory: boolean;
}

export class AIBrowserManager {
  private page: Page | null = null;
  private browser: Browser | null = null;
  private geminiClient: GeminiClient;
  private config: AINavigationConfig;
  private actionHistory: WebAction[] = [];
  private contextMemory: string[] = [];

  constructor(geminiApiKey: string, config?: Partial<AINavigationConfig>) {
    this.geminiClient = new GeminiClient(geminiApiKey);
    this.config = {
      maxRetries: 3,
      screenshotOnError: true,
      waitTimeout: 30000,
      contextMemory: true,
      ...config
    };
  }

  /**
   * Inicializar browser com configurações otimizadas para AI
   */
  async initialize(browser: Browser, page: Page): Promise<void> {
    this.browser = browser;
    this.page = page;

    // Configurações para melhor análise de AI
    await this.page.setViewportSize({ width: 1920, height: 1080 });
    
    // Interceptar requests para otimizar performance
    await this.page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      // Bloquear recursos desnecessários para AI
      if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
        route.abort();
      } else {
        route.continue();
      }
    });

    console.log('🤖 AI Browser Manager inicializado');
  }

  /**
   * Executar comando de navegação via AI
   */
  async executeCommand(command: string, context?: string): Promise<AITaskResult> {
    if (!this.page) {
      return {
        success: false,
        message: 'Browser não inicializado',
        error: 'Browser not initialized'
      };
    }

    console.log(`🧠 Executando comando AI: "${command}"`);
    
    try {
      // 1. Capturar estado atual
      const currentUrl = this.page.url();
      const screenshot = await this.captureScreenshot();
      
      // 2. Analisar comando com Gemini
      const analysisRequest: AIAnalysisRequest = {
        command,
        screenshot,
        pageUrl: currentUrl,
        context: context || this.buildContext(),
        previousActions: this.actionHistory.slice(-5) // Últimas 5 ações
      };

      let geminiResponse: GeminiResponse;
      
      // Tentar análise visual primeiro se há screenshot
      if (screenshot) {
        geminiResponse = await this.geminiClient.analyzeScreenshot(
          screenshot, 
          command, 
          analysisRequest.context
        );
      } else {
        geminiResponse = await this.geminiClient.analyzeAndPlan(analysisRequest);
      }

      if (!geminiResponse.success) {
        return {
          success: false,
          message: 'Falha na análise AI',
          error: geminiResponse.error
        };
      }

      // 3. Executar ações planejadas
      const result = await this.executeActions(geminiResponse.actions || []);
      
      // 4. Atualizar contexto
      if (this.config.contextMemory) {
        this.updateContext(command, result.success);
      }

      return {
        success: result.success,
        message: geminiResponse.response || 'Comando executado',
        screenshots: [screenshot],
        actions_executed: geminiResponse.actions,
        data: result.data
      };

    } catch (error: any) {
      console.error('❌ Erro na execução do comando AI:', error);
      
      return {
        success: false,
        message: 'Erro na execução',
        error: error.message,
        screenshots: this.config.screenshotOnError ? [await this.captureScreenshot()] : undefined
      };
    }
  }

  /**
   * Executar sequência de ações
   */
  private async executeActions(actions: WebAction[]): Promise<{ success: boolean; data?: any }> {
    if (!this.page) return { success: false };

    let success = true;
    let collectedData: any = {};

    for (const action of actions) {
      try {
        console.log(`🎯 Executando ação: ${action.type}`);
        
        switch (action.type) {
          case 'navigate':
            if (action.url) {
              await this.page.goto(action.url, { waitUntil: 'networkidle' });
            }
            break;

          case 'click':
            if (action.selector) {
              await this.page.waitForSelector(action.selector, { timeout: 10000 });
              await this.page.click(action.selector);
            } else if (action.coordinates) {
              await this.page.mouse.click(action.coordinates.x, action.coordinates.y);
            }
            break;

          case 'type':
            if (action.selector && action.text) {
              await this.page.waitForSelector(action.selector, { timeout: 10000 });
              await this.page.fill(action.selector, action.text);
            }
            break;

          case 'scroll':
            if (action.selector) {
              await this.page.waitForSelector(action.selector);
              await this.page.locator(action.selector).scrollIntoViewIfNeeded();
            } else {
              await this.page.evaluate(() => {
                window.scrollBy(0, 500);
              });
            }
            break;

          case 'wait':
            const duration = action.duration || 2000;
            await this.page.waitForTimeout(duration);
            break;

          case 'screenshot':
            await this.captureScreenshot();
            break;

          default:
            console.warn(`⚠️ Ação não reconhecida: ${action.type}`);
        }

        // Adicionar ação ao histórico
        this.actionHistory.push(action);
        
        // Pequena pausa entre ações
        await this.page.waitForTimeout(500);

      } catch (error: any) {
        console.error(`❌ Erro na ação ${action.type}:`, error.message);
        success = false;
        
        // Tentar continuar com próxima ação em alguns casos
        if (action.type !== 'navigate') {
          continue;
        } else {
          break;
        }
      }
    }

    return { success, data: collectedData };
  }

  /**
   * Capturar screenshot para análise
   */
  private async captureScreenshot(): Promise<string> {
    if (!this.page) return '';

    try {
      const screenshot = await this.page.screenshot({
        type: 'png',
        fullPage: false // Só viewport visível para AI
      });
      
      return screenshot.toString('base64');
    } catch (error) {
      console.error('❌ Erro ao capturar screenshot:', error);
      return '';
    }
  }

  /**
   * Construir contexto para AI
   */
  private buildContext(): string {
    const context = [
      'Sistema: Research Agent Urban - Web Automation',
      `URL atual: ${this.page?.url() || 'unknown'}`,
      `Ações recentes: ${this.actionHistory.slice(-3).map(a => a.type).join(', ')}`
    ];

    if (this.contextMemory.length > 0) {
      context.push(`Contexto anterior: ${this.contextMemory.slice(-3).join('; ')}`);
    }

    return context.join('\n');
  }

  /**
   * Atualizar memória de contexto
   */
  private updateContext(command: string, success: boolean): void {
    const contextEntry = `${success ? '✅' : '❌'} ${command}`;
    this.contextMemory.push(contextEntry);
    
    // Manter apenas últimos 10 contextos
    if (this.contextMemory.length > 10) {
      this.contextMemory = this.contextMemory.slice(-10);
    }
  }

  /**
   * Extrair dados inteligentes da página
   */
  async extractData(instruction: string): Promise<AITaskResult> {
    if (!this.page) {
      return {
        success: false,
        message: 'Browser não inicializado'
      };
    }

    try {
      // Capturar screenshot e conteúdo da página
      const screenshot = await this.captureScreenshot();
      const pageContent = await this.page.content();
      
      // Usar AI para extrair dados específicos
      const response = await this.geminiClient.analyzeScreenshot(
        screenshot,
        `Extraia dados conforme solicitado: ${instruction}`,
        'Análise de dados da página web'
      );

      return {
        success: response.success,
        message: response.response || 'Dados extraídos',
        screenshots: [screenshot],
        data: response.response
      };

    } catch (error: any) {
      return {
        success: false,
        message: 'Erro na extração de dados',
        error: error.message
      };
    }
  }

  /**
   * Limpar histórico e contexto
   */
  clearHistory(): void {
    this.actionHistory = [];
    this.contextMemory = [];
    console.log('🧹 Histórico de ações limpo');
  }

  /**
   * Obter estatísticas do agente
   */
  getStats(): any {
    return {
      actions_executed: this.actionHistory.length,
      context_memory_size: this.contextMemory.length,
      last_actions: this.actionHistory.slice(-5),
      recent_context: this.contextMemory.slice(-3)
    };
  }
}
