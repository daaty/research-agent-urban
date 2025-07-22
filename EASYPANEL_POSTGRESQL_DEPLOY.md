# 🚀 Deploy EasyPanel - PostgreSQL Version

## 📋 **Configuração no EasyPanel**

### 🔧 **Configurações Básicas:**

**URL do Repositório:**
```
https://github.com/daaty/research-agent-urban
```

**Branch:**
```
database-integration
```

**Caminho de Build:**
```
/
```

**Dockerfile:**
```
Dockerfile
```

### 🔌 **Portas Expostas:**

| Serviço | Porta | Descrição |
|---------|-------|-----------|
| API Web | `3040` | Endpoints da aplicação + PostgreSQL |
| noVNC | `6091` | Interface web do VNC |
| VNC | `6090` | Conexão direta VNC |

### 🗄️ **Pré-requisitos na VPS:**

1. **PostgreSQL instalado e rodando:**
   ```bash
   sudo apt update
   sudo apt install postgresql postgresql-contrib
   
   # Configurar usuário postgres
   sudo -u postgres psql
   ALTER USER postgres PASSWORD 'senha123';
   CREATE DATABASE rides_db;
   \q
   ```

2. **Configurar PostgreSQL para aceitar conexões:**
   ```bash
   # Editar postgresql.conf
   sudo nano /etc/postgresql/*/main/postgresql.conf
   # Adicionar: listen_addresses = '*'
   
   # Editar pg_hba.conf
   sudo nano /etc/postgresql/*/main/pg_hba.conf
   # Adicionar: host all all 172.0.0.0/8 md5
   
   # Reiniciar PostgreSQL
   sudo systemctl restart postgresql
   ```

### ⚙️ **Variáveis de Ambiente (EasyPanel):**

```bash
# 🔐 CREDENCIAIS (OBRIGATÓRIAS)
RIDES_USERNAME=seu_email_real@exemplo.com
RIDES_PASSWORD=sua_senha_real
N8N_WEBHOOK_URL=https://seu-n8n-real.com/webhook/rideswebscrap

# 🗄️ POSTGRESQL (JÁ CONFIGURADO)
ENABLE_DATABASE=true
DATABASE_URL=postgresql://postgres:senha123@host.docker.internal:5432/rides_db
DB_PASSWORD=senha123

# 🖥️ VNC
VNC_PASSWORD=suasenhaVNC123

# ⏰ SCRAPING
SCRAPE_INTERVAL=2.5
```

### 🌐 **URLs de Acesso:**

Depois do deploy, suas URLs serão:

- **API Principal:** `https://seu-dominio:3040`
- **VNC Web:** `https://seu-dominio:6091/vnc.html`
- **Status:** `https://seu-dominio:3040/api/status`
- **Database Stats:** `https://seu-dominio:3040/api/database/stats`

### 🔍 **Endpoints Exclusivos da Versão PostgreSQL:**

```bash
# Testar conexão PostgreSQL
GET /api/database/test-connection

# Ver estatísticas do banco
GET /api/database/stats

# Dados últimas 24h
GET /api/database/recent

# Dashboard data
GET /api/database/dashboard

# Buscar por período
POST /api/database/query
{
  "startDate": "2025-01-01",
  "endDate": "2025-01-31",
  "tableName": "optional"
}
```

### 🚀 **Passos no EasyPanel:**

1. **Criar nova App:**
   - Nome: `research-agent-postgresql`
   - Tipo: `Docker Compose`

2. **Configurar Source:**
   - Repository: `https://github.com/daaty/research-agent-urban`
   - Branch: `database-integration`
   - Build Path: `/`

3. **Configurar Portas:**
   - `3040` → `80` (HTTP)
   - `6091` → `6091` (noVNC)

4. **Adicionar Environment Variables** (acima)

5. **Deploy!**

### ✅ **Verificação Pós-Deploy:**

```bash
# 1. Status geral
curl https://seu-dominio:3040/

# 2. Status detalhado
curl https://seu-dominio:3040/api/status

# 3. Teste PostgreSQL
curl https://seu-dominio:3040/api/database/test-connection

# 4. Scraping manual
curl -X POST https://seu-dominio:3040/api/rides/scrape
```

### 🔧 **Troubleshooting:**

**Se PostgreSQL não conectar:**
1. Verificar se PostgreSQL está rodando na VPS
2. Verificar firewall (porta 5432)
3. Verificar configurações pg_hba.conf
4. Logs: Ver logs do container no EasyPanel

**Se VNC não aparecer:**
1. Verificar porta 6091 exposta
2. Testar: `https://seu-dominio:6091/vnc.html`

### 📊 **Diferenças da Versão Anterior:**

| Funcionalidade | Versão Anterior | Versão PostgreSQL |
|---------------|-----------------|-------------------|
| **Portas** | 3030, 6080 | 3040, 6090, 6091 |
| **API** | Webhook apenas | Webhook + PostgreSQL |
| **Dados** | Temporários | Persistentes |
| **Dashboard** | Não | Preparado |
| **Análises** | Limitadas | Completas |

### 🎉 **Resultado:**

✅ **Versão anterior** continua rodando nas portas antigas  
✅ **Nova versão PostgreSQL** roda nas novas portas  
✅ **Ambas funcionam simultaneamente** na mesma VPS  
✅ **Zero downtime** durante migração  

Perfeito para testar e migrar gradualmente! 🚀
