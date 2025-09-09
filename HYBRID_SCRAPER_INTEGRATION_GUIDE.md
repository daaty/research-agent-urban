# 🔗 HYBRID SCRAPER DASHBOARD INTEGRATION GUIDE

## 📋 Visão Geral

O hybrid scraper foi integrado com sucesso ao sistema de dashboard multi-scraper existente. Este guia explica como usar e monitorar o sistema integrado.

## 🏗️ Arquitetura da Integração

### 🔧 Componentes Criados

1. **`hybridScraperIntegration.ts`** - Wrapper principal que integra o hybrid scraper ao dashboard
2. **`hybridScraperController.ts`** - Controller API para endpoints específicos do hybrid scraper  
3. **`hybridScraperRoutes.ts`** - Definição das rotas REST para o hybrid scraper
4. **`hybridScraperAPI.ts`** - Servidor standalone para o hybrid scraper

### 🔗 Pontos de Integração

- **Sistema de Status**: Registra automaticamente o hybrid scraper no `ScraperStatusService`
- **Dashboard Multi-Scraper**: Aparece na interface junto com outros scrapers
- **WebSocket**: Notificações em tempo real de atividade de scraping
- **PostgreSQL**: Usa o mesmo banco de dados para armazenamento unificado

## 🚀 Como Executar

### Modo 1: Integrado ao Dashboard Multi-Scraper

```bash
# No sistema principal
cd research-agent-urban/
export ENABLE_DASHBOARD=true
export RIDES_USERNAME=seu_usuario
npm run dev
```

O hybrid scraper será automaticamente registrado e visível no dashboard em `http://localhost:3000/dashboard`

### Modo 2: Standalone com API própria

```bash
# Como serviço independente
export RIDES_USERNAME=seu_usuario
export HYBRID_PORT=3001
npm run dev:hybrid
```

API disponível em `http://localhost:3001`

## 📊 Endpoints da API

### 🎯 Extração de Dados
```http
POST /api/hybrid/extract
Content-Type: application/json

{
  "driverIds": ["17147322", "17147323"],
  "useCache": true
}
```

### 💰 Processamento de Recarga
```http
POST /api/hybrid/recharge
Content-Type: application/json

{
  "driverId": "17147322",
  "amount": 100
}
```

### 🆔 Gerenciamento de IDs
```http
GET /api/hybrid/driver-ids?refresh=false
POST /api/hybrid/refresh-cache
```

### 📊 Status e Monitoramento
```http
GET /api/hybrid/status
GET /health
```

### 🎮 Operações em Lote
```http
POST /api/hybrid/batch-operation
Content-Type: application/json

{
  "operation": "both",
  "driverIds": ["17147322", "17147323"],
  "rechargeAmount": 100,
  "batchSize": 5
}
```

## 🎛️ Configuração do Dashboard

### Variáveis de Ambiente

```bash
# Essenciais
RIDES_USERNAME=seu_usuario_rides
RIDES_PASSWORD=sua_senha_rides
DASHBOARD_URL=https://rides.ec2dashboard.com/#/app/dashboard/

# Dashboard Integration
ENABLE_DASHBOARD=true          # Habilita integração com dashboard
HYBRID_PORT=3001              # Porta para modo standalone

# Configurações do Browser
HEADLESS_MODE=true            # Modo headless para produção
USER_DATA_DIR=./browser-data  # Diretório de dados do browser

# Database
DATABASE_URL=sua_url_postgresql
```

### Status Hierarchy

O sistema de status funciona na seguinte ordem de prioridade:

1. 🔴 **OFFLINE**: Sem heartbeat há > 15 minutos
2. ⚫ **ERROR**: Erros frequentes detectados  
3. 🟢 **ONLINE_ACTIVE**: Scraping ativo (heartbeat + activity recentes)
4. 🟡 **ONLINE_IDLE**: Online mas sem atividade de scraping
5. 🔵 **STARTING**: Iniciando (primeiros 5 minutos)

## 🔍 Monitoramento

### Métricas Coletadas

- **ridesScraped**: Número de corridas extraídas
- **driversScraped**: Número de motoristas processados
- **errorsCount**: Contagem de erros
- **successRate**: Taxa de sucesso (%)
- **responseTimeMs**: Tempo médio de resposta

### WebSocket Events

O sistema emite eventos WebSocket para atualizações em tempo real:

```javascript
// Conexão WebSocket
const socket = io('http://localhost:3000');

// Escutar eventos do hybrid scraper
socket.on('scraping-activity', (data) => {
  console.log('Hybrid scraper activity:', data);
});

socket.on('status-change', (data) => {
  console.log('Status changed:', data);
});
```

