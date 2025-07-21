# 🐳 DOCKER DEPLOY - RESEARCH AGENT URBAN

## 🚀 Deploy via Portainer Stack

### **1. Configurar no Portainer**

1. **Acessar**: Portainer → Stacks → Add Stack
2. **Nome**: `research-agent-urban`
3. **Método**: Git Repository
4. **Repository URL**: `https://github.com/daaty/research-agent-urban.git`
5. **Reference**: `refs/heads/main`
6. **Compose Path**: `docker-compose.yml`

### **2. Variáveis de Ambiente (OBRIGATÓRIAS)**

```env
# 🔑 CREDENCIAIS
RIDES_USERNAME=seu_usuario_rides
RIDES_PASSWORD=sua_senha_rides
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/webhook-id

# ⚙️ OPCIONAIS (valores padrão)
RIDES_LOGIN_URL=https://carreira.ridesapp.com.br/driver/login
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000
SCRAPE_INTERVAL=15
MAX_RETRIES=3
CACHE_ENABLED=true
PORT=3000
```

### **3. Preparar Servidor VPS**

```bash
# Criar diretórios para volumes
sudo mkdir -p /opt/research-agent-urban/{data,browser-data,cache}
sudo chown -R 1000:1000 /opt/research-agent-urban
```

### **4. Deploy**

Clicar em **"Deploy the Stack"** e aguardar build (3-5 minutos).

## 📊 MONITORAMENTO

### **Endpoints Disponíveis**

- **Health Check**: `http://localhost:3000/health`
- **Status Detalhado**: `http://localhost:3000/status`

### **Verificar Status**

```bash
# Container rodando
docker ps | grep research-agent-urban

# Logs em tempo real
docker logs -f research-agent-urban

# Testar health check
curl http://localhost:3000/health
```

### **Exemplo Response Health Check**

```json
{
  "status": "ok",
  "service": "Research Agent Urban",
  "version": "2.0.0",
  "timestamp": "2025-06-16T10:30:00.000Z",
  "uptime": 1800.5,
  "isRunning": true,
  "lastExecution": "2025-06-16T10:29:45.000Z",
  "executionCount": 12,
  "webhookConfigured": true
}
```

## 🔧 CONFIGURAÇÕES

### **Recursos do Container**

- **Memória**: 1GB limite / 512MB reservado
- **CPU**: 0.5 core limite / 0.25 core reservado

### **Volumes Persistentes**

- `data/` → Cache e dados
- `browser-data/` → Sessões do navegador
- `cache/` → Cache do sistema

### **Execução Automática**

- **Intervalo**: 2,5 minutos
- **Cache Inteligente**: Só envia quando há mudanças
- **Retry Automático**: Até 3 tentativas

## 🚨 TROUBLESHOOTING

### **Build Falha**

```bash
# Verificar logs do build
docker logs --details research-agent-urban

# Build manual local para debug
docker build -t research-agent-urban .
```

### **Container Não Inicia**

```bash
# Verificar variáveis obrigatórias
docker exec research-agent-urban env | grep RIDES

# Verificar permissões
sudo chown -R 1000:1000 /opt/research-agent-urban
```

### **Erro de Navegador**

```bash
# Verificar Chromium
docker exec research-agent-urban chromium-browser --version

# Verificar X11 Display
docker exec research-agent-urban echo $DISPLAY
```

### **Problemas de Webhook**

1. Verificar URL do webhook no n8n
2. Testar conectividade: `curl -X POST <webhook-url>`
3. Verificar logs do auto-scraper

### **Reiniciar Stack**

No Portainer:
1. Ir em Stacks → research-agent-urban
2. Clicar em **"Editor"**
3. Clicar em **"Update the stack"**

## 📈 PERFORMANCE

### **Monitoramento Recomendado**

- CPU < 80%
- Memória < 80%
- Health check OK
- Logs sem erros críticos

### **Alertas Sugeridos**

- Health check failing > 2 minutos
- CPU > 80% por > 5 minutos
- Memória > 80% por > 5 minutos
- Sem execuções por > 10 minutos

## 🔄 ATUALIZAÇÕES

### **Via GitHub**

1. Fazer push das mudanças para `main`
2. Portainer → Stacks → research-agent-urban → Editor
3. Clicar em **"Pull and redeploy"**

### **Rollback**

1. Reverter commit no GitHub
2. Fazer **"Pull and redeploy"** no Portainer

## ✅ CHECKLIST FINAL

- [ ] VPS preparado com diretórios
- [ ] Variáveis de ambiente configuradas
- [ ] Stack deployado com sucesso
- [ ] Health check retornando `200 OK`
- [ ] Logs mostrando execuções automáticas
- [ ] Webhook recebendo dados no n8n
- [ ] Cache funcionando (sem reenvios desnecessários)

## 📞 SUPORTE

**Comandos Úteis:**

```bash
# Status geral
docker ps && curl -s http://localhost:3000/health | jq

# Logs detalhados
docker logs -f --tail 100 research-agent-urban

# Recursos em uso
docker stats research-agent-urban

# Reiniciar container
docker restart research-agent-urban
```

**Sistema pronto para produção! 🚀**
