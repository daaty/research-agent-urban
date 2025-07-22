# 🚀 RESEARCH AGENT URBAN - AI AGENT VERSION 3.0.0

## Deploy Completo - Do Zero ao Funcionamento Total

Este guia mostra como fazer o deploy completo do **Research Agent Urban AI Agent** com todas as dependências configuradas corretamente.

---

## 📋 Pré-requisitos

### Para Desenvolvimento Local:
- **Node.js** 18+ 
- **npm** 8+
- **Git**
- **Google Gemini API Key**

### Para Deploy Docker:
- **Ubuntu/Debian** com root
- **Docker** + **Docker Compose**
- **PostgreSQL** (existente)
- **Google Gemini API Key**

---

## 🛠️ 1. Instalação Local (Desenvolvimento)

### 1.1 Clone e Setup Inicial
```bash
git clone <seu-repo>
cd research-agent-urban
git checkout ai-agent
```

### 1.2 Instalar TODAS as Dependências
```bash
# Script completo de setup
npm run setup
```

**Ou passo a passo:**
```bash
# 1. Instalar dependências NPM
npm install

# 2. Instalar browsers Playwright + dependências do sistema
sudo npx playwright install-deps
npm run install-browsers

# 3. Compilar TypeScript
npm run build
```

### 1.3 Configurar Variáveis de Ambiente
```bash
# Copiar arquivo de exemplo
cp .env.docker .env

# Editar configurações (OBRIGATÓRIO)
nano .env
```

**Configurações essenciais:**
```env
# Credenciais do sistema Rides
RIDES_USERNAME=seu_email@exemplo.com
RIDES_PASSWORD=sua_senha_segura
RIDES_LOGIN_URL=https://rides.ec2dashboard.com/#/page/login

# Google Gemini AI (NOVO!)
# 🤖 DEPLOY AI AGENT COMPLETE - Research Agent Urban

## ✅ Status: **DEPLOY PRONTO PARA PRODUÇÃO**

### 🎯 **Sistema Implementado e TESTADO com Sucesso:**

- ✅ **AI Agent** usando Google Gemini API (**FUNCIONANDO**)
- ✅ **Screenshot automático** capturando dados visuais (**TESTADO**)
- ✅ **Browser + XVFB** detectação automática de ambiente (**FUNCIONANDO**)
- ✅ **PostgreSQL** integração completa 
- ✅ **Docker + noVNC** para deploy em VPS
- ✅ **Compilação** sem erros
- ✅ **Servidor funcionando** na porta 3000
- ✅ **Endpoints AI** todos implementados e **TESTADOS**
- ✅ **Dependências** instaladas corretamente
- ✅ **Auto-scraping** corretamente desabilitado (**CORRIGIDO**)

---

## 🚀 **Deploy Rápido**

### 1. **Desenvolvimento Local**
```bash
# Instalar dependências
npm install

# Instalar browsers
./node_modules/.bin/playwright install chromium

# Compilar
npm run build

# Executar
npm start
```

### 2. **Deploy em VPS (Docker)**
```bash
# 1. Configurar .env.docker com suas credenciais
# 2. Executar deploy
sudo chmod +x deploy-postgresql.sh
sudo ./deploy-postgresql.sh
```

---

## 🤖 **AI Agent - Funcionalidades**

### **Endpoints Disponíveis:**
- `POST /api/ai/initialize` - Inicializar AI Agent
- `POST /api/ai/execute` - Comandos em linguagem natural
- `POST /api/ai/navigate` - Navegar com AI
- `POST /api/ai/extract` - Extrair dados via AI
- `POST /api/ai/analyze` - Analisar página atual
- `POST /api/ai/workflow` - Automação complexa
- `GET /api/ai/status` - Status do AI Agent
- `POST /api/ai/clear` - Limpar histórico

### **Exemplo de Uso:**
```bash
# Status
curl http://localhost:3000/api/ai/status

# Inicializar (precisa GEMINI_API_KEY)
curl -X POST http://localhost:3000/api/ai/initialize

# Comando em linguagem natural
curl -X POST http://localhost:3000/api/ai/execute 
  -H "Content-Type: application/json" 
  -d '{"command": "Navegue até a página de relatórios"}'
