# Sistema de Operação Híbrida - Extração de Dados + Recargas de Crédito

## 📋 Visão Geral

O Sistema de Operação Híbrida é uma solução inteligente que maximiza a produtividade do browser automatizando simultaneamente:

1. **Extração Contínua**: Coleta dados pessoais de motoristas por ID de forma ininterrupta
2. **Recargas por Interrupção**: Processa solicitações de recarga de crédito via API quando necessário
3. **Operação Inteligente**: Alterna automaticamente entre modos para otimizar o uso do browser

## 🎯 Conceito Principal

**"Sempre produzindo valor"** - O sistema nunca fica ocioso:
- **Modo Padrão**: Extração contínua de dados pessoais (informações valiosas)
- **Modo Interrupção**: Processamento de recargas quando solicitado
- **Retomada Automática**: Volta para extração após completar recargas

## 🏗️ Arquitetura

### Fase 1: Infraestrutura (✅ CONCLUÍDA)

#### 1. BrowserSessionManager Multi-instância
- **Arquivo**: `src/browser/browserSessionManager.ts`
- **Função**: Gerencia múltiplas instâncias isoladas de browser
- **Recursos**:
  - Instâncias nomeadas com isolamento completo
  - Diretórios de dados separados por instância
  - Suporte para browser de monitoramento + browser híbrido

#### 2. Sistema de Filas com Prioridade
- **DriverIdQueue** (`src/queue/driverIdQueue.ts`):
  - Gerencia fila de IDs para extração
  - Prioridade alta/normal
  - Sistema de retry automático
  - Estatísticas detalhadas

- **RechargeQueue** (`src/queue/rechargeQueue.ts`):
  - Gerencia solicitações de recarga
  - Prioridade urgente/normal
  - Controle de status (pending/processing/completed/failed)
  - Limpeza automática de requests antigos

#### 3. Gerenciamento de Estado Persistente
- **Arquivo**: `src/queue/operationStateManager.ts`
- **Função**: Persiste estado da operação para recuperação
- **Recursos**:
  - Salvamento automático do estado atual
  - Recuperação após reinicializações
  - Snapshot das filas
  - Informações de sessão

#### 4. Schema de Banco de Dados
- **Arquivo**: `src/database/schema/driver_personal_details.sql`
- **Tabela**: `driver_personal_details`
- **Campos**: Dados pessoais completos, bancários, documentação, metadados
- **Views**: Dados básicos e estatísticas de extração

### Fase 2: Serviço de Operação Híbrida (✅ CONCLUÍDA)

#### HybridOperationService
- **Arquivo**: `src/services/hybridOperationService.ts`
- **Função**: Orquestra operação híbrida inteligente

**Características Principais**:
- **Modo Adaptativo**: Alterna automaticamente entre extração e recarga
- **Detecção de Urgência**: Prioriza recargas urgentes interrompendo extração
- **Processamento em Lote**: Extração e recargas em lotes otimizados
- **Recuperação Automática**: Retoma estado após falhas
- **Monitoramento**: Estatísticas em tempo real

## 🔄 Fluxo de Operação

### Ciclo Normal
1. **Início**: Sistema inicia em modo extração
2. **Processamento**: Extrai dados de motoristas em lote
3. **Verificação**: Checa periodicamente por recargas pendentes
4. **Continuação**: Continua extração se não há recargas

### Ciclo de Interrupção
1. **Detecção**: Identifica recargas pendentes/urgentes
2. **Pausa**: Interrompe extração atual
3. **Salvamento**: Salva estado da extração
4. **Processamento**: Processa recargas em lote
5. **Retomada**: Volta para extração de onde parou

### Lógica de Prioridade
- **Recargas Urgentes**: Interrompem imediatamente
- **Recargas Normais**: Aguardam fim do lote atual
- **Threshold**: Configura quantas recargas pausam extração
- **Lote Máximo**: Limita recargas processadas por vez

## 📊 Configuração

```typescript
const config = {
  extractionBatchSize: 5,        // Motoristas por lote de extração
  rechargePauseThreshold: 2,     // Recargas para pausar extração
  maxConcurrentRecharges: 3,     // Recargas máximas por lote
  stateCheckInterval: 5000,      // Intervalo de verificação (ms)
  recoveryOnStart: true          // Recuperar estado ao iniciar
};
```

## 🚀 Como Usar

### Iniciando o Sistema
```typescript
import { HybridOperationService } from './src/services/hybridOperationService';

const hybridService = HybridOperationService.getInstance(config);
await hybridService.start();
```

