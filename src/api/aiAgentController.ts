import { Request, Response } from 'express';
import { AIBrowserManager } from '../services/aiBrowserManager';
import { BrowserSessionManager } from '../services/browserSessionManager';

export class AIAgentController {
  private aiBrowserManager: AIBrowserManager | null = null;
  private browserSessionManager: BrowserSessionManager;

  constructor() {
    this.browserSessionManager = BrowserSessionManager.getInstance();
  }

  /**
   * Inicializar AI Agent
   */
  initializeAI = async (req: Request, res: Response) => {
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      
      if (!geminiApiKey) {
        return res.status(400).json({
          success: false,
          message: 'GEMINI_API_KEY não configurada'
        });
      }

      // Inicializar browser se necessário
      if (!this.browserSessionManager.isActive()) {
        await this.browserSessionManager.initializeBrowser();
      }

      // Inicializar AI Browser Manager
      this.aiBrowserManager = new AIBrowserManager(geminiApiKey, {
        maxRetries: 3,
        screenshotOnError: true,
        waitTimeout: 30000,
        contextMemory: true
      });

      // Garantir que o browser está inicializado
      let page = this.browserSessionManager.getPage();
      let browser = this.browserSessionManager.getBrowser();

      if (!page || !browser) {
        console.log('🔄 Browser não inicializado, inicializando...');
        // Usar o scraper para inicializar o browser
        const { getPersistentScraper } = require('../scraper/ridesPersistentScraper');
        const scraper = getPersistentScraper();
        await scraper.initializeBrowser();
        
        page = this.browserSessionManager.getPage();
        browser = this.browserSessionManager.getBrowser();
      }

      if (!page) {
        throw new Error('Falha ao obter instância da página após inicialização');
      }

      // Para agora, vamos aceitar browser como null se necessário
      if (!browser) {
        console.log('⚠️ Browser instance não disponível, usando context proxy');
        browser = null;
      }

      await this.aiBrowserManager.initialize(browser!, page);

      res.json({
        success: true,
        message: '🤖 AI Agent inicializado com sucesso',
        status: 'ready',
        capabilities: [
          'navegação inteligente',
          'análise visual de páginas',
          'extração de dados',
          'automação complexa',
          'comandos em linguagem natural'
        ]
      });

    } catch (error: any) {
      console.error('❌ Erro ao inicializar AI Agent:', error);
      res.status(500).json({
        success: false,
        message: 'Erro na inicialização',
        error: error.message
      });
    }
  };

  /**
   * Executar comando via AI
   */
  executeCommand = async (req: Request, res: Response) => {
    try {
      if (!this.aiBrowserManager) {
        return res.status(400).json({
          success: false,
          message: 'AI Agent não inicializado. Use /api/ai/initialize primeiro'
        });
      }

      const { command, context } = req.body;

      if (!command) {
        return res.status(400).json({
          success: false,
          message: 'Comando é obrigatório'
        });
      }

      console.log(`🧠 Comando recebido: "${command}"`);

      const result = await this.aiBrowserManager.executeCommand(command, context);

      res.json({
        success: result.success,
        message: result.message,
        data: result.data,
        screenshots: result.screenshots,
        actions_executed: result.actions_executed,
        error: result.error,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Erro na execução do comando:', error);
      res.status(500).json({
        success: false,
        message: 'Erro na execução',
        error: error.message
      });
    }
  };

  /**
   * Navegar para URL via AI
   */
  navigateToUrl = async (req: Request, res: Response) => {
    try {
      if (!this.aiBrowserManager) {
        return res.status(400).json({
          success: false,
          message: 'AI Agent não inicializado'
        });
      }

      const { url, task } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          message: 'URL é obrigatória'
        });
      }

      const command = task 
        ? `Navegue para ${url} e ${task}`
        : `Navegue para ${url}`;

      const result = await this.aiBrowserManager.executeCommand(command);

      res.json({
        success: result.success,
        message: result.message,
        url: url,
        task_completed: result.success,
        screenshots: result.screenshots,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Erro na navegação:', error);
      res.status(500).json({
        success: false,
        message: 'Erro na navegação',
        error: error.message
      });
    }
  };

  /**
   * Extrair dados via AI
   */
  extractData = async (req: Request, res: Response) => {
    try {
      if (!this.aiBrowserManager) {
        return res.status(400).json({
          success: false,
          message: 'AI Agent não inicializado'
        });
      }

      const { instruction, format } = req.body;

      if (!instruction) {
        return res.status(400).json({
          success: false,
          message: 'Instrução de extração é obrigatória'
        });
      }

      const fullInstruction = format 
        ? `${instruction} - Formato: ${format}`
        : instruction;

      const result = await this.aiBrowserManager.extractData(fullInstruction);

      res.json({
        success: result.success,
        message: result.message,
        instruction: instruction,
        extracted_data: result.data,
        screenshots: result.screenshots,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Erro na extração de dados:', error);
      res.status(500).json({
        success: false,
        message: 'Erro na extração',
        error: error.message
      });
    }
  };

  /**
   * Analisar página atual
   */
  analyzePage = async (req: Request, res: Response) => {
    try {
      if (!this.aiBrowserManager) {
        return res.status(400).json({
          success: false,
          message: 'AI Agent não inicializado'
        });
      }

      const { question } = req.body;
      const defaultQuestion = question || 'Analise esta página e me diga o que vê';

      const result = await this.aiBrowserManager.executeCommand(
        `Analise a página atual: ${defaultQuestion}`
      );

      res.json({
        success: result.success,
        analysis: result.message,
        page_data: result.data,
        screenshots: result.screenshots,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Erro na análise da página:', error);
      res.status(500).json({
        success: false,
        message: 'Erro na análise',
        error: error.message
      });
    }
  };

  /**
   * Obter status do AI Agent
   */
  getStatus = async (req: Request, res: Response) => {
    try {
      const isInitialized = this.aiBrowserManager !== null;
      const browserActive = this.browserSessionManager.isActive();
      
      let stats = {};
      if (this.aiBrowserManager) {
        stats = this.aiBrowserManager.getStats();
      }

      res.json({
        success: true,
        ai_agent_initialized: isInitialized,
        browser_active: browserActive,
        current_url: browserActive ? this.browserSessionManager.getPage()?.url() : null,
        stats: stats,
        capabilities: {
          natural_language_commands: true,
          visual_analysis: true,
          data_extraction: true,
          smart_navigation: true,
          context_memory: true
        },
        example_commands: [
          'Faça login no sistema com email herbert@urban.com',
          'Navegue até a página de relatórios',
          'Extraia todos os dados de corridas da tabela',
          'Analise os dados e me diga quantas corridas foram canceladas',
          'Procure por informações de faturamento'
        ]
      });

    } catch (error: any) {
      console.error('❌ Erro ao obter status:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao obter status',
        error: error.message
      });
    }
  };

  /**
   * Limpar histórico do AI Agent
   */
  clearHistory = async (req: Request, res: Response) => {
    try {
      if (!this.aiBrowserManager) {
        return res.status(400).json({
          success: false,
          message: 'AI Agent não inicializado'
        });
      }

      this.aiBrowserManager.clearHistory();

      res.json({
        success: true,
        message: '🧹 Histórico de ações limpo',
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Erro ao limpar histórico:', error);
      res.status(500).json({
        success: false,
        message: 'Erro ao limpar histórico',
        error: error.message
      });
    }
  };

  /**
   * Exemplo de automação complexa
   */
  complexAutomation = async (req: Request, res: Response) => {
    try {
      if (!this.aiBrowserManager) {
        return res.status(400).json({
          success: false,
          message: 'AI Agent não inicializado'
        });
      }

      const { workflow } = req.body;

      if (!workflow) {
        return res.status(400).json({
          success: false,
          message: 'Workflow é obrigatório'
        });
      }

      // Exemplo de workflow complexo
      const command = `Execute o seguinte workflow: ${workflow}. 
        Documente cada passo e colete dados relevantes.`;

      const result = await this.aiBrowserManager.executeCommand(command);

      res.json({
        success: result.success,
        workflow_result: result.message,
        collected_data: result.data,
        execution_log: result.actions_executed,
        screenshots: result.screenshots,
        timestamp: new Date().toISOString()
      });

    } catch (error: any) {
      console.error('❌ Erro na automação complexa:', error);
      res.status(500).json({
        success: false,
        message: 'Erro na automação',
        error: error.message
      });
    }
  };
}
