# 🔧 GUIA DE EXECUÇÃO: LOCAL vs VPS

## 📋 **RESUMO EXECUTIVO**

O sistema Research Agent Urban suporta **duas modalidades de execução**:

1. **🖥️ EXECUÇÃO LOCAL** - Desenvolvimento e teste local
2. **🌐 EXECUÇÃO VPS** - Produção e monitoramento contínuo

---

## 🖥️ **EXECUÇÃO LOCAL**

### **📋 Pré-requisitos:**

#### **1. Software Base:**
```bash
# Node.js 18+
node --version

# TypeScript
npm install -g typescript ts-node

# Git
git --version
```

#### **2. Browser (Playwright):**
```bash
# Instalar browsers
npx playwright install chromium

# Verificar instalação
npx playwright --version
```

#### **3. Display Local (Windows):**
- ✅ **Windows**: Funciona automaticamente
- ✅ **Browser visível**: Para debug e desenvolvimento
- ✅ **VNC opcional**: Para monitoramento remoto

### **🔧 Configuração Local:**

#### **1. Variáveis de Ambiente (.env):**
```env
# ========================================
# CONFIGURAÇÃO LOCAL
# ========================================

# 🔐 CREDENCIAIS
RIDES_USERNAME=seu_usuario@email.com
RIDES_PASSWORD=sua_senha

# 🌐 WEBHOOK (opcional para teste local)
N8N_WEBHOOK_URL=https://n8n.urbanmt.com.br/webhook/rideswebscrap

# 🗄️ BANCO DE DADOS
# Opção 1: Banco VPS (recomendado)
DATABASE_URL=postgres://n8n_user:n8n_pw@148.230.73.27:5432/n8n_db?sslmode=disable

# Opção 2: PostgreSQL Local
# DATABASE_URL=postgres://usuario:senha@localhost:5432/rides_db

# 🎛️ CONFIGURAÇÕES LOCAIS
HEADLESS_MODE=false          # Browser visível para debug
NODE_ENV=development         # Modo desenvolvimento
SCRAPE_INTERVAL=10           # Intervalo maior para teste (10 min)
ENABLE_DATABASE=true         # Habilitar salvamento no banco
ENABLE_WEBHOOK=false         # Desabilitar webhook para teste local

# 🖥️ DISPLAY LOCAL
DISPLAY=:0                   # Windows automatico
VNC_PORT=5900               # Opcional: VNC para acesso remoto
```

#### **2. Scripts de Execução Local:**

**📄 start-local.ts** (criar):
```typescript
import { MonitoringService } from './src/services/monitoringService';
import { EnvironmentDetector } from './src/config/environmentDetector';
import dotenv from 'dotenv';

// Carregar configuração local
dotenv.config();

async function startLocal() {
  console.log('🖥️ INICIANDO RESEARCH AGENT - MODO LOCAL');
  console.log('=====================================');
  
  // Detectar ambiente
  const envDetector = EnvironmentDetector.getInstance();
  envDetector.logEnvironmentInfo();
  
  const config = envDetector.getConfig();
  
  if (!config.isLocal) {
    console.log('⚠️ Ambiente não detectado como LOCAL');
    console.log('💡 Forçando configuração local...');
  }
  
  console.log('🔧 Configurações Locais:');
  console.log(`   📺 Modo Browser: ${process.env.HEADLESS_MODE === 'true' ? 'Headless' : 'Visível'}`);
  console.log(`   ⏰ Intervalo: ${process.env.SCRAPE_INTERVAL || 5} minutos`);
  console.log(`   🗄️ Banco: ${process.env.DATABASE_URL ? 'Conectado' : 'Desconectado'}`);
  console.log(`   🌐 Webhook: ${process.env.ENABLE_WEBHOOK === 'true' ? 'Ativo' : 'Desativo'}`);
  
  try {
    const monitoring = new MonitoringService();
    
    // Executar teste inicial
    console.log('\\n🧪 TESTE INICIAL...');
    await monitoring.runOnce();
    
    // Iniciar monitoramento
    console.log('\\n🔄 INICIANDO MONITORAMENTO CONTÍNUO...');
    monitoring.startMonitoring();
    
    console.log('\\n✅ Sistema Local Iniciado!');
    console.log('🖥️ Browser: Visível para debug');
    console.log('⏹️ Para parar: Ctrl+C');
    
    // URLs de acesso
    const urls = envDetector.getAccessUrls();
    console.log('\\n🌐 URLs de Acesso:');
    console.log(`   API: ${urls.api}`);
    if (urls.vnc) console.log(`   VNC: ${urls.vnc}`);
    if (urls.novnc) console.log(`   NoVNC: ${urls.novnc}`);
    
  } catch (error) {
    console.error('❌ Erro na execução local:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\\n🛑 Parando sistema local...');
  process.exit(0);
});

startLocal().catch(console.error);
```

### **🚀 Comandos de Execução Local:**

```bash
# 1. Instalar dependências
npm install

# 2. Configurar ambiente
cp .env.example .env
# Editar .env com configurações locais

# 3. Executar modo desenvolvimento
npx ts-node start-local.ts

# 4. Ou executar monitoramento padrão
npx ts-node start-monitoring.ts

# 5. Teste único
npx ts-node -e "
import { MonitoringService } from './src/services/monitoringService';
const monitoring = new MonitoringService();
monitoring.runOnce().then(() => console.log('✅ Teste concluído'));
"
```

