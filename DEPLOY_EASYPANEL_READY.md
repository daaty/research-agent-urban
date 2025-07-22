# 🚀 Deploy EasyPanel - Versão PostgreSQL

## ✅ **PRONTO PARA DEPLOY!**

### 📋 **Configurações EasyPanel:**

```
URL do Repositório: https://github.com/daaty/research-agent-urban
Ramo: database-integration
Caminho de Build: /
```

### 🌐 **Portas Configuradas (SEM CONFLITO):**

| Serviço | Versão Antiga | Nova Versão PostgreSQL |
|---------|---------------|------------------------|
| API     | 3030         | **3040**              |
| noVNC   | 6080         | **6091**              |
| VNC     | 5901         | **6090**              |

### 🗄️ **PostgreSQL na VPS:**

O sistema está configurado para usar PostgreSQL na própria VPS através de `host.docker.internal`:

```bash
# Configuração automática no container:
DATABASE_URL=postgresql://postgres:senha123@host.docker.internal:5432/rides_db
```

### 🔧 **Variáveis de Ambiente Necessárias:**

No EasyPanel, configure estas variáveis:

```bash
# 🔐 CREDENCIAIS OBRIGATÓRIAS
RIDES_USERNAME=seu_email_real@gmail.com
RIDES_PASSWORD=sua_senha_real
N8N_WEBHOOK_URL=https://seu-n8n-real.com/webhook/rideswebscrap

# 🗄️ POSTGRESQL (Usar PostgreSQL da VPS)
DB_PASSWORD=senha123
VNC_PASSWORD=suaSenhaVNC123

# ✅ Outras configurações já estão nos defaults
```

### 🎯 **Resultado Esperado:**

Após deploy, você terá:

1. **Versão Antiga (Webhook):**
   - API: `http://sua-vps:3030`
   - VNC: `http://sua-vps:6080`

2. **Nova Versão (PostgreSQL):**
   - API: `http://sua-vps:3040`
   - VNC: `http://sua-vps:6091`

### 🧪 **Testar PostgreSQL após Deploy:**

```bash
# Testar conexão PostgreSQL
curl http://sua-vps:3040/api/database/test-connection

# Ver estatísticas
curl http://sua-vps:3040/api/database/stats

# Dados para dashboard
curl http://sua-vps:3040/api/database/dashboard
```

### 📊 **Endpoints API Disponíveis:**

```bash
# Scraping (igual versão anterior)
POST http://sua-vps:3040/api/rides/scrape

# PostgreSQL (NOVOS)
GET  http://sua-vps:3040/api/database/stats
GET  http://sua-vps:3040/api/database/recent
GET  http://sua-vps:3040/api/database/test-connection
GET  http://sua-vps:3040/api/database/dashboard
POST http://sua-vps:3040/api/database/query
```

## 🎉 **DEPLOY SEGURO**

- ✅ Zero conflitos com versão anterior
- ✅ Portas diferentes garantem coexistência
- ✅ Volumes separados (`-postgresql` suffix)
- ✅ Rede isolada
- ✅ Fallback se PostgreSQL falhar

**O sistema está 100% pronto para deploy no EasyPanel!** 🚀
