# 🌐 Guia de Browsers para VPS

## ❓ **Sua pergunta: "Vai instalar tudo automaticamente?"**

### ✅ **SIM, mas com alguns detalhes importantes:**

## 📦 **O que instala automaticamente:**

### 1. **npm install**
```bash
✅ axios, cheerio, dotenv, express
✅ node-cron, node-fetch  
✅ playwright (pacote)
✅ puppeteer (pacote)
```

### 2. **O que NÃO instala automaticamente:**
```bash
❌ Chromium browser (binário)
❌ Dependências de sistema Linux
❌ Libs gráficas necessárias
```

## 🛠️ **Deploy automático resolve tudo:**

### **Script deploy.sh já configurado:**

```bash
# 1. Instala dependências do sistema
sudo apt-get install -y \
    wget ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libdrm2 \
    libxcomposite1 libxdamage1 libxrandr2 \
    libgbm1 libxss1 libgconf-2-4 xvfb

# 2. Instala dependências Node.js
npm install

# 3. Instala browsers automaticamente
npx playwright install          # Baixa Chromium
npx playwright install-deps     # Instala deps do sistema
npm run puppeteer-install-chrome # Backup Puppeteer

# 4. Builda projeto
npm run build
```

## 🎯 **Processo completo na VPS:**

### **1. Upload + Deploy automático:**
```bash
# No seu PC
scp -r research-agent-urban root@sua-vps:/opt/rides-monitor

# Na VPS
ssh root@sua-vps
cd /opt/rides-monitor
chmod +x deploy.sh
./deploy.sh    # ← INSTALA TUDO AUTOMATICAMENTE
```

### **2. O script deploy.sh faz:**
```bash
✅ Instala Node.js (se não tiver)
✅ Instala dependências do sistema Linux
✅ npm install (todas as libs)
✅ npx playwright install (baixa Chromium)
✅ Configura PM2
✅ Builda o projeto
✅ Inicia automaticamente
```

## 🔍 **Verificação pós-deploy:**

### **Testar se browsers funcionam:**
```bash
# Na VPS, após deploy
node -e "
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  console.log('✅ Playwright funcionando!');
  await browser.close();
})();
"
```

## 🚨 **Possíveis problemas e soluções:**

### **1. Erro "chromium not found"**
```bash
# Solução manual
npx playwright install chromium
```

### **2. Erro "shared libraries"**
```bash
# Instalar deps extras
sudo apt-get install -y libglib2.0-0 libgbm-dev
```

### **3. Headless não funciona**
```bash
# Forçar headless no .env
HEADLESS_MODE=true
```

### **4. Erro de permissão**
```bash
# Ajustar permissões
sudo chown -R $USER:$USER /opt/rides-monitor
```

## 📊 **Tamanhos aproximados na VPS:**

```bash
📁 Projeto: ~50MB
🌐 Chromium: ~130MB  
📚 node_modules: ~200MB
💾 Total: ~380MB
```

## ✅ **Resumo da resposta:**

### **🎯 SIM, vai instalar TUDO automaticamente, incluindo:**

1. ✅ **Todas as dependências Node.js** (npm install)
2. ✅ **Chromium browser** (playwright install)  
3. ✅ **Dependências do sistema Linux** (apt-get)
4. ✅ **Configuração automática** (PM2, .env, etc)

### **🚀 Você só precisa:**
```bash
1. ./deploy.sh      # Executa UMA VEZ
2. nano .env        # Configura credenciais
3. pm2 restart      # Reinicia
```

**E tudo vai funcionar! 🎉**

---

**O script de deploy foi projetado para ser 100% automático e resolver todos os problemas de dependências em VPS Ubuntu.**