```

---

## 🗄️ **PostgreSQL Integration**

### **Endpoints Disponíveis:**
- `GET /api/database/stats` - Estatísticas do banco
- `GET /api/database/recent` - Dados últimas 24h
- `GET /api/database/test-connection` - Testar conexão
- `GET /api/database/dashboard` - Dados para dashboard
- `POST /api/database/query` - Buscar por período

---

## 🔧 **Configuração Necessária**

### **Arquivo .env.docker:**
```bash
# CREDENCIAIS (OBRIGATÓRIO)
RIDES_USERNAME=seu_email@exemplo.com
RIDES_PASSWORD=sua_senha
N8N_WEBHOOK_URL=sua_url_webhook

# AI AGENT (NOVO!)
GEMINI_API_KEY=sua_google_gemini_api_key

# POSTGRESQL (para VPS)
DB_HOST=n8n_postgres
DB_NAME=n8n_db
DB_USER=n8n_user
DB_PASSWORD=n8n_pw

# PORTAS
PORT=3040
VNC_PORT=6090
NOVNC_PORT=6091
```

---

## 🎯 **Casos de Uso AI Agent**

### **1. Login Automatizado**
```json
{
  "command": "Faça login no sistema usando herbert@urban.com"
}
```

### **2. Extração de Dados**
```json
{
  "instruction": "Extraia todos os dados de corridas da tabela",
  "format": "JSON com campos: id, data, valor, status"
}
```

### **3. Análise Inteligente**
```json
{
  "question": "Quantas corridas foram canceladas hoje?"
}
```

### **4. Workflow Complexo**
```json
{
  "workflow": "Faça login, navegue até relatórios, filtre corridas de hoje, extraia dados e calcule faturamento total"
}
```

---

## 🐳 **Docker Deploy**

### **Arquivos Atualizados:**
- ✅ `Dockerfile` - Suporte completo para AI Agent
- ✅ `docker-compose.postgresql.yml` - Configuração AI Agent
- ✅ `deploy-postgresql.sh` - Script de deploy automatizado
- ✅ `package.json` - Dependências atualizadas

### **Deploy Command:**
```bash
sudo ./deploy-postgresql.sh
```

### **Resultado do Deploy:**
- 🌐 **API Principal:** `http://seu-vps-ip:3040`
- 🖥️ **VNC Web:** `http://seu-vps-ip:6091`
- 🤖 **AI Status:** `http://seu-vps-ip:3040/api/ai/status`

---

## 📊 **Status da Implementação**

### ✅ **Completado:**
1. **GeminiClient** - Cliente Google Generative AI
2. **AIBrowserManager** - Controlador de ações AI
3. **AIAgentController** - API Controller completo
4. **Package.json** - Dependências atualizadas
5. **Dockerfile** - Suporte AI Agent
6. **Docker Compose** - Configuração completa
7. **Deploy Script** - Automatizado
8. **Compilação** - Sem erros
9. **Servidor** - Funcionando
10. **Endpoints** - Todos implementados

### 🎯 **Testado e Confirmado:**
- ✅ Compilação TypeScript
- ✅ Instalação de dependências
- ✅ Playwright browsers
- ✅ Servidor rodando
- ✅ Endpoints AI respondendo
- ✅ Detecção de API key
- ✅ **Screenshot automático funcionando** 📸
- ✅ **Gemini API processando comandos** 🤖
- ✅ **Browser + XVFB integration** 🖥️
- ✅ **Auto-scraping desabilitado corretamente** ⏹️

---

## 🚀 **Deploy Imediato**

O sistema está **100% pronto** para deploy em produção:

1. **Configure** suas credenciais no `.env.docker`
2. **Execute** `sudo ./deploy-postgresql.sh`
3. **Acesse** o VNC para login manual
4. **Use** os endpoints AI para automação

---

## 🎉 **RESULTADO FINAL**

### **🤖 AI-Powered Web Agent - FUNCIONANDO COMPLETAMENTE**
- Comandos em **linguagem natural** ✅
- **Análise visual** de páginas ✅ **(Screenshot automático testado)**
- **Extração inteligente** de dados ✅
- **Workflows complexos** ✅
- **Google Gemini API** integrada e ativa ✅

