# 🐳 DEPLOY VIA PORTAINER STACK - RESEARCH AGENT URBAN

## 📋 PASSO A PASSO PARA DEPLOY

### 1️⃣ **Preparar o Servidor VPS**

```bash
# Criar diretórios necessários
sudo mkdir -p /opt/research-agent-urban/{data,browser-data,cache}
sudo chown -R 1000:1000 /opt/research-agent-urban
```

### 2️⃣ **Configurar no Portainer**

1. **Acessar Portainer** → **Stacks** → **Add Stack**

2. **Nome do Stack**: `research-agent-urban`

3. **Método**: `Repository`

4. **Repository URL**: `https://github.com/seu-usuario/research-agent-urban`

5. **Compose Path**: `docker-compose.yml`

6. **Configurar Variáveis de Ambiente**:

```env
# ✅ VARIÁVEIS OBRIGATÓRIAS
RIDES_USERNAME=seu_usuario_aqui
RIDES_PASSWORD=sua_senha_aqui
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/webhook-id

# ⚙️ VARIÁVEIS OPCIONAIS (valores padrão)
RIDES_LOGIN_URL=https://carreira.ridesapp.com.br/driver/login
BROWSER_HEADLESS=true
BROWSER_TIMEOUT=30000
SCRAPE_INTERVAL=15
MAX_RETRIES=3
CACHE_ENABLED=true
PORT=3000
NODE_ENV=production
TZ=America/Sao_Paulo
```

### 3️⃣ **Deploy do Stack**

1. Clicar em **Deploy the Stack**
2. Aguardar o build e inicialização (pode levar 3-5 minutos)
3. Verificar logs no Portainer

### 4️⃣ **Verificar Status**

```bash
# Verificar se o container está rodando
docker ps | grep research-agent-urban

# Ver logs em tempo real
docker logs -f research-agent-urban

# Testar API
curl http://localhost:3000/health
```

### 5️⃣ **Acessar a Aplicação**

- **API Health**: `http://seu-servidor:3000/health`
- **Logs**: Visualizar no Portainer → Containers → research-agent-urban → Logs

## 🔧 CONFIGURAÇÕES AVANÇADAS

### **Recursos do Container**
- **Memória**: 1GB (limite) / 512MB (reservado)
- **CPU**: 0.5 core (limite) / 0.25 core (reservado)

### **Volumes Persistentes**
- `/opt/research-agent-urban/data` → Dados do cache
- `/opt/research-agent-urban/browser-data` → Dados do navegador
- `/opt/research-agent-urban/cache` → Cache do sistema

### **Rede**
- **Porta**: 3000 (configurável via PORT)
- **Subnet**: 172.20.0.0/16
- **Health Check**: Cada 30 segundos

## 🚨 TROUBLESHOOTING

### **Container não inicia**
```bash
# Ver logs detalhados
docker logs research-agent-urban

# Verificar permissões
sudo chown -R 1000:1000 /opt/research-agent-urban

# Reiniciar stack
docker-compose down && docker-compose up -d
```

### **Erro de navegador**
```bash
# Verificar se Chromium foi instalado
docker exec research-agent-urban chromium-browser --version

# Verificar X11 display
docker exec research-agent-urban echo $DISPLAY
```

### **Problemas de memória**
```bash
# Verificar uso de recursos
docker stats research-agent-urban

# Aumentar limite de memória no docker-compose.yml
# memory: 2G
```

## 📊 MONITORAMENTO

### **Métricas Disponíveis**
- **Health Check**: `http://localhost:3000/health`
- **Logs**: Portainer → Logs
- **Recursos**: Portainer → Stats

### **Alertas Recomendados**
- CPU > 80% por mais de 5 minutos
- Memória > 80% por mais de 5 minutos
- Health check failing por mais de 2 minutos

## 🔄 ATUALIZAÇÕES

### **Atualizar Stack**
1. Fazer push das mudanças no GitHub
2. Portainer → Stacks → research-agent-urban → Editor
3. Clicar em **Pull and redeploy**

### **Rollback**
1. Reverter commit no GitHub
2. Fazer **Pull and redeploy** no Portainer

## ✅ CHECKLIST FINAL

- [ ] Servidor VPS preparado
- [ ] Diretórios criados com permissões corretas
- [ ] Variáveis de ambiente configuradas
- [ ] Stack deployado com sucesso
- [ ] Health check passando
- [ ] Logs sem erros críticos
- [ ] Webhook n8n recebendo dados
- [ ] Sistema de cache funcionando

## 📞 SUPORTE

Em caso de problemas:
1. Verificar logs no Portainer
2. Testar health check
3. Verificar variáveis de ambiente
4. Conferir permissões dos diretórios
5. Reiniciar o stack se necessário