### Adicionando Motoristas para Extração
```typescript
// Prioridade normal
hybridService.addDriverToQueue('DRV001', 'normal');

// Alta prioridade
hybridService.addDriverToQueue('DRV002', 'high');
```

### Adicionando Recargas
```typescript
// Recarga normal
hybridService.addRechargeToQueue('DRV003', 50.00, false);

// Recarga urgente (interrompe extração)
hybridService.addRechargeToQueue('DRV004', 100.00, true);
```

### Monitoramento
```typescript
// Estatísticas gerais
const stats = hybridService.getStats();
console.log(`Modo atual: ${stats.currentMode}`);
console.log(`Extraídos: ${stats.totalExtracted}`);
console.log(`Recargas: ${stats.totalRecharges}`);

// Status das filas
const queueStatus = hybridService.getQueueStatus();
console.log(`Fila extração: ${queueStatus.drivers.total}`);
console.log(`Fila recargas: ${queueStatus.recharges.pending}`);
```

### Parando o Sistema
```typescript
await hybridService.stop();
```

## 🧪 Teste do Sistema

Execute o teste completo:
```bash
npx ts-node test-hybrid-system.ts
```

Teste de recuperação de estado:
```bash
npx ts-node test-hybrid-system.ts recovery
```

### Cenários de Teste
1. **Extração Contínua**: Adiciona motoristas e processa normalmente
2. **Interrupção por Recargas**: Simula chegada de recargas durante extração
3. **Priorização Urgente**: Testa interrupção imediata por recargas urgentes
4. **Recuperação de Estado**: Verifica persistência e recuperação

## 📈 Benefícios

### Produtividade Máxima
- **Zero Tempo Ocioso**: Browser sempre processando algo valioso
- **Extração Contínua**: Coleta dados pessoais constantemente
- **Resposta Rápida**: Recargas processadas sob demanda

### Flexibilidade Operacional
- **Priorização Inteligente**: Urgências tratadas imediatamente
- **Configuração Adaptável**: Parâmetros ajustáveis por cenário
- **Recuperação Robusta**: Resiste a falhas e reinicializações

### Otimização de Recursos
- **Browser Único**: Uma única instância para ambas operações
- **Lotes Eficientes**: Processamento otimizado por tipo
- **Persistência de Estado**: Minimiza perdas em falhas

## 🔧 Estrutura de Arquivos

```
src/
├── browser/
│   └── browserSessionManager.ts    # Gerenciamento de browsers multi-instância
├── queue/
│   ├── driverIdQueue.ts           # Fila de IDs para extração
│   ├── rechargeQueue.ts           # Fila de recargas
│   └── operationStateManager.ts   # Persistência de estado
├── services/
│   └── hybridOperationService.ts  # Orquestrador principal
└── database/
    └── schema/
        └── driver_personal_details.sql # Schema da tabela de dados

test-hybrid-system.ts              # Teste completo do sistema
```

## 🎯 Próximos Passos

### Fase 3: Integração Browser Real
- [ ] Implementar extração real de dados pessoais
- [ ] Integrar com sistema de recargas existente
- [ ] Adicionar detecção de captcha
- [ ] Implementar tratamento de erros específicos

### Fase 4: Otimizações
- [ ] Cache inteligente de dados extraídos
- [ ] Detecção de duplicatas
- [ ] Balanceamento de carga automático
- [ ] Métricas avançadas de performance

### Fase 5: Monitoramento
- [ ] Dashboard em tempo real
- [ ] Alertas automáticos
- [ ] Relatórios de produtividade
- [ ] Análise de padrões de uso

## 📋 Status Atual

**✅ FASE 1 CONCLUÍDA**: Infraestrutura completa implementada
- BrowserSessionManager multi-instância
- Sistema de filas com prioridade
- Gerenciamento de estado persistente
- Schema de banco de dados

**✅ FASE 2 CONCLUÍDA**: Serviço de operação híbrida funcional
- HybridOperationService implementado
- Lógica de interrupção/retomada
- Sistema de monitoramento
- Testes automatizados

**🎯 PRONTO PARA FASE 3**: Integração com browser real e APIs de recarga

## 💡 Filosofia do Sistema

**"Inteligência na Interrupção"** - O sistema foi projetado para ser inteligente sobre quando parar e quando continuar, maximizando o valor extraído do browser enquanto mantém responsividade para operações urgentes.

O resultado é um sistema que **nunca desperdiça tempo**, sempre extraindo dados valiosos quando não há recargas para processar, mas capaz de responder instantaneamente quando necessário.
