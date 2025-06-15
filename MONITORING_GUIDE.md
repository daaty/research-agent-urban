# 🚀 Sistema de Monitoramento Automático - Rides Dashboard

## 📋 Funcionalidades

✅ **Scraping automático a cada 2,5 minutos**  
✅ **Detecção inteligente de mudanças**  
✅ **Integração com n8n webhook**  
✅ **Modo visual (HEADLESS_MODE=false)**  
✅ **Persistência de dados entre execuções**  
✅ **API REST para controle manual**  

## 🎯 Arquitetura

```
[Scraper A cada 2,5min] → [Detecta Mudanças] → [n8n Webhook] → [Google Sheets + WhatsApp]
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente (.env)
```bash
# Rides Dashboard
RIDES_LOGIN_URL=https://rides.ec2dashboard.com/#/page/login
RIDES_EMAIL=herbert@urbandobrasil.com.br
RIDES_PASSWORD=herbert@urban25

# n8n Integration
N8N_WEBHOOK_URL=https://n8n.rotadoscelulares.com/webhook/rideswebscrap

# Scraper Settings
SCRAPER_TIMEOUT=30000
HEADLESS_MODE=false  # IMPORTANTE: false para funcionar corretamente

# Server
PORT=3000
```

### 2. Scripts Disponíveis
```bash
# Iniciar monitoramento automático
npm run monitor

# Executar scraping único (teste)
npm run scrape-once

# Servidor de desenvolvimento
npm run dev
```

## 🚀 Como Usar

### Iniciar Monitoramento Automático
```bash
npm run monitor
```

O sistema irá:
1. ✅ Executar o primeiro scraping em 5 segundos
2. ✅ Continuar executando a cada 2,5 minutos
3. ✅ Detectar mudanças automaticamente
4. ✅ Enviar dados para n8n webhook
5. ✅ Salvar dados localmente para comparação

### API Endpoints

#### Status do Sistema
```
GET http://localhost:3000/
```

#### Executar Scraping Manual
```
POST http://localhost:3000/api/scrape-now
```

#### Parar Monitoramento
```
POST http://localhost:3000/api/stop-monitoring
```

#### Health Check
```
GET http://localhost:3000/health
```

## 📊 Payload para n8n

O webhook recebe um payload estruturado:

```json
{
  "timestamp": "2025-06-15T10:30:00.000Z",
  "totalRecords": 15,
  "hasChanges": true,
  "newRecords": [
    {
      "id": "abc123",
      "driver": "João Silva",
      "passenger": "Maria Santos",
      "status": "Programado",
      "date": "2025-06-15",
      "time": "14:30",
      "route": "Centro → Aeroporto"
    }
  ],
  "updatedRecords": [...],
  "cancelledRecords": [...],
  "completedRecords": [...],
  "summary": {
    "newCount": 2,
    "updatedCount": 1,
    "cancelledCount": 0,
    "completedCount": 3
  },
  "metadata": {
    "scraperVersion": "1.0.0",
    "source": "rides-dashboard",
    "environment": "production"
  }
}
```

## 🔍 Detecção de Mudanças

O sistema detecta automaticamente:

- **🆕 Registros Novos**: Corridas que apareceram
- **🔄 Status Alterado**: Mudanças de status (Programado → Cancelado)
- **❌ Cancelamentos**: Status contém "cancel"
- **✅ Conclusões**: Status contém "concluí" ou "finaliz"

## 📁 Estrutura de Dados

```
data/
└── previous-rides-data.json  # Dados da execução anterior
```

## 🛠️ Configuração n8n

### Workflow Sugerido:

1. **Webhook Node** - Recebe dados do scraper
2. **Switch Node** - Verifica se `hasChanges === true`
3. **Google Sheets Node** - Atualiza planilha
4. **WhatsApp Node** - Envia notificação se há mudanças

### Exemplo de Filtro n8n:
```javascript
// Verificar se há mudanças importantes
if ($json.hasChanges && 
    ($json.summary.newCount > 0 || 
     $json.summary.cancelledCount > 0 || 
     $json.summary.completedCount > 0)) {
  return $json;
}
```

## ⚡ Logs do Sistema

```
🚀 RIDES MONITORING SERVICE INICIADO
📡 Servidor rodando na porta 3000
⏰ Monitoramento: A cada 2,5 minutos
👀 Modo headless: false
🔗 Webhook n8n: https://n8n.rotadoscelulares.com/webhook/rideswebscrap

🕐 [15/06/2025 10:30:00] Iniciando scraping...
📊 Dados extraídos: 12 registros
🆕 Novos registros: 2
❌ Registros cancelados: 1
🚀 Enviando para n8n: {"newCount":2,"updatedCount":0,"cancelledCount":1,"completedCount":0}
✅ Dados enviados para n8n: 200
💾 Dados salvos: 12 registros
✅ [15/06/2025 10:30:15] Scraping concluído
```

## 🚨 Troubleshooting

### Problema: Não extrai dados
- ✅ Verificar `HEADLESS_MODE=false`
- ✅ Verificar credenciais no .env
- ✅ Testar com `npm run scrape-once`

### Problema: n8n não recebe dados
- ✅ Verificar URL do webhook
- ✅ Testar webhook manualmente
- ✅ Verificar logs do sistema

### Problema: Muitas notificações
- ✅ Ajustar filtros no n8n
- ✅ Verificar lógica de detecção de mudanças

## 🎯 Próximos Passos

1. ✅ Configurar workflow n8n completo
2. ✅ Testar integração Google Sheets
3. ✅ Configurar notificações WhatsApp
4. ✅ Ajustar filtros de notificação
5. ✅ Monitorar desempenho em produção

---

**Status**: ✅ Pronto para produção  
**Última atualização**: 15/06/2025