### **�️ Detecção Automática de Ambiente**
- **Codespace/Local**: XVFB detection ✅
- **Docker/VPS**: VNC detection ✅
- **Browser adaptativo** por ambiente ✅

### **�🗄️ PostgreSQL Integration**
- **Armazenamento** completo ✅
- **APIs** para dashboard ✅
- **Histórico** de dados ✅

### **🐳 Docker Ready**
- **VNC** para acesso visual ✅
- **Portas** separadas ✅
- **Deploy automatizado** ✅

### **📸 Funcionalidades Testadas:**
- **Screenshot automático**: Funcionando (dados binários confirmados)
- **Gemini API**: Processando comandos com sucesso  
- **Browser integration**: XVFB + Playwright funcionando
- **Auto-scraping control**: Desabilitado corretamente

---

## 🌟 **VAMOS NESSA! SISTEMA REVOLUCIONÁRIO PRONTO! 🚀**

O Research Agent Urban agora é um **Agente Web Inteligente** completo com:
- 🧠 **Inteligência Artificial** (Google Gemini)
- 🗄️ **Banco de Dados** (PostgreSQL)
- 🐳 **Deploy Pronto** (Docker + VNC)
- 🎯 **APIs Completas** (REST + AI)

**Deploy em 1 comando:** `sudo ./deploy-postgresql.sh`

# Webhook N8N
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/rides

# PostgreSQL
DATABASE_URL=postgresql://user:pass@localhost:5432/rides_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rides_db
DB_USER=rides_user
DB_PASSWORD=senha_segura
```

### 1.4 Executar Localmente
```bash
# Desenvolvimento com hot reload
npm run dev

# Ou produção
npm run prod
```

---

## 🐳 2. Deploy Docker (Produção)

### 2.1 Preparar Servidor
```bash
# Fazer login como root
sudo su -

# Clonar repositório
git clone <seu-repo>
cd research-agent-urban
git checkout ai-agent
```

### 2.2 Configurar Variáveis de Ambiente
```bash
# Editar arquivo de configuração Docker
nano .env.docker
```

**Configurações Docker:**
```env
# ========================================
# CONFIGURAÇÕES DE AMBIENTE - AI AGENT
# ========================================

# 🔐 CREDENCIAIS (OBRIGATÓRIO)
RIDES_USERNAME=seu_email_real@exemplo.com
RIDES_PASSWORD=sua_senha_real
N8N_WEBHOOK_URL=https://seu-n8n-real.com/webhook/rides

# 🤖 CONFIGURAÇÕES AI AGENT (NOVO!)
GEMINI_API_KEY=AIzaSyD... # Sua chave real do Google Gemini
AI_ENABLED=true
AI_MAX_RETRIES=3
AI_SCREENSHOT_ON_ERROR=true
AI_WAIT_TIMEOUT=30000
AI_CONTEXT_MEMORY=true

# 🗄️ CONFIGURAÇÕES POSTGRESQL
DATABASE_URL=postgresql://n8n_user:n8n_pw@n8n_postgres:5432/n8n_db
DB_HOST=n8n_postgres  # Container do PostgreSQL existente
DB_PORT=5432
DB_NAME=n8n_db
DB_USER=n8n_user
DB_PASSWORD=n8n_pw

# 🚀 PORTAS SERVIDOR
PORT=3040
VNC_PORT=6090
NOVNC_PORT=6091

# Outras configurações...
BROWSER_HEADLESS=false
SCRAPE_INTERVAL=2.5
```

### 2.3 Executar Deploy Automatizado
```bash
# Script de deploy completo
chmod +x deploy-postgresql.sh
./deploy-postgresql.sh
```

**O script fará automaticamente:**
- ✅ Verificar Docker e dependências
- ✅ Configurar PostgreSQL
- ✅ Criar diretórios necessários
- ✅ Build da imagem Docker
- ✅ Deploy do container
- ✅ Testar conectividade
- ✅ Verificar AI Agent
- ✅ Mostrar endpoints disponíveis

### 2.4 Verificar Deploy
```bash
# Status dos containers
docker-compose -f docker-compose.postgresql.yml ps

