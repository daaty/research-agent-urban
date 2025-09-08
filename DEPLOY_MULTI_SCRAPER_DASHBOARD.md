# 🚀 DEPLOY MULTI-SCRAPER COM DASHBOARD CENTRALIZADO

## 🎯 ARQUITETURA FINAL

### **📊 SCRAPER MASTER (Com Dashboard)**
- **Função**: Scraper + Dashboard Web + Gerenciamento de todos os scrapers
- **URL**: `http://localhost:3001/dashboard`
- **API**: `http://localhost:3001/api/*`
- **Configuração**: `ENABLE_DASHBOARD="true"`

### **⚙️ SCRAPERS WORKERS (Apenas Scraping)**
- **Função**: Apenas scraping + reportar para o Master
- **Configuração**: `ENABLE_DASHBOARD="false"`
- **Quantidade**: 3 scrapers (Scrapers 2, 3, 4)

---

## 🔧 CONFIGURAÇÃO DE DEPLOY

### **1. SCRAPER MASTER (Scraper 1)**
```bash
# .env
ENABLE_DASHBOARD=true
RIDES_USERNAME=herbert@urbandobrasil.com.br
PORT=3001
DATABASE_URL=postgresql://user:pass@localhost:5432/urban_scraper_1
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/alerts
HEADLESS_MODE=true
SCRAPE_INTERVAL=5

# Iniciar
npm start
```

**✅ Recursos Habilitados:**
- 📊 Dashboard Web: `http://localhost:3001/dashboard`
- 🔧 API Management: `http://localhost:3001/api/*`
- 📡 WebSocket Real-time
- 🚨 AlertSystem (próprio + de outros scrapers)
- 🎛️ Controles Start/Stop para todos os scrapers

### **2. SCRAPER WORKER 2**
```bash
# .env
ENABLE_DASHBOARD=false
RIDES_USERNAME=user2@urbandobrasil.com.br
PORT=3002
DATABASE_URL=postgresql://user:pass@localhost:5432/urban_scraper_2
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/alerts
HEADLESS_MODE=true
SCRAPE_INTERVAL=5

# Iniciar
npm start
```

**✅ Recursos Habilitados:**
- ⚙️ Scraping Only
- 🚨 AlertSystem (reporta falhas)
- ❌ Sem Dashboard
- ❌ Sem WebSocket

### **3. SCRAPER WORKER 3**
```bash
# .env
ENABLE_DASHBOARD=false
RIDES_USERNAME=user3@urbandobrasil.com.br
PORT=3003
DATABASE_URL=postgresql://user:pass@localhost:5432/urban_scraper_3
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/alerts
HEADLESS_MODE=true
SCRAPE_INTERVAL=5

# Iniciar
npm start
```

### **4. SCRAPER WORKER 4**
```bash
# .env
ENABLE_DASHBOARD=false
RIDES_USERNAME=user4@urbandobrasil.com.br
PORT=3004
DATABASE_URL=postgresql://user:pass@localhost:5432/urban_scraper_4
N8N_WEBHOOK_URL=https://your-n8n.com/webhook/alerts
HEADLESS_MODE=true
SCRAPE_INTERVAL=5

# Iniciar
npm start
```

---

## 📱 ACESSO AO SISTEMA

### **🎛️ Dashboard Centralizado**
```
URL: http://localhost:3001/dashboard
- 📊 Status de todos os 4 scrapers
- 🎛️ Controles Start/Stop
- 📈 Métricas em tempo real
- 🚨 Alertas centralizados
- 📡 Updates via WebSocket
```

### **🔧 API de Controle**
```bash
# Status geral
curl http://localhost:3001/api/dashboard/status

# Lista scrapers
curl http://localhost:3001/api/scrapers

# Controlar scraper específico
curl -X POST http://localhost:3001/api/scrapers/start
curl -X POST http://localhost:3001/api/scrapers/stop

# Métricas
curl http://localhost:3001/api/metrics
```

