# 🤖 AI Agent - Research Agent Urban

## Transformação Revolucionária: De Scraper Tradicional para Agente Web Inteligente

O **Research Agent Urban** agora possui poderes de **Inteligência Artificial** usando o **Google Gemini API**, permitindo navegação web e automação através de **comandos em linguagem natural**!

## 🚀 Novos Recursos de IA

### ✨ Capacidades do AI Agent

- **📝 Comandos em Linguagem Natural**: Execute ações complexas usando texto comum
- **👁️ Análise Visual**: AI analisa screenshots para tomar decisões inteligentes  
- **🎯 Navegação Inteligente**: Localiza elementos automaticamente
- **📊 Extração de Dados**: Coleta informações seguindo instruções naturais
- **🧠 Memória Contextual**: Lembra ações anteriores para workflows complexos
- **🔄 Automação Avançada**: Workflows multi-step com tomada de decisão

## 🔧 Configuração

### 1. Configurar Google Gemini API

```bash
# Adicionar ao arquivo .env
GEMINI_API_KEY=your_google_gemini_api_key_here
```

### 2. Inicializar o AI Agent

```bash
# POST /api/ai/initialize
curl -X POST http://localhost:3000/api/ai/initialize \
  -H "Content-Type: application/json"
```

## 📋 Endpoints da AI

### 🤖 Inicialização
- **POST** `/api/ai/initialize` - Inicializar AI Agent

### 🎯 Comandos Principais
- **POST** `/api/ai/execute` - Executar comando em linguagem natural
- **POST** `/api/ai/navigate` - Navegar para URL específica
- **POST** `/api/ai/extract` - Extrair dados da página atual
- **POST** `/api/ai/analyze` - Analisar página atual

### 🔧 Utilitários
- **GET** `/api/ai/status` - Status do AI Agent
- **POST** `/api/ai/workflow` - Automação complexa
- **POST** `/api/ai/clear` - Limpar histórico

## 💡 Exemplos de Uso

### 1. Comando Simples de Navegação

```bash
curl -X POST http://localhost:3000/api/ai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Navegue até a página de relatórios"
  }'
```

### 2. Login Automatizado

```bash
curl -X POST http://localhost:3000/api/ai/execute \
  -H "Content-Type: application/json" \
  -d '{
    "command": "Faça login no sistema usando herbert@urban.com como email"
  }'
```

### 3. Extração de Dados

```bash
curl -X POST http://localhost:3000/api/ai/extract \
  -H "Content-Type: application/json" \
  -d '{
    "instruction": "Extraia todos os dados de corridas da tabela atual",
    "format": "JSON com campos: id, data, valor, status"
  }'
```

### 4. Análise da Página

```bash
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "question": "Quantas corridas foram canceladas hoje?"
  }'
```

### 5. Workflow Complexo

```bash
curl -X POST http://localhost:3000/api/ai/workflow \
  -H "Content-Type: application/json" \
  -d '{
    "workflow": "Faça login, navegue até relatórios, filtre corridas de hoje, extraia dados e calcule faturamento total"
  }'
```

## 🎨 Exemplos de Comandos em Linguagem Natural

### 📊 Análise de Dados
- "Analise esta página e me diga quantas corridas foram finalizadas"
- "Procure por informações de faturamento na tela atual"
- "Verifique se há corridas canceladas na lista"

### 🔄 Navegação Inteligente
- "Vá para a página de usuários"
- "Abra o menu de configurações"
- "Clique no botão de relatórios"

### 📝 Preenchimento de Formulários
- "Preencha o formulário com os dados do usuário João Silva"
- "Digite 'São Paulo' no campo de cidade"
- "Selecione a opção 'Ativo' no dropdown de status"

### 🔍 Busca e Filtros
- "Busque por corridas do dia 15/01/2024"
- "Filtre apenas corridas finalizadas"
- "Ordene a tabela por valor decrescente"

## 🧠 Como Funciona

### 1. Análise por IA
- AI recebe comando em linguagem natural
- Analisa screenshot da página atual
- Identifica elementos relevantes

### 2. Planejamento de Ações
- Cria plano de ações (clicks, digitação, navegação)
- Define sequência otimizada de passos
- Considera contexto e estado atual

### 3. Execução Inteligente
- Executa ações uma por uma
- Verifica resultados após cada ação
- Adapta estratégia se necessário

### 4. Coleta de Resultados
- Extrai dados solicitados
- Documenta ações realizadas
- Retorna screenshots e logs

## 🎯 Casos de Uso Avançados

### 1. Automação de Relatórios
```javascript
// Comando: "Gere relatório completo de corridas de ontem"
// AI vai:
// 1. Navegar para página de relatórios
// 2. Configurar filtro de data
// 3. Extrair todos os dados
// 4. Calcular métricas
// 5. Retornar resultado estruturado
```

### 2. Monitoramento Inteligente
```javascript
// Comando: "Monitore se aparecem novas corridas e me avise"
// AI vai:
// 1. Analisar estado atual da página
// 2. Aguardar mudanças
// 3. Detectar novos elementos
// 4. Notificar sobre alterações
```

### 3. Debugging Assistido
```javascript
// Comando: "Verifique se o sistema está funcionando corretamente"
// AI vai:
// 1. Testar login
// 2. Verificar páginas principais
// 3. Validar carregamento de dados
// 4. Reportar status geral
```

## 🔧 Configurações Avançadas

### Personalização do AI Agent

```javascript
// Inicialização com configurações customizadas
{
  "maxRetries": 3,
  "screenshotOnError": true,
  "waitTimeout": 30000,
  "contextMemory": true,
  "debugMode": false
}
```

### Contexto Persistente

O AI Agent mantém memória das ações realizadas, permitindo comandos como:
- "Volte para a página anterior"
- "Repita a última busca"
- "Continue de onde parou"

## 🚀 Próximos Passos

1. **Expandir Vocabulário**: Adicionar mais comandos naturais
2. **Integração com Dashboard**: Conectar com interface visual
3. **Alertas Inteligentes**: Notificações baseadas em IA
4. **Aprendizado**: AI aprende padrões de uso
5. **Multi-linguagem**: Comandos em português e inglês

## 🎉 Demonstração Rápida

```bash
# 1. Inicializar
curl -X POST localhost:3000/api/ai/initialize

# 2. Status
curl -X GET localhost:3000/api/ai/status

# 3. Primeiro comando
curl -X POST localhost:3000/api/ai/execute \
  -H "Content-Type: application/json" \
  -d '{"command": "Olá! Analise esta página e me diga o que vê"}'
```

## 💻 Resultado Esperado

```json
{
  "success": true,
  "message": "🤖 Olá! Analisando a página atual...\n\nVejo que estamos na página principal do sistema Urban. Há um menu de navegação no topo com opções para Relatórios, Usuários e Configurações. No centro da tela há uma tabela com dados de corridas, mostrando colunas para ID, Data, Valor e Status. Posso ajudar você a navegar, extrair dados ou realizar qualquer automação que precisar!",
  "data": {
    "page_title": "Urban - Sistema de Gestão",
    "current_url": "https://app.urban.com/dashboard",
    "elements_found": ["navigation_menu", "rides_table", "status_indicators"]
  },
  "screenshots": ["screenshot_analysis_timestamp.png"],
  "timestamp": "2024-01-15T10:30:00Z"
}
```

---

## 🌟 **VAMOS NESSA! A ERA DA AUTOMAÇÃO INTELIGENTE COMEÇOU! 🚀**

Agora o Research Agent Urban não é apenas um scraper - é um **Agente Web Inteligente** capaz de entender e executar comandos complexos em linguagem natural!
