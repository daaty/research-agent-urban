# Project: Research Agent

**Objetivo:**
Este projeto automatiza a extração e sumarização de conteúdo de company websites e LinkedIn profiles usando um LLM local (Mistral via Ollama) e técnicas de web scraping. Agora também inclui funcionalidade para scraping de páginas autenticadas com extração de dados de tabelas.

## 🎯 Funcionalidades Principais

### 1. Scraping Original (LinkedIn + Websites)
* Scrapes designated company websites e LinkedIn profiles (requires authenticated session for LinkedIn).
* Utilizes a local Mistral LLM instance via Ollama for content summarization.
* Employs carefully engineered prompts to generate structured summaries.
* Operates without reliance on external LLM APIs.

### 2. 🆕 Scraping de Páginas Autenticadas (Rides Dashboard)
* ✅ **Login automatizado** em páginas que exigem autenticação
* ✅ **Extração de dados de múltiplas tabelas** (até 5 tabelas diferentes)
* ✅ **Integração com n8n** para envio dos dados extraídos
* ✅ **Detecção e tratamento de tabelas vazias**
* ✅ **Captura de tráfego de rede** para debug

## 🚀 Status do Projeto

### ✅ CONCLUÍDO - Fase 1: Autenticação
- Login automatizado funcionando
- Acesso ao dashboard autenticado
- Navegação pós-login confirmada

### 🔄 EM ANDAMENTO - Fase 2: Extração de Dados
- Identificação das tabelas no dashboard
- Implementação da extração de dados
- Estruturação dos dados extraídos

### 📋 PLANEJADO - Fase 3: Integração
- Envio dos dados para n8n
- Resumo dos dados com LLM local
- Monitoramento e logs

## 🛠️ **Technology Stack:**
* **Web Scraping:** Playwright / Puppeteer
* **LLM Engine:** Ollama (running Mistral model locally)
* **Language:** TypeScript (following Clean Architecture principles)
* **Authentication:** Automated login with session management

## 📚 Documentação Detalhada

- [`PROGRESS.md`](PROGRESS.md) - Progresso detalhado e lições aprendidas
- [`USAGE_EXAMPLES.md`](USAGE_EXAMPLES.md) - Exemplos de uso e troubleshooting

## 🎯 Endpoints Disponíveis

### Scraping Original
- `POST /api/scrape` - Scraping original com LinkedIn
- `POST /api/scrape-tables` - Scraping genérico de tabelas

### Rides Dashboard (Autenticado)
- `POST /api/rides/test-enter-login` - ✅ Login funcional
- `POST /api/rides/test-simple` - Teste de acesso básico
- `POST /api/rides/investigate-form` - Investigação de formulários
- `POST /api/rides/capture-network` - Captura de tráfego de rede
- `POST /api/rides/scrape-full` - 🔄 Scraping completo (em desenvolvimento)

## **Example Output (Loopio):**

* **Website Summary:** Loopio is presented as an RFP automation platform simplifying response management with features like a secure content library and AI assistance. It emphasizes collaboration, consistency, integration capabilities (CRM, Slack, etc.), flexible pricing, and dedicated support. Its AI is user-controlled, focusing on data-driven insights, human review, and quality control.
* **LinkedIn Summary (Profile: Matt York):** Key topics identified include Machine Learning opportunities at Loopio and Employee Appreciation Day reflections. Updates mention hiring for a Senior ML Engineer (Remote, Toronto-based) and celebrating team growth despite challenges. No formal blog posts were detected; content resembled internal updates. No major company announcements beyond hiring and cultural posts were noted.

## **Usage:**
1.  Ensure the Ollama server is running with the Mistral model available (`ollama run mistral`).
2.  Start the Node.js backend server (e.g., `npm run dev`).
3.  Send a POST request to the desired endpoint:

### Scraping Original:
```bash
curl -X POST http://localhost:3000/api/scrape \
-H "Content-Type: application/json" \
-d '{"companyUrl":"https://loopio.com/", "linkedinUrl":"https://www.linkedin.com/in/myork/"}'
```

### Rides Dashboard Login:
```bash
curl -X POST https://sturdy-space-spoon-7g5gx9w5r6whrpvv-3000.app.github.dev/api/rides/test-enter-login \
-H "Content-Type: application/json" \
-d '{}'
```

4.  The API will return a JSON response containing the generated summaries or extracted data.

## 🔧 Setup

```bash
# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Start development server
npm run dev
```

## 🔐 Tratamento de Captcha

### ✅ NOVIDADE: Sistema Híbrido para Captcha

O sistema agora detecta automaticamente quando há captcha na página de login e oferece uma solução híbrida:

- **Detecção automática** de captcha
- **Login manual** quando necessário  
- **Continuidade automática** do scraping após login manual
- **Sessão persistente** - login manual é feito apenas uma vez

### 🚀 Como Usar com Captcha

#### Opção 1: Fluxo Automático (Recomendado)
```bash
# O sistema detecta captcha automaticamente
POST /api/rides/scrape

# Se houver captcha, faz login manual no navegador e tenta novamente
POST /api/rides/scrape
```

#### Opção 2: Fluxo Manual Controlado
```bash
# 1. Verificar status
GET /api/rides/login-status

# 2. Abrir navegador para login manual
POST /api/rides/open-browser-login

# 3. Aguardar confirmação (após login manual)
POST /api/rides/wait-manual-login

# 4. Executar scraping
POST /api/rides/scrape
```

📖 **Documentação completa:** [`CAPTCHA_GUIDE.md`](CAPTCHA_GUIDE.md)

## 🗂️ Sistema de Cache Inteligente

### ✅ NOVIDADE: Apenas Dados Novos

O sistema agora envia **apenas dados novos** para o webhook, eliminando duplicação na planilha:

- **Primeira execução**: Todos os dados são novos
- **Execuções subsequentes**: Apenas dados que mudaram
- **Sem mudanças**: Webhook não é enviado
- **Zero duplicação**: Planilha recebe apenas registros únicos

### 📊 Comparação

**Antes (Problema):**
```json
{
  "data": [
    { "rows": [["Corrida 1"], ["Corrida 2"]] }
  ]
}
```

**Agora (Solução):**
```json
{
  "onlyNewData": true,
  "differences": [
    {
      "tableName": "Completed Rides",
      "newRecords": [["Corrida 2"]], // Apenas a nova
      "totalNewRecords": 1
    }
  ]
}
```

### 🔧 Endpoints do Cache

```bash
# Verificar estatísticas do cache
GET /api/cache/stats

# Limpar cache (força todos os dados como novos)
POST /api/cache/clear

# Simular webhook (ver o que seria enviado)
POST /api/rides/simulate-webhook
```

📖 **Documentação completa:** [`CACHE_SYSTEM_GUIDE.md`](CACHE_SYSTEM_GUIDE.md)
