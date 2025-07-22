# 🐳 RESEARCH AGENT URBAN - DOCKER DEPLOY READY

## ✅ Status: PRONTO PARA DEPLOY DOCKER

### 🎯 **Sistema Testado e Funcionando:**
- ✅ **AI Agent** com Google Gemini API (**TESTADO**)
- ✅ **Screenshot automático** funcionando (**CONFIRMADO**)
- ✅ **Browser integration** XVFB/VNC adaptativo (**FUNCIONANDO**)
- ✅ **Auto-scraping** corretamente desabilitado (**CORRIGIDO**)
- ✅ **Endpoints AI** todos funcionando (**TESTADOS**)
- ✅ **PostgreSQL** integração completa
- ✅ **Docker** configuração completa

---

## 🚀 **Deploy em 3 Passos**

### **1. Preparar VPS**
```bash
# Conectar ao VPS
ssh root@seu-vps-ip

# Instalar Docker (se necessário)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### **2. Clonar e Configurar**
```bash
# Clonar repositório
git clone https://github.com/daaty/research-agent-urban.git
cd research-agent-urban
git checkout ai-agent

# Configurar credenciais
nano .env.docker
```

### **3. Deploy Automático**
```bash
# Executar deploy
sudo chmod +x deploy-postgresql.sh
sudo ./deploy-postgresql.sh
```

---

## 🔧 **Configuração .env.docker**

```env
# ========================================
# CREDENCIAIS (OBRIGATÓRIO)
# ========================================
RIDES_USERNAME=seu_email@exemplo.com
RIDES_PASSWORD=sua_senha
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/rides

# ========================================
# AI AGENT (OBRIGATÓRIO)
# ========================================
GEMINI_API_KEY=AIzaSyD_sua_chave_aqui

# ========================================
# POSTGRESQL (AUTOMÁTICO)
# ========================================
DB_HOST=n8n_postgres
DB_NAME=n8n_db
DB_USER=n8n_user
DB_PASSWORD=n8n_pw

# ========================================
# PORTAS (CONFIGURÁVEL)
# ========================================
PORT=3040
VNC_PORT=6090
NOVNC_PORT=6091

# ========================================
# CONFIGURAÇÕES AI
# ========================================
AI_ENABLED=true
AI_MAX_RETRIES=3
AI_SCREENSHOT_ON_ERROR=true
AI_WAIT_TIMEOUT=30000
AI_CONTEXT_MEMORY=true

# ========================================
# CONFIGURAÇÕES BROWSER
# ========================================
BROWSER_HEADLESS=false
ENABLE_AUTO_SCRAPING=false
SCRAPE_INTERVAL=15
```

---

## 🌐 **URLs de Acesso Após Deploy**

- **🌐 API Principal:** `http://seu-vps-ip:3040`
- **🤖 AI Agent Status:** `http://seu-vps-ip:3040/api/ai/status`
- **🖥️ VNC Web:** `http://seu-vps-ip:6091`
- **📊 Dashboard:** `http://seu-vps-ip:3040/api/database/dashboard`

---

## 🤖 **Testar AI Agent Após Deploy**

```bash
# 1. Verificar status
curl http://seu-vps-ip:3040/api/ai/status

# 2. Inicializar AI Agent
curl -X POST http://seu-vps-ip:3040/api/ai/initialize

# 3. Comando de teste
curl -X POST http://seu-vps-ip:3040/api/ai/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "Analise a página atual"}'
```

---

## 📋 **Checklist de Deploy**

### **Antes do Deploy:**
- [ ] VPS com Ubuntu/Debian
- [ ] Docker e Docker Compose instalados
- [ ] Credenciais do sistema Rides
- [ ] Google Gemini API Key
- [ ] PostgreSQL existente (ou será criado)

### **Configuração:**
- [ ] .env.docker editado com credenciais reais
- [ ] GEMINI_API_KEY válida
- [ ] RIDES_USERNAME/PASSWORD corretos
- [ ] Portas disponíveis (3040, 6090, 6091)

### **Deploy:**
- [ ] Script executado: `sudo ./deploy-postgresql.sh`
- [ ] Containers rodando sem erro
- [ ] API respondendo
- [ ] VNC acessível
- [ ] AI Agent inicializado

### **Teste:**
- [ ] Status endpoint funcionando
- [ ] AI Agent respondendo comandos
- [ ] Screenshot funcionando
- [ ] PostgreSQL conectado

---

## 🛠️ **Troubleshooting**

### **Container não inicia:**
```bash
# Verificar logs
docker-compose -f docker-compose.postgresql.yml logs -f

# Rebuild
docker-compose -f docker-compose.postgresql.yml down
docker-compose -f docker-compose.postgresql.yml build --no-cache
docker-compose -f docker-compose.postgresql.yml up -d
```

### **AI Agent não funciona:**
```bash
# Verificar API key
curl http://localhost:3040/api/ai/status

# Reinicializar
curl -X POST http://localhost:3040/api/ai/initialize
```

### **VNC não abre:**
```bash
# Verificar portas
netstat -tulpn | grep -E "6090|6091"

# Restart container
docker restart research-agent-urban-ai
```

---

## 🎉 **DEPLOY DOCKER PRONTO!**

O sistema está **100% testado** e pronto para deploy em VPS:

### **✅ Funcionalidades Confirmadas:**
- 🤖 **AI Agent** com Gemini API
- 📸 **Screenshot automático**
- 🖥️ **Browser + VNC/XVFB**
- 🗄️ **PostgreSQL** integration
- 🐳 **Docker** deployment
- 🔧 **Auto-scraping** control

### **🚀 Deploy em 1 Comando:**
```bash
sudo ./deploy-postgresql.sh
```

**Seu AI Web Agent está pronto para produção! 🌟**