# Logs em tempo real
docker-compose -f docker-compose.postgresql.yml logs -f

# Teste da API
curl http://localhost:3040/api/status
curl http://localhost:3040/api/ai/status
```

---

## 🤖 3. Usando o AI Agent

### 3.1 Inicializar AI Agent
```bash
curl -X POST http://localhost:3040/api/ai/initialize \
  -H "Content-Type: application/json"
```

### 3.2 Comandos em Linguagem Natural
```bash
# Comando simples
curl -X POST http://localhost:3040/api/ai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Navegue até a página de relatórios e me diga o que vê"
  }'

# Login automatizado
curl -X POST http://localhost:3040/api/ai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Faça login no sistema usando as credenciais configuradas"
  }'

# Extração de dados
curl -X POST http://localhost:3040/api/ai/extract \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Extraia todos os dados de corridas da tabela",
    "format": "JSON com campos: id, data, valor, status"
  }'
```

### 3.3 Workflows Complexos
```bash
curl -X POST http://localhost:3040/api/ai/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "Faça login, navegue até relatórios, filtre corridas de hoje, extraia dados e calcule faturamento total"
  }'
```

---

## 📋 4. Endpoints Disponíveis

### 🔄 Sistema Tradicional
- **GET** `/api/status` - Status geral do sistema
- **POST** `/api/rides/scrape` - Scraping tradicional
- **GET** `/api/database/stats` - Estatísticas PostgreSQL
- **GET** `/api/database/dashboard` - Dados para dashboard

### 🤖 AI Agent (NOVO!)
- **POST** `/api/ai/initialize` - Inicializar AI Agent
- **POST** `/api/ai/execute` - Comandos em linguagem natural
- **POST** `/api/ai/navigate` - Navegar para URL
- **POST** `/api/ai/extract` - Extrair dados via AI
- **POST** `/api/ai/analyze` - Analisar página atual
- **POST** `/api/ai/workflow` - Automação complexa
- **GET** `/api/ai/status` - Status do AI Agent
- **POST** `/api/ai/clear` - Limpar histórico

### 🖥️ VNC Access
- **VNC Web**: `http://seu-ip:6091`
- **VNC Desktop**: `seu-ip:6090`

---

## 🔧 5. Troubleshooting

### 5.1 Problemas Comuns

**❌ Erro: "Executable doesn't exist"**
```bash
# Instalar browsers Playwright
npm run install-browsers
# ou
npx playwright install chromium --with-deps
```

**❌ Erro: "Permission denied playwright"**
```bash
chmod +x node_modules/.bin/playwright
./node_modules/.bin/playwright install chromium
```

**❌ Erro: "Host system missing dependencies"**
```bash
sudo apt-get update
sudo apt-get install -y libatk1.0-0t64 libatk-bridge2.0-0t64 \
  libatspi2.0-0t64 libxcomposite1 libxdamage1 libxfixes3 \
  libxrandr2 libgbm1 libxkbcommon0 libasound2t64
```

**❌ Erro: "AI Agent not initialized"**
```bash
# Verificar se GEMINI_API_KEY está configurada
curl http://localhost:3040/api/ai/status

# Inicializar manualmente
curl -X POST http://localhost:3040/api/ai/initialize
```

### 5.2 Logs e Debug
```bash
# Logs Docker
docker logs research-agent-urban-ai -f

# Logs detalhados
docker exec research-agent-urban-ai tail -f /var/log/*.log

# Status PostgreSQL
curl http://localhost:3040/api/database/test-connection

# Status AI Agent
curl http://localhost:3040/api/ai/status
```

### 5.3 Reinicialização
```bash
# Reiniciar container
docker-compose -f docker-compose.postgresql.yml restart

# Rebuild completo
docker-compose -f docker-compose.postgresql.yml down
docker-compose -f docker-compose.postgresql.yml build --no-cache
docker-compose -f docker-compose.postgresql.yml up -d
```

---

## 🎯 6. Casos de Uso Avançados

### 6.1 Automação de Relatórios
```javascript
// Comando para AI
{
  "command": "Gere relatório completo de corridas dos últimos 7 dias, incluindo métricas de cancelamento e faturamento"
}
```