## 🎯 Dashboard Integration Features

### Registração Automática

Quando habilitado, o hybrid scraper:

1. **Registra-se automaticamente** no `ScraperStatusService`
2. **Gera ID único** baseado no `RIDES_USERNAME`
3. **Inicia heartbeat** a cada 30 segundos
4. **Aparece no dashboard** junto com outros scrapers

### Cache Integration

O sistema usa o `DriverIdProvider` existente:

- **Cache de 30 minutos** para IDs de motoristas
- **Refresh automático** quando necessário
- **Fallback para IDs reais** da Active Drivers page

### Data Storage

Integração com PostgreSQL:

- **Tabela unificada** `drivers_data` para todos os scrapers
- **Deduplicação por MD5** hash
- **Timestamping** automático
- **Métricas por scraper** separadas

## 🔧 Customização

### Adicionando Novos Endpoints

1. Adicione método no `HybridScraperController`
2. Registre rota no `hybridScraperRoutes.ts`
3. Teste com `npm run dev:hybrid`

### Modificando Métricas

Edite `hybridScraperIntegration.ts`:

```typescript
private notifyActivity(type: 'ride' | 'driver' | 'recharge' | 'error', details?: any): void {
  // Suas modificações de métricas aqui
}
```

### Dashboard UI Components

Para modificar a interface do dashboard:

1. Navegue para `research-agent-urban/dashboard-frontend/`
2. Edite componentes React em `src/components/`
3. O hybrid scraper aparecerá automaticamente na lista

## 🐛 Troubleshooting

### Problema: Hybrid scraper não aparece no dashboard

**Solução:**
```bash
# Verificar se dashboard está habilitado
export ENABLE_DASHBOARD=true

# Verificar logs de registração
grep "HybridIntegration" logs/app.log
```

### Problema: Erro de conexão com banco

**Solução:**
```bash
# Testar conexão PostgreSQL
npm run test:database

# Verificar variáveis de ambiente
echo $DATABASE_URL
```

### Problema: Browser não inicializa

**Solução:**
```bash
# Reinstalar browsers
npm run install-browsers

# Verificar modo headless
export HEADLESS_MODE=true
```

## 📈 Performance Optimization

### Timing Configuration

O sistema usa timings otimizados:

- **Digitação**: `type()` ao invés de `fill()` para 500ms natural
- **Cliques**: Verificação de 15s timeout com retry
- **Navegação**: Espera inteligente por carregamento de dados
- **Entre operações**: Delay variável de 3-5s para simular humano

### Batch Processing

Para alto volume:

```typescript
// Processar em lotes de 10
const batchSize = 10;
const results = await hybridController.batchOperation(req, res);
```

## 🔐 Segurança

- **Autenticação**: Usa cookies de sessão persistentes
- **Rate Limiting**: Delays automáticos entre operações
- **Error Handling**: Logs detalhados sem exposer senhas
- **Data Validation**: Validação de entrada em todos os endpoints

## 📚 Exemplos de Uso

### Extração Completa de Motoristas

```bash
curl -X POST http://localhost:3001/api/hybrid/extract \
  -H "Content-Type: application/json" \
  -d '{"driverIds": ["17147322", "17147323"], "useCache": true}'
```

### Recarga em Lote

```bash
curl -X POST http://localhost:3001/api/hybrid/batch-operation \
  -H "Content-Type: application/json" \
  -d '{
    "operation": "recharge",
    "driverIds": ["17147322"],
    "rechargeAmount": 100,
    "batchSize": 1
  }'
```

### Monitoramento de Status

```bash
# Status geral
curl http://localhost:3001/api/hybrid/status

# Health check
curl http://localhost:3001/health
```

## ✅ Checklist de Integração

- [x] Sistema de status integrado
- [x] API endpoints funcionais  
- [x] Dashboard registration automático
- [x] WebSocket notifications
- [x] PostgreSQL integration
- [x] Error handling robusto
- [x] Timing optimization
- [x] Cache management
- [x] Batch operations
- [x] Health monitoring
- [x] Documentation completa

## 🎉 Resultado Final

O hybrid scraper agora:

1. **Aparece automaticamente** no dashboard multi-scraper
2. **Tem sua própria API** para controle granular
3. **Integra com o banco PostgreSQL** existente
4. **Reporta métricas em tempo real** via WebSocket
5. **Pode ser monitorado** junto com outros scrapers
6. **Suporta operações em lote** para eficiência
7. **Mantém timing otimizado** para estabilidade
8. **Fornece health checks** para deployment

A integração está **completa e pronta para produção**! 🚀