### **🔍 Debug Local:**

```bash
# Testar conexão com banco
npx ts-node -e "
import { DatabaseManager } from './src/services/databaseManager';
const db = DatabaseManager.getInstance();
db.initialize().then(() => console.log('✅ Banco OK')).catch(console.error);
"

# Testar browser
npx ts-node -e "
import { BrowserSessionManager } from './src/services/browserSessionManager';
const browser = new BrowserSessionManager();
browser.ensureBrowserIsActive().then(() => console.log('✅ Browser OK'));
"

# Verificar ambiente
npx ts-node -e "
import { EnvironmentDetector } from './src/config/environmentDetector';
EnvironmentDetector.getInstance().logEnvironmentInfo();
"
```

---

## 🌐 **EXECUÇÃO VPS**

### **📋 Configuração VPS:**

#### **1. Environment VPS (.env):**
```env
# ========================================
# CONFIGURAÇÃO VPS/PRODUÇÃO
# ========================================

# 🔐 CREDENCIAIS
RIDES_USERNAME=herbert@urbandobrasil.com.br
RIDES_PASSWORD=herbert@urban25

# 🌐 WEBHOOK PRODUÇÃO
N8N_WEBHOOK_URL=https://n8n.urbanmt.com.br/webhook/rideswebscrap

# 🗄️ BANCO DE DADOS VPS
DATABASE_URL=postgres://n8n_user:n8n_pw@148.230.73.27:5432/n8n_db?sslmode=disable
DB_HOST=148.230.73.27
DB_PORT=5432
DB_NAME=n8n_db
DB_USER=n8n_user
DB_PASSWORD=n8n_pw

# 🎛️ CONFIGURAÇÕES PRODUÇÃO
HEADLESS_MODE=true           # Browser headless em produção
NODE_ENV=production          # Modo produção
SCRAPE_INTERVAL=5            # Intervalo menor para produção (5 min)
ENABLE_DATABASE=true         # Banco obrigatório
ENABLE_WEBHOOK=true          # Webhook obrigatório

# 🐳 DOCKER/VPS
DISPLAY=:99                  # Display virtual
VNC_PORT=5900               # VNC para acesso remoto
NOVNC_PORT=6080             # NoVNC web
```

#### **2. Docker Compose (VPS):**

**📄 docker-compose.production.yml:**
```yaml
version: '3.8'

services:
  research-agent:
    build: .
    environment:
      - NODE_ENV=production
      - HEADLESS_MODE=true
      - DISPLAY=:99
    volumes:
      - ./data:/app/data
      - ./logs:/app/logs
    restart: unless-stopped
    networks:
      - monitoring-network

  vnc-server:
    image: consol/ubuntu-xfce-vnc:latest
    environment:
      - VNC_PW=password
      - VNC_RESOLUTION=1920x1080
    ports:
      - "5900:5900"
      - "6080:6080"
    restart: unless-stopped

networks:
  monitoring-network:
    driver: bridge
```

### **🚀 Deploy VPS:**

```bash
# 1. SSH na VPS
ssh user@148.230.73.27

# 2. Clone/Update projeto
git clone https://github.com/daaty/research-agent-urban.git
cd research-agent-urban
git pull origin vps-deploy-v3

# 3. Configurar ambiente
cp .env.production .env

# 4. Instalar dependências
npm install
npx playwright install chromium

# 5. Executar
npx ts-node start-monitoring.ts

# 6. Ou Docker
docker-compose -f docker-compose.production.yml up -d
```

---

## 📊 **COMPARAÇÃO: LOCAL vs VPS**

| Aspecto | 🖥️ LOCAL | 🌐 VPS |
|---------|----------|--------|
| **Browser** | Visível, debug fácil | Headless, VNC remoto |
| **Performance** | Limitado pelo PC | Recursos dedicados |
| **Monitoramento** | Manual/temporário | 24/7 automático |
| **Database** | Local ou remoto | PostgreSQL VPS |
| **Webhook** | Opcional/teste | Obrigatório |
| **Intervalo** | 10+ min (teste) | 5 min (produção) |
| **Logs** | Terminal direto | Arquivos/Docker logs |
| **Acesso** | Local only | VNC/NoVNC remoto |

---

## 🎯 **CASOS DE USO**

### **🖥️ Usar LOCAL quando:**
- ✅ Desenvolvimento de features
- ✅ Debug de scraping
- ✅ Teste de mudanças
- ✅ Análise de dados
- ✅ Configuração inicial

### **🌐 Usar VPS quando:**
- ✅ Monitoramento produção
- ✅ Coleta contínua 24/7
- ✅ Integração com N8N
- ✅ Dashboard em tempo real
- ✅ Sistema em produção

---

## 🔧 **COMANDOS RÁPIDOS**

### **Local:**
```bash
# Setup
npm install && npx playwright install chromium

# Debug
npx ts-node start-local.ts

# Teste único
npx ts-node start-monitoring.ts
```

### **VPS:**
```bash
# Deploy
git pull && npm install && npx ts-node start-monitoring.ts

# Monitorar
tail -f logs/monitoring.log

# Status
ps aux | grep node
```

---

✅ **SISTEMA CONFIGURADO PARA AMBOS AMBIENTES!**