### 6.2 Monitoramento Inteligente
```javascript
{
  "workflow": "Monitore a página principal a cada 5 minutos e me avise se aparecerem mais de 10 corridas canceladas"
}
```

### 6.3 Análise de Dados
```javascript
{
  "command": "Analise os dados da tela atual e identifique tendências nos horários de pico"
}
```

---

## 💡 7. Configurações Avançadas

### 7.1 Otimizações de Performance
```env
# .env configurações
AI_WAIT_TIMEOUT=15000          # Timeout mais rápido
AI_MAX_RETRIES=2               # Menos tentativas
BROWSER_TIMEOUT=20000          # Browser mais rápido
CACHE_ENABLED=true             # Cache habilitado
```

### 7.2 Configurações de Segurança
```env
VNC_PASSWORD=senha_super_segura
NODE_ENV=production
DB_SSL=true                    # Se usando SSL
```

### 7.3 Configurações de AI
```env
AI_CONTEXT_MEMORY=true         # Memória contextual
AI_SCREENSHOT_ON_ERROR=true    # Screenshots para debug
AI_ENABLED=true                # AI habilitada
```

---

## 🚀 8. Deploy na Nuvem

### 8.1 AWS/VPS
```bash
# Conectar via SSH
ssh root@seu-vps-ip

# Clonar e configurar
git clone <repo>
cd research-agent-urban
git checkout ai-agent

# Configurar .env.docker com suas credenciais reais
nano .env.docker

# Deploy
./deploy-postgresql.sh
```

### 8.2 Verificação Final
```bash
# Testar endpoints
curl http://seu-vps-ip:3040/api/status
curl http://seu-vps-ip:3040/api/ai/status

# Acessar VNC
# Abrir browser: http://seu-vps-ip:6091
```

---

## ✅ 9. Checklist de Deploy

### 🔧 Preparação
- [ ] Servidor com Ubuntu/Debian
- [ ] Docker e Docker Compose instalados
- [ ] PostgreSQL existente funcionando
- [ ] Google Gemini API Key obtida
- [ ] Credenciais do sistema Rides

### ⚙️ Configuração  
- [ ] Arquivo `.env.docker` configurado
- [ ] GEMINI_API_KEY válida
- [ ] Credenciais RIDES_USERNAME/PASSWORD
- [ ] N8N_WEBHOOK_URL configurada
- [ ] PostgreSQL DATABASE_URL correta

### 🚀 Deploy
- [ ] `./deploy-postgresql.sh` executado
- [ ] Container rodando sem erros
- [ ] API respondendo na porta 3040
- [ ] VNC acessível na porta 6091
- [ ] AI Agent inicializado
- [ ] PostgreSQL conectado

### ✅ Teste
- [ ] `curl /api/status` funcionando
- [ ] `curl /api/ai/status` funcionando  
- [ ] Comando AI simples testado
- [ ] VNC acesso confirmado
- [ ] Logs sem erros críticos

---

## 🎉 **RESULTADO FINAL**

Após seguir este guia, você terá:

- ✅ **Sistema tradicional** de scraping funcionando
- ✅ **PostgreSQL** integrado e salvando dados
- ✅ **AI Agent** respondendo comandos em linguagem natural
- ✅ **VNC** para acesso visual ao browser
- ✅ **Webhook** N8N funcionando
- ✅ **API completa** com todos os endpoints
- ✅ **Deploy Docker** otimizado para produção

**URLs de Acesso:**
- 🌐 API Principal: `http://seu-ip:3040`
- 🤖 AI Agent: `http://seu-ip:3040/api/ai/status` 
- 🖥️ VNC Web: `http://seu-ip:6091`
- 📊 Dashboard: `http://seu-ip:3040/api/database/dashboard`

---

## 🆘 Suporte

Em caso de problemas:

1. **Verificar logs**: `docker logs research-agent-urban-ai -f`
2. **Testar conectividade**: `curl localhost:3040/api/status`
3. **Reinicializar**: `docker-compose restart`
4. **Rebuild**: `docker-compose build --no-cache && docker-compose up -d`

---

### 🌟 **O FUTURO É AGORA - SEU AI AGENT ESTÁ PRONTO! 🚀**
