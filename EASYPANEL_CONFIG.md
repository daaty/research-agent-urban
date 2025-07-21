# 🚀 Configuração EasyPanel - Research Agent Urban

## ⚙️ **Configurações Necessárias no EasyPanel:**

### 1. **📦 Fonte**
- **Repositório**: `https://github.com/daaty/research-agent-urban`
- **Branch**: `docker-deployment`
- **Dockerfile**: `Dockerfile` (na raiz)

### 2. **🌐 Portas para Expor**
```
3030 → HTTP (API REST)
6080 → HTTP (VNC Web Interface)
```

### 3. **🔐 Variáveis de Ambiente**
```bash
RIDES_USERNAME=seu_email_real@exemplo.com
RIDES_PASSWORD=sua_senha_real
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/rideswebscrap
VNC_PASSWORD=suasenhaVNC123
PORT=3030
NODE_ENV=production
TZ=America/Sao_Paulo
DISPLAY=:99
BROWSER_HEADLESS=false
BROWSER_TIMEOUT=30000
SCRAPE_INTERVAL=15
MAX_RETRIES=3
CACHE_ENABLED=true
RIDES_LOGIN_URL=https://carreira.ridesapp.com.br/driver/login
```

### 4. **🎯 URLs de Acesso**
```
# API REST
https://[seu-app].easypanel.host

# VNC Interface  
https://[seu-app]-6080.easypanel.host/vnc.html
```

### 5. **🔄 Health Check**
- **Path**: `/api/status`
- **Port**: `3030`
- **Method**: `GET`

## ✅ **Checklist de Deploy:**
- [ ] Repositório configurado
- [ ] Branch `docker-deployment` selecionada
- [ ] Portas 3030 e 6080 expostas
- [ ] Variáveis de ambiente configuradas
- [ ] Credenciais reais inseridas
- [ ] Deploy executado
- [ ] Container verde (running)
- [ ] API acessível em 3030
- [ ] VNC acessível em 6080

## 🐛 **Troubleshooting:**
- **Container laranja**: Faltam portas expostas
- **VNC não funciona**: Verificar porta 6080 exposta
- **API não responde**: Verificar porta 3030 exposta
- **Credenciais**: Usar credenciais reais, não de exemplo
