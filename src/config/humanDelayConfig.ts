/**
 * Configurações de delays humanos para simular comportamento natural de navegação
 */

export interface HumanDelayConfig {
  // Delays entre extrações de motoristas
  betweenExtractions: {
    min: number;
    max: number;
  };
  
  // Delays pós-extração (processamento)
  postExtraction: {
    min: number;
    max: number;
  };
  
  // Delays para preenchimento de campos
  fieldFilling: {
    beforeFill: {
      min: number;
      max: number;
    };
    betweenClearAndFill: number;
    afterFill: {
      min: number;
      max: number;
    };
  };
  
  // Delays para cliques em botões
  buttonClicks: {
    beforeClick: {
      min: number;
      max: number;
    };
    afterClick: {
      min: number;
      max: number;
    };
  };
  
  // Delays para carregamento de página
  pageLoading: {
    afterNavigation: number;
    angularJSLoading: number;
    dataStabilization: number;
  };
  
  // Delays baseados na carga do sistema
  loadBasedDelays: {
    lowLoad: { // < 30% da capacidade
      min: number;
      max: number;
    };
    mediumLoad: { // 30-70% da capacidade
      min: number;
      max: number;
    };
    highLoad: { // > 70% da capacidade
      min: number;
      max: number;
    };
  };
  
  // Delays escalonados para processamento simultâneo
  staggeredProcessing: {
    min: number;
    max: number;
  };
}

/**
 * Configuração padrão de delays humanos
 */
export const DEFAULT_HUMAN_DELAY_CONFIG: HumanDelayConfig = {
  betweenExtractions: {
    min: 8000,   // 8 segundos
    max: 20000   // 20 segundos
  },
  
  postExtraction: {
    min: 3000,   // 3 segundos
    max: 8000    // 8 segundos
  },
  
  fieldFilling: {
    beforeFill: {
      min: 1500,   // 1.5 segundos
      max: 3000    // 3 segundos
    },
    betweenClearAndFill: 800,  // 800ms
    afterFill: {
      min: 1000,   // 1 segundo
      max: 2500    // 2.5 segundos
    }
  },
  
  buttonClicks: {
    beforeClick: {
      min: 1500,   // 1.5 segundos
      max: 3500    // 3.5 segundos
    },
    afterClick: {
      min: 2000,   // 2 segundos
      max: 4000    // 4 segundos
    }
  },
  
  pageLoading: {
    afterNavigation: 5000,     // 5 segundos após navegação
    angularJSLoading: 5000,    // 5 segundos para AngularJS carregar
    dataStabilization: 3000    // 3 segundos para dados estabilizarem
  },
  
  loadBasedDelays: {
    lowLoad: {
      min: 1000,   // 1 segundo
      max: 2000    // 2 segundos
    },
    mediumLoad: {
      min: 2000,   // 2 segundos
      max: 4000    // 4 segundos
    },
    highLoad: {
      min: 4000,   // 4 segundos
      max: 8000    // 8 segundos
    }
  },
  
  staggeredProcessing: {
    min: 1500,   // 1.5 segundos
    max: 4000    // 4 segundos
  }
};

/**
 * Gerador de delays humanos com distribuição natural
 */
export class HumanDelayGenerator {
  private config: HumanDelayConfig;
  
  constructor(config: HumanDelayConfig = DEFAULT_HUMAN_DELAY_CONFIG) {
    this.config = config;
  }
  
  /**
   * Gera delay humano aleatório entre min e max com distribuição normal-ish
   */
  public generateDelay(min: number, max: number): number {
    // Usar distribuição beta para simular comportamento humano mais realista
    const beta1 = 2; // Skew para valores médios
    const beta2 = 5; // Concentração
    
    const random1 = Math.random();
    const random2 = Math.random();
    
    // Aproximação da distribuição beta usando duas variáveis uniformes
    const betaValue = Math.pow(random1, 1/beta1) * Math.pow(random2, 1/beta2);
    const normalizedValue = betaValue / (betaValue + Math.pow(1 - betaValue, beta2/beta1));
    
    // Mapear para o range desejado
    const delay = min + (max - min) * normalizedValue;
    
    // Adicionar pequena variação aleatória (±5%)
    const variation = (Math.random() - 0.5) * 0.1 * delay;
    
    return Math.round(Math.max(min, Math.min(max, delay + variation)));
  }
  
  /**
   * Gera delay entre extrações
   */
  public getBetweenExtractionsDelay(): number {
    return this.generateDelay(
      this.config.betweenExtractions.min,
      this.config.betweenExtractions.max
    );
  }
  
  /**
   * Gera delay pós-extração
   */
  public getPostExtractionDelay(): number {
    return this.generateDelay(
      this.config.postExtraction.min,
      this.config.postExtraction.max
    );
  }
  
  /**
   * Gera delay antes de preencher campo
   */
  public getBeforeFieldFillDelay(): number {
    return this.generateDelay(
      this.config.fieldFilling.beforeFill.min,
      this.config.fieldFilling.beforeFill.max
    );
  }
  
  /**
   * Gera delay entre limpar e preencher campo
   */
  public getBetweenClearAndFillDelay(): number {
    return this.config.fieldFilling.betweenClearAndFill;
  }
  
  /**
   * Gera delay após preencher campo
   */
  public getAfterFieldFillDelay(): number {
    return this.generateDelay(
      this.config.fieldFilling.afterFill.min,
      this.config.fieldFilling.afterFill.max
    );
  }
  
  /**
   * Gera delay antes de clicar botão
   */
  public getBeforeClickDelay(): number {
    return this.generateDelay(
      this.config.buttonClicks.beforeClick.min,
      this.config.buttonClicks.beforeClick.max
    );
  }
  
  /**
   * Gera delay após clicar botão
   */
  public getAfterClickDelay(): number {
    return this.generateDelay(
      this.config.buttonClicks.afterClick.min,
      this.config.buttonClicks.afterClick.max
    );
  }
  
  /**
   * Gera delay baseado na carga do sistema
   */
  public getLoadBasedDelay(loadPercentage: number): number {
    if (loadPercentage < 0.3) {
      return this.generateDelay(
        this.config.loadBasedDelays.lowLoad.min,
        this.config.loadBasedDelays.lowLoad.max
      );
    } else if (loadPercentage < 0.7) {
      return this.generateDelay(
        this.config.loadBasedDelays.mediumLoad.min,
        this.config.loadBasedDelays.mediumLoad.max
      );
    } else {
      return this.generateDelay(
        this.config.loadBasedDelays.highLoad.min,
        this.config.loadBasedDelays.highLoad.max
      );
    }
  }
  
  /**
   * Gera delay para processamento escalonado
   */
  public getStaggeredProcessingDelay(): number {
    return this.generateDelay(
      this.config.staggeredProcessing.min,
      this.config.staggeredProcessing.max
    );
  }
  
  /**
   * Atualiza configuração
   */
  public updateConfig(newConfig: Partial<HumanDelayConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
  
  /**
   * Obtém configuração atual
   */
  public getConfig(): HumanDelayConfig {
    return { ...this.config };
  }
}

/**
 * Instância global do gerador de delays humanos
 */
export const humanDelayGenerator = new HumanDelayGenerator();
