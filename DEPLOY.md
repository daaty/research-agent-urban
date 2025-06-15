# 🚀 Deploy Guide - Rides Monitoring System

## 📋 Pré-requisitos

- **VPS com Ubuntu 18.04+**
- **Acesso SSH**
- **Mínimo 1GB RAM**
- **Node.js 18+ (será instalado automaticamente)**

---

## 🎯 Deploy Rápido (Recomendado)

### 1. **Fazer upload do projeto para VPS**
```bash
# No seu PC (PowerShell)
scp -r f:\Webscarpbot\research-agent-urban root@seu-vps-ip:/opt/rides-monitor
```

### 2. **Conectar na VPS e executar deploy**
```bash
# SSH na VPS
ssh root@seu-vps-ip

# Ir para o diretório
cd /opt/rides-monitor

# Dar permissão de execução
chmod +x deploy.sh

# Executar deploy automático (INSTALA TUDO: Node.js, Chromium, deps, etc)
./deploy.sh
```

### 3. **Configurar credenciais**
```bash
# Editar arquivo .env
nano .env

# Adicionar suas credenciais reais:
RIDES_EMAIL=seu_email@real.com
RIDES_PASSWORD=sua_senha_real
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/rideswebscrap
```

### 4. **Reiniciar aplicação**
```bash
pm2 restart rides-monitor
```

### ✅ **O que o deploy.sh instala automaticamente:**
- Node.js 18+ (se não tiver)
- PM2 (gerenciador de processos)
- Dependências do sistema Linux (libs gráficas)
- **Chromium browser** (via Playwright)
- **Puppeteer browser** (backup)
- Todas as dependências npm
- Build do projeto TypeScript

---

## 🛠️ Deploy Manual (Passo a Passo)

### 1. **Instalar Node.js**
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### 2. **Instalar PM2**
```bash
sudo npm install -g pm2
```

### 3. **Instalar dependências do sistema**
```bash
sudo apt-get update
sudo apt-get install -y wget ca-certificates fonts-liberation libasound2 libatk-bridge2.0-0 libdrm2 libxcomposite1 libxdamage1 libxrandr2 libgbm1 libxss1 libgconf-2-4 xvfb
```

### 4. **Clonar/Upload projeto**
```bash
cd /opt
mkdir rides-monitor
cd rides-monitor
# Upload seus arquivos aqui
```

### 5. **Instalar dependências**
```bash
npm install
```

### 6. **Buildar projeto**
```bash
npm run build
```

### 7. **Configurar .env**
```bash
cp .env.example .env
nano .env
# Editar com suas credenciais
```

### 8. **Iniciar com PM2**
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

---

## 📊 Comandos de Monitoramento

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs rides-monitor

# Monitoramento interativo
pm2 monit

# Restart
pm2 restart rides-monitor

# Parar
pm2 stop rides-monitor

# Remover
pm2 delete rides-monitor
```

---

## 🔧 Configurações Importantes

### **Firewall (se necessário)**
```bash
sudo ufw allow 3000
sudo ufw reload
```

### **Nginx (opcional - proxy reverso)**
```bash
sudo apt install nginx

# Configurar proxy para domínio
sudo nano /etc/nginx/sites-available/rides-monitor
```

### **SSL/HTTPS (opcional)**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d seu-dominio.com
```

---

## 🚨 Troubleshooting

### **Erro de permissão**
```bash
sudo chown -R $USER:$USER /opt/rides-monitor
```

### **Erro de dependências**
```bash
sudo apt-get install -y build-essential
npm rebuild
```

### **Erro de memória**
```bash
# Criar swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

### **Logs não aparecem**
```bash
mkdir -p logs
pm2 restart rides-monitor
```

---

## ✅ Teste de Funcionamento

### **1. Verificar se está rodando**
```bash
curl http://localhost:3000/health
```

### **2. Testar scraping manual**
```bash
curl -X POST http://localhost:3000/api/scrape-now
```

### **3. Verificar logs**
```bash
pm2 logs rides-monitor --lines 50
```

---

## 🎯 Scripts Disponíveis

| Comando | Descrição |
|---------|-----------|
| `npm start` | Inicia em produção |
| `npm run build` | Compila TypeScript |
| `npm run setup` | Instala deps + build |
| `npm run prod` | Build + Start |

---

## 📈 Monitoramento Automático

O sistema irá:
- ✅ **Executar a cada 2,5 minutos**
- ✅ **Reiniciar automaticamente se falhar**
- ✅ **Gerar logs detalhados**
- ✅ **Enviar dados para n8n quando houver mudanças**
- ✅ **Reiniciar diariamente às 3:00 AM** (configurável)

---

## 🔗 URLs Importantes

- **Status**: `http://seu-vps:3000/`
- **Health**: `http://seu-vps:3000/health`
- **Scrape Manual**: `POST http://seu-vps:3000/api/scrape-now`

---

**🎉 Pronto! Seu sistema está rodando em produção!**
