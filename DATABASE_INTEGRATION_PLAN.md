# 🗄️ Database Integration Plan - PostgreSQL

## 📋 **Resumo do Projeto**

Evoluir o sistema atual para incluir persistência em banco de dados PostgreSQL, mantendo o webhook mas adicionando armazenamento estruturado para posterior criação de dashboard.

## 🎯 **Objetivos**

### ✅ **Manter Funcionalidades Atuais:**
- Sistema de scraping automático com captcha
- VNC para login manual 
- Webhook para N8N (mantido)
- Cache inteligente (mantido)

### 🆕 **Novas Funcionalidades:**
- **Conexão PostgreSQL** para armazenamento persistente
- **Criação automática de tabelas** baseada nos dados extraídos
- **Inserção de dados** em tempo real durante scraping
- **API de consulta** aos dados históricos
- **Preparação para dashboard** (estrutura de dados otimizada)

## 🏗️ **Arquitetura Planejada**

### 📊 **Fluxo de Dados:**
```
Scraping → Cache Comparison → Webhook (N8N) 
                           └→ PostgreSQL Database
```

### 🗄️ **Estrutura do Banco:**

#### **Tabela Principal: `rides_data`**
```sql
CREATE TABLE rides_data (
  id SERIAL PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  data_hash VARCHAR(32) NOT NULL,
  ride_data JSONB NOT NULL,
  scraped_at TIMESTAMP DEFAULT NOW(),
  session_info JSONB,
  source VARCHAR(50) DEFAULT 'persistent-scraper'
);
```

#### **Tabela de Metadados: `scraping_sessions`**
```sql
CREATE TABLE scraping_sessions (
  id SERIAL PRIMARY KEY,
  session_start TIMESTAMP DEFAULT NOW(),
  session_end TIMESTAMP,
  total_records INTEGER,
  new_records INTEGER,
  has_changes BOOLEAN,
  execution_source VARCHAR(50),
  browser_session_id VARCHAR(100)
);
```

#### **Índices para Performance:**
```sql
CREATE INDEX idx_rides_data_scraped_at ON rides_data(scraped_at);
CREATE INDEX idx_rides_data_table_name ON rides_data(table_name);
CREATE INDEX idx_rides_data_hash ON rides_data(data_hash);
```

## 🔧 **Implementação Técnica**

### **1. Dependências Adicionais:**
```json
{
  "pg": "^8.11.0",
  "@types/pg": "^8.10.0"
}
```

### **2. Novos Serviços:**
- `src/services/databaseManager.ts` - Gerenciamento PostgreSQL
- `src/services/dataTransformer.ts` - Transformação de dados para DB
- `src/api/databaseController.ts` - API para consultas

### **3. Configurações de Ambiente:**
```env
# Database Configuration
DATABASE_URL=postgresql://user:password@localhost:5432/rides_db
DB_HOST=localhost
DB_PORT=5432
DB_NAME=rides_db
DB_USER=postgres
DB_PASSWORD=your_password
DB_SSL=false

# Features Toggle
ENABLE_DATABASE=true
ENABLE_WEBHOOK=true
```

## 📈 **Benefícios da Integração**

### 🎯 **Para Desenvolvimento:**
- **Dados estruturados** para análise avançada
- **Histórico completo** de todas as execuções
- **Query capabilities** para relatórios customizados
- **Backup automático** dos dados

### 🎯 **Para Dashboard Futuro:**
- **Dados normalizados** prontos para visualização
- **Performance otimizada** com índices
- **Aggregations** diretas no banco
- **Real-time updates** via database triggers

## 🚀 **Fases de Implementação**

### **Fase 1: Base Infrastructure** 
- [ ] Configurar conexão PostgreSQL
- [ ] Criar schemas e tabelas
- [ ] Implementar DatabaseManager service
- [ ] Testes básicos de conexão

### **Fase 2: Data Integration**
- [ ] Modificar fluxo de scraping para incluir DB
- [ ] Manter compatibilidade com webhook
- [ ] Implementar transformação de dados
- [ ] Sistema de rollback em caso de erro

### **Fase 3: API & Query Layer**
- [ ] Endpoints para consulta de dados históricos
- [ ] Filtros por data, tabela, sessão
- [ ] Aggregations (contadores, médias, etc)
- [ ] Export capabilities

### **Fase 4: Dashboard Preparation**
- [ ] Views otimizadas para dashboard
- [ ] Procedures para relatórios
- [ ] Real-time subscriptions
- [ ] Performance monitoring

## 📋 **Próximos Passos Imediatos**

1. **Instalar dependências PostgreSQL**
2. **Criar DatabaseManager service**  
3. **Atualizar docker-compose** para incluir PostgreSQL
4. **Implementar migração de schema**
5. **Modificar scraper** para duplo armazenamento (webhook + DB)

---

🎯 **Objetivo:** Criar um sistema robusto que serve tanto para automação (webhook) quanto para análise avançada (PostgreSQL + Dashboard futuro).