---

## 🚨 SISTEMA DE ALERTAS

### **📱 Notificações WhatsApp**
Todos os 4 scrapers enviam alertas para o mesmo webhook N8N:
- ✅ Identificação por `RIDES_USERNAME`
- ✅ Tipos: `SCRAPER_DOWN`, `LOGIN_FAILED`, `HEARTBEAT`
- ✅ Prioridades: `HIGH`, `MEDIUM`, `LOW`

### **📊 Centralização no Dashboard**
O Scraper Master recebe e exibe alertas de todos os scrapers:
- 🔴 Scraper Offline
- 🟡 Login Failed  
- 🟢 Scraper Active
- ⚫ High Error Rate

---

## 🐳 DEPLOY EM PRODUÇÃO

### **Opção 1: VPS Separados**
```bash
# VPS 1 (Master)
git clone repo
cd research-agent-urban
echo "ENABLE_DASHBOARD=true" > .env
echo "RIDES_USERNAME=herbert@urbandobrasil.com.br" >> .env
echo "PORT=3001" >> .env
npm install && npm run build && npm start

# VPS 2 (Worker)
git clone repo
cd research-agent-urban
echo "ENABLE_DASHBOARD=false" > .env
echo "RIDES_USERNAME=user2@urbandobrasil.com.br" >> .env
echo "PORT=3002" >> .env
npm install && npm run build && npm start

# Repetir para VPS 3 e 4...
```

### **Opção 2: Docker Compose (Mesmo VPS)**
```yaml
version: '3.8'
services:
  scraper-master:
    build: .
    environment:
      - ENABLE_DASHBOARD=true
      - RIDES_USERNAME=herbert@urbandobrasil.com.br
      - PORT=3001
    ports:
      - "3001:3001"
    
  scraper-worker-2:
    build: .
    environment:
      - ENABLE_DASHBOARD=false
      - RIDES_USERNAME=user2@urbandobrasil.com.br
      - PORT=3002
    ports:
      - "3002:3002"
      
  scraper-worker-3:
    build: .
    environment:
      - ENABLE_DASHBOARD=false
      - RIDES_USERNAME=user3@urbandobrasil.com.br
      - PORT=3003
    ports:
      - "3003:3003"
      
  scraper-worker-4:
    build: .
    environment:
      - ENABLE_DASHBOARD=false
      - RIDES_USERNAME=user4@urbandobrasil.com.br
      - PORT=3004
    ports:
      - "3004:3004"
```

---

## 📊 MONITORAMENTO

### **🎯 URLs de Acesso**
```
Dashboard Master: http://ip-vps-1:3001/dashboard
API Master:      http://ip-vps-1:3001/api/*

Health Checks:
- Scraper 1:     http://ip-vps-1:3001/health
- Scraper 2:     http://ip-vps-2:3002/health  
- Scraper 3:     http://ip-vps-3:3003/health
- Scraper 4:     http://ip-vps-4:3004/health
```

### **📱 Alertas Unificados**
Todos os scrapers reportam para o mesmo N8N webhook, mas são identificados individualmente pelo `RIDES_USERNAME`.

---

## 🎉 RESULTADO FINAL

### ✅ **BENEFÍCIOS ALCANÇADOS:**
- **Um único dashboard** para gerenciar 4 scrapers
- **Deploy simplificado** - mesmo código, configuração diferente
- **Recursos otimizados** - dashboard apenas onde necessário
- **Alertas centralizados** - notificações via WhatsApp  
- **Controle total** - start/stop de qualquer scraper
- **Monitoramento real-time** - WebSocket updates
- **Identificação clara** - cada scraper com seu `RIDES_USERNAME`

### 🚀 **Pronto para Produção:**
- Zero downtime: scrapers independentes
- Fault tolerance: falha de um não afeta outros
- Scalable: fácil adicionar mais scrapers
- Maintainable: mesmo codebase, configuração simples
