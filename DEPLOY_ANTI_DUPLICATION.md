# 🚀 Deploy - Branch duplicate-database-prevention

## 📋 **Resumo das Alterações**

Esta branch contém o **sistema anti-duplicação melhorado** que resolve o problema de duplicação de dados a cada restart da aplicação.

### 🎯 **Problema Resolvido**
- Hash incluía timestamp causando duplicação em restarts
- Primeira execução sempre considerava dados como "novos"
- Ausência de constraint de unicidade no banco

## 📦 **Arquivos Modificados/Criados**

### ✅ **Arquivos Modificados:**
1. `src/services/dataTransformer.ts` - Sistema de transformação com IDs únicos
2. `src/services/databaseManager.ts` - UPSERT e constraint UNIQUE
3. `src/services/dataCacheManager.ts` - Cache sem timestamp
4. `package.json` - Novo script de teste

### 🆕 **Arquivos Criados:**
1. `ANTI_DUPLICATION_SYSTEM.md` - Documentação completa
2. `migration-add-unique-constraint.sql` - Script de migração
3. `test-anti-duplication.ts` - Teste automatizado

## 🗄️ **Deploy PostgreSQL**

### 1. **Se Banco Existente (Migração Necessária)**
```bash
# Executar migração para adicionar constraint UNIQUE
psql -h SEU_HOST -U SEU_USER -d rides_db -f migration-add-unique-constraint.sql
```

### 2. **Se Banco Novo**
```bash
# A aplicação criará as tabelas automaticamente com constraint UNIQUE
# Nenhuma migração necessária
```

## 🐳 **Deploy com Docker**

### 1. **Build da Imagem**
```bash
git clone https://github.com/daaty/research-agent-urban.git
cd research-agent-urban
git checkout duplicate-database-prevention
docker build -t research-agent-urban:anti-duplication .
```

### 2. **Docker Compose**
```yaml
version: '3.8'
services:
  research-agent:
    image: research-agent-urban:anti-duplication
    environment:
      - DB_HOST=postgres
      - DB_PORT=5432
      - DB_NAME=rides_db
      - DB_USER=postgres
      - DB_PASSWORD=senha123
      - DATABASE_URL=postgresql://postgres:senha123@postgres:5432/rides_db
    depends_on:
      - postgres
    
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=rides_db
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=senha123
```

### 3. **Deploy em VPS**
```bash
# 1. Clonar e posicionar na branch
git clone https://github.com/daaty/research-agent-urban.git
cd research-agent-urban
git checkout duplicate-database-prevention

# 2. Configurar variáveis de ambiente
cp .env.example .env.docker
# Editar .env.docker com suas configurações

# 3. Executar com docker-compose
docker-compose -f docker-compose.postgresql.yml up -d

# 4. Se banco existente, executar migração
docker exec -i postgres_container psql -U postgres -d rides_db < migration-add-unique-constraint.sql
```

## 🧪 **Testes**

### 1. **Teste Automatizado**
```bash
npm install
npm run test:anti-duplication
```

### 2. **Teste Manual**
```bash
# 1ª execução - deve inserir dados
curl -X POST http://localhost:3000/api/rides/scrape

# 2ª execução - deve atualizar (não duplicar)
curl -X POST http://localhost:3000/api/rides/scrape

# Verificar logs: "X inseridos, Y atualizados"
```

## 📊 **Logs Esperados**

### ✅ **Primeira Execução**
```
✅ Dados processados: 15 inseridos, 0 atualizados
💾 Processando dados completos para PostgreSQL...
✅ Dados salvos no PostgreSQL - Sessão: 123
```

### ✅ **Segunda Execução (mesmos dados)**
```
✅ Dados processados: 0 inseridos, 15 atualizados
ℹ️ Nenhuma mudança detectada - dados não salvos no PostgreSQL
```

## 🔍 **Verificação de Funcionamento**

### 1. **Endpoint de Estatísticas**
```bash
curl http://localhost:3000/api/database/stats
```

### 2. **Verificar Constraint no Banco**
```sql
SELECT 
    conname as constraint_name,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conname = 'unique_ride_hash';
```

### 3. **Verificar Duplicatas (deve retornar 0)**
```sql
SELECT 
    table_name, 
    data_hash, 
    COUNT(*) as duplicates
FROM rides_data 
GROUP BY table_name, data_hash 
HAVING COUNT(*) > 1;
```

## 🎯 **Benefícios Confirmados**

- ✅ **Zero Duplicação** mesmo com restarts
- ✅ **Performance** melhorada com UPSERT
- ✅ **Detecção Inteligente** de mudanças reais
- ✅ **Compatibilidade** com estrutura existente
- ✅ **Logs Detalhados** de INSERT vs UPDATE

## 🚨 **Pontos de Atenção**

1. **Backup** do banco antes da migração
2. **Primeira execução** após migração pode detectar muitas atualizações
3. **Monitorar logs** para verificar INSERT vs UPDATE
4. **Limpar cache** se necessário: `rm -f data/previous-rides-data.json`

## 📞 **Suporte**

- **Documentação**: `ANTI_DUPLICATION_SYSTEM.md`
- **Teste**: `npm run test:anti-duplication`
- **Migração**: `migration-add-unique-constraint.sql`
- **Logs**: Verificar console para "inseridos vs atualizados"
