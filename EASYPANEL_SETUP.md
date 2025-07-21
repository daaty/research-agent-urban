# 🚀 EasyPanel Configuration Guide

## 📋 **Configuração das Portas no EasyPanel**

### 🔧 **1. Configurar Portas no Container:**

No EasyPanel, certifique-se de expor essas portas:

```yaml
# Configuração de Portas
ports:
  - containerPort: 3030
    protocol: TCP
    name: api
  - containerPort: 6080
    protocol: TCP
    name: vnc
```

### 🌐 **2. Mapear Domínios:**

```bash
# API REST (para automação N8N)
api.seu-dominio.com → porta 3030

# VNC Web Interface (para visualização)
vnc.seu-dominio.com → porta 6080
```

### ⚙️ **3. Variáveis de Ambiente Obrigatórias:**

```bash
# Credenciais (OBRIGATÓRIO)
RIDES_USERNAME=seu_email_real@exemplo.com
RIDES_PASSWORD=sua_senha_real
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/rideswebscrap

# VNC
VNC_PASSWORD=suaSenhaVNC123
DISPLAY=:99

# Sistema
PORT=3030
NODE_ENV=production
TZ=America/Sao_Paulo

# Scraping
SCRAPE_INTERVAL=15
BROWSER_HEADLESS=false
BROWSER_TIMEOUT=30000
CACHE_ENABLED=true
MAX_RETRIES=3
```

### 🎯 **4. Testes de Funcionamento:**

#### **Teste 1: API**
```bash
curl http://api.seu-dominio.com/api/status
```

#### **Teste 2: VNC**
```bash
# Acesse no browser:
http://vnc.seu-dominio.com/vnc.html
# Senha: suaSenhaVNC123
```

#### **Teste 3: Scraping Manual**
```bash
curl -X POST http://api.seu-dominio.com/api/rides/scrape
```

### 🔄 **5. Auto-Execução Configurada:**

O sistema automaticamente:
- ✅ Inicia scraping 30 segundos após startup
- ✅ Executa a cada 15 minutos (configurável via SCRAPE_INTERVAL)
- ✅ Envia dados novos para N8N webhook
- ✅ Logs visíveis no EasyPanel

### 🎛️ **6. Monitoramento:**

- **Logs**: EasyPanel Dashboard → Container Logs
- **VNC**: http://vnc.seu-dominio.com/vnc.html
- **Status**: http://api.seu-dominio.com/api/status

---

## ✅ **Checklist Final:**

- [ ] Portas 3030 e 6080 expostas
- [ ] Domínios mapeados 
- [ ] Variáveis de ambiente configuradas
- [ ] Credenciais reais inseridas
- [ ] Container em status "verde"
- [ ] VNC acessível via browser
- [ ] API respondendo
- [ ] Logs mostrando auto-execução
