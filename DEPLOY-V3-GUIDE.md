# 🚀 DEPLOY GUIDE - Research Agent Urban v3.0

## ✅ Configurações Corrigidas para Deploy

### **1. Dockerfile Corrigido:**

- ✅ Porta correta: 3040 (para evitar conflito com EasyPanel)
- ✅ Health check correto: `/health`
- ✅ Auto-scraper v3.0 como main
- ✅ PostgreSQL dependencies incluídas

### **2. Package.json Atualizado:**
- ✅ Main: `dist/auto-scraper.js`
- ✅ Start: `node dist/auto-scraper.js`
- ✅ Version: 3.0.0

### **3. Docker-entrypoint.sh Corrigido:**
- ✅ Verificação de variáveis corretas
- ✅ RIDES_EMAIL (não RIDES_USERNAME)
- ✅ Validação de database

## 🔧 Comandos para Deploy

### **Build da Imagem:**
```bash
docker build -t research-agent-urban:v3.0 .
```

### **Executar Container:**
```bash
docker run -d \
  --name research-agent-v3 \
  -p 3040:3040 \
  -p 6091:6091 \
  -e RIDES_EMAIL="herbert@urbandobrasil.com.br" \
  -e RIDES_PASSWORD="herbert@urban25" \
  -e N8N_WEBHOOK_URL="https://n8n.urbanmt.com.br/webhook-test/rideswebscrap" \
  -e DB_HOST="n8n_postgres" \
  -e DB_USERNAME="n8n_user" \
  -e DB_PASSWORD="n8n_pw" \
  -e DB_NAME="n8n_db" \
  research-agent-urban:v3.0
```

### **Docker Compose (Recomendado):**
```yaml
version: '3.8'
services:
  research-agent-v3:
    build: .
    ports:
      - "3040:3040"
      - "6091:6091"
    environment:
      - RIDES_EMAIL=herbert@urbandobrasil.com.br
      - RIDES_PASSWORD=herbert@urban25
      - N8N_WEBHOOK_URL=https://n8n.urbanmt.com.br/webhook-test/rideswebscrap
      - DB_HOST=n8n_postgres
      - DB_USERNAME=n8n_user
      - DB_PASSWORD=n8n_pw
      - DB_NAME=n8n_db
    networks:
      - n8n_network
    restart: unless-stopped

networks:
  n8n_network:
    external: true
```

## ✅ Verificações Pós-Deploy

### **1. Health Check:**
```bash
curl http://localhost:3040/health
```

**Resposta esperada:**
```json
{
  "status": "ok",
  "service": "Research Agent Urban",
  "version": "3.0.0",
  "timestamp": "...",
  "uptime": 123
}
```

### **2. Logs do Container:**
```bash
docker logs research-agent-v3 -f
```

**Logs esperados:**
```
🚀 Iniciando Research Agent Urban v3.0...
🛡️ Sistema de prevenção de duplicados com PostgreSQL
✅ Configuração concluída.
🌐 Auto-scraper v3.0 será acessível em: http://localhost:3040/health
🖥️ VNC será acessível em: http://localhost:6091/vnc.html
🛡️ Sistema de prevenção de duplicados: ATIVO
```

### **3. VNC Access:**
- URL: `http://localhost:6091/vnc.html`
- Permite visualizar o browser em execução

## 🎯 Resultado Esperado

Após deploy bem-sucedido:
1. ✅ Sistema executando na porta 3040
2. ✅ Health check respondendo
3. ✅ Auto-scraper fazendo login e scraping
4. ✅ Duplicados sendo prevenidos via PostgreSQL
5. ✅ Webhook enviando apenas dados novos
6. ✅ VNC funcionando na porta 6091

## 🚨 Troubleshooting

### **Container não inicia:**
- Verificar variáveis de ambiente
- Verificar logs: `docker logs research-agent-v3`

### **Erro de conexão database:**
- Verificar se container está na mesma network do PostgreSQL
- Verificar credentials do database

### **Build falha:**
- Verificar se todos os arquivos estão commitados
- Usar: `docker build --no-cache -t research-agent-urban:v3.0 .`

## 🎉 Deploy Concluído!

Sistema v3.0 com prevenção de duplicados está pronto para produção! 🚀
