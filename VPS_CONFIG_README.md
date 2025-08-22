# 🚀 CONFIGURAÇÃO VPS - RESEARCH AGENT URBAN AI

## 📋 Arquivo de Configuração Completo: `.env.vps`

Este arquivo contém todas as configurações necessárias para deploy em produção na VPS usando EasyPanel ou Docker.

## 🎯 **CONFIGURAÇÕES PRINCIPAIS**

### 🔐 **Credenciais Obrigatórias**
```bash
RIDES_USERNAME=herbert@urbandobrasil.com.br
RIDES_PASSWORD=herbert@urban25
N8N_WEBHOOK_URL=https://n8n.urbanmt.com.br/webhook/rideswebscrap
GEMINI_API_KEY=AIzaSyBJRZEjnpyCN0plKInQKKeiL80xNDELdZs
```

### 🗄️ **Banco de Dados (EasyPanel)**
```bash
DATABASE_URL=postgresql://n8n_user:n8n_pw@n8n_postgres:5432/n8n_db
DB_HOST=n8n_postgres  # Nome do container PostgreSQL no EasyPanel
```

### 🖥️ **VNC Otimizado (1600x1200)**
```bash
VNC_RESOLUTION=1600x1200
VNC_DEPTH=24
VNC_DPI=96
BROWSER_WIDTH=1600
BROWSER_HEIGHT=1200
```

### 🔄 **Sistema Híbrido de Alto Performance**
```bash
AUTO_START_HYBRID=true
HYBRID_EXTRACTION_BATCH_SIZE=1      # Sequencial
HYBRID_STATE_CHECK_INTERVAL=8000    # 8 segundos
```

## 🛠️ **INSTRUÇÕES DE DEPLOY**

### **1. EasyPanel Setup**
1. **Create New App** → **Docker**
2. **Image:** `seu-registry/research-agent-urban:vps-deploy-v4`
3. **Environment Variables:** Copie todo conteúdo do `.env.vps`
4. **Ports:**
   - `3040` → API Principal
   - `6090` → VNC Server
   - `6091` → noVNC Web
5. **Volumes:**
   - `/app/logs` → Para persistir logs
   - `/app/browser-data` → Para sessões do navegador

### **2. PostgreSQL Setup (EasyPanel)**
1. **Create Database** → **PostgreSQL**
2. **Database Name:** `n8n_db`
3. **Username:** `n8n_user`
4. **Password:** `n8n_pw`
5. **Internal Name:** `n8n_postgres`

### **3. Network Configuration**
- Certifique-se que o app pode acessar o PostgreSQL
- Configure DNS interno: `n8n_postgres:5432`

## 🎯 **FEATURES HABILITADAS**

### ✅ **Sistema Completo**
- [x] **Sistema Híbrido** com processamento sequencial
- [x] **API de Recarga** com tracking completo
- [x] **VNC Otimizado** para visualização 1600x1200
- [x] **Logging Avançado** com arquivos categorizados
- [x] **Monitoramento** com health checks
- [x] **Cache System** para performance
- [x] **Session Recovery** automática
- [x] **AI Agent** com Gemini API

### 🔧 **Performance Otimizada**
- **Processamento Sequencial:** Evita sobrecarga
- **Intervalos de 8s:** Entre operações
- **Cache Habilitado:** TTL de 1 hora
- **Timeouts Otimizados:** 30s-60s conforme operação
- **Retry Logic:** 3 tentativas com delay

### 📊 **Monitoramento**
- **Health Checks:** A cada 30 segundos
- **Métricas:** Coletadas a cada minuto
- **Logs Estruturados:** Por categoria (HYBRID, BROWSER, etc.)
- **API Status:** `/api/status`
- **Database Test:** `/api/database/test-connection`

## 🌐 **ACESSO VNC**

### **Via Cliente VNC**
```
Host: sua-vps-ip:6090
Password: suasenhaVNC123
```

### **Via Browser (noVNC)**
```
URL: http://sua-vps-ip:6091
Password: suasenhaVNC123
```

## 🔍 **TROUBLESHOOTING**

### **1. VNC Cortado/Pequeno**
✅ **RESOLVIDO:** Configuração otimizada para 1600x1200

### **2. Sistema Muito Rápido**
✅ **RESOLVIDO:** Processamento sequencial com delays

### **3. Logs no Console**
✅ **RESOLVIDO:** Sistema de logging em arquivos

### **4. Falhas de Recarga**
✅ **RESOLVIDO:** API com tracking e retry logic

## 📋 **CHECKLIST DE DEPLOY**

- [ ] PostgreSQL configurado no EasyPanel
- [ ] Variáveis de ambiente copiadas do `.env.vps`
- [ ] Portas 3040, 6090, 6091 expostas
- [ ] Volumes configurados para `/app/logs` e `/app/browser-data`
- [ ] Network policy permite comunicação com PostgreSQL
- [ ] Branch `vps-deploy-v4` sendo usada
- [ ] Health check endpoint funcionando: `/api/status`

## 🚀 **COMANDOS DE VERIFICAÇÃO**

### **Testar API**
```bash
curl http://sua-vps:3040/api/status
curl http://sua-vps:3040/api/database/test-connection
```

### **Verificar Logs**
```bash
# Dentro do container
tail -f /app/logs/HYBRID-$(date +%Y-%m-%d).log
tail -f /app/logs/BROWSER-$(date +%Y-%m-%d).log
```

### **Testar Recarga**
```bash
curl -X POST http://sua-vps:3040/api/recharge/request \
  -H "Content-Type: application/json" \
  -d '{"driverId": "TEST001", "amount": 10}'
```

## 🎯 **PRÓXIMOS PASSOS**

1. **Deploy** usando branch `vps-deploy-v4`
2. **Configurar** variáveis do `.env.vps`
3. **Testar** VNC na resolução 1600x1200
4. **Verificar** sistema híbrido funcionando
5. **Monitorar** logs e performance

---

**💡 DICA:** Este arquivo `.env.vps` é a configuração definitiva e completa para produção VPS com todas as otimizações implementadas!
