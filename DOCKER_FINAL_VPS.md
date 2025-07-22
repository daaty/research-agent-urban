# 🐳 Docker Final para VPS - Research Agent Urban AI

## 📋 Status do Desenvolvimento

### ✅ O que está FUNCIONANDO:
- ✅ **AI Agent completo** com Gemini API
- ✅ **Screenshot automático** com Xvfb
- ✅ **Browser automation** completo
- ✅ **Auto-scraping** com controle adaptativo
- ✅ **Todas as dependências** instaladas e testadas
- ✅ **VNC configuration** corrigida (sem senha para simplicidade)

### 🎯 Configuração Final VPS

#### 1. Docker Compose Production (PostgreSQL)
```bash
# Use: docker-compose.postgresql.yml
# Ports: 3040 (API), 6090 (VNC), 6091 (noVNC), 5432 (PostgreSQL)
```

#### 2. VNC Simplificado
```bash
# supervisor.conf configurado com:
# x11vnc -nopw (sem senha para começar)
# Pode adicionar senha depois se necessário
```

#### 3. Deploy Script Pronto
```bash
# Use: deploy-postgresql.sh
# Instala Docker, configura PostgreSQL, sobe containers
```

## 🚀 Comandos para VPS

### Passo 1: Copiar arquivos
```bash
# Copie estes arquivos para o VPS:
- docker-compose.postgresql.yml
- Dockerfile  
- supervisord.conf
- deploy-postgresql.sh
- src/ (pasta completa)
- package.json
- tsconfig.json
```

### Passo 2: Deploy no VPS
```bash
chmod +x deploy-postgresql.sh
./deploy-postgresql.sh
```

### Passo 3: Verificar serviços
```bash
# API
curl http://localhost:3040/api/health

# VNC (browser)
http://SEU_VPS_IP:6091
```

## 🔧 Configurações de Ambiente

### Variables Principais:
```env
GEMINI_API_KEY=sua_chave_aqui
DATABASE_URL=postgresql://agent_user:agent_password@postgresql:5432/research_agent_db
VNC_PASSWORD=suasenhaVNC123  # opcional
```

## 📱 Acesso ao Sistema

1. **API**: `http://SEU_VPS_IP:3040`
2. **noVNC**: `http://SEU_VPS_IP:6091` 
3. **VNC direto**: `SEU_VPS_IP:6090`

## 🐛 Troubleshooting

### Se VNC não funcionar:
```bash
docker-compose logs research-agent
docker exec -it research-agent supervisorctl status
```

### Se API não responder:
```bash
docker-compose logs research-agent
curl http://localhost:3040/api/health
```

## 🎯 Próximos Passos

1. **Deploy no VPS** com arquivos prontos
2. **Testar VNC** (sem senha primeiro)
3. **Configurar monitoramento** se necessário
4. **Adicionar autenticação VNC** se quiser

---

**Status**: ✅ PRONTO PARA VPS DEPLOY
**Última atualização**: Configuração VNC corrigida, Docker otimizado
