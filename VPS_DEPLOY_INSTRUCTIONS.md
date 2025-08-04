# 🚀 Instruções de Deploy VPS - Research Agent Urban v3.0.0

## 📋 Branch: `vps-deploy-v3`

Esta branch contém a versão completa e otimizada do scraper com integração rides+drivers e configuração Docker pronta para produção.

## 🆕 Novidades da Versão 3.0.0

### ✨ Funcionalidades
- **Scraping Integrado**: Rides + Drivers em uma única sessão de browser
- **Sistema de Cache Inteligente**: Cache separado para drivers com otimização de performance
- **Transformação de Dados**: Normalização e estruturação automática dos dados de drivers
- **Prevenção de Duplicatas**: Sistema robusto para evitar dados duplicados no banco
- **Timeout Otimizado**: 30 segundos por operação com retry automático
- **Intervalo Configurável**: SCRAPE_INTERVAL via variável de ambiente

### 🐳 Docker Otimizado
- **Porta Atualizada**: 3040 (Web UI)
- **Health Checks Melhorados**: Verifica app + conectividade do banco
- **VNC Configurado**: Porta 6091 para monitoramento visual
- **Supervisord**: Gerenciamento de processos com comentários de versão

### 🔧 Banco de Dados
- **PostgreSQL Externo**: Conecta diretamente ao n8n_db (148.230.73.27:5432)
- **Verificação de Conectividade**: Health check testa conexão ao banco
- **Cache Inteligente**: Otimização para reduzir consultas desnecessárias

## 🚀 Comandos para Deploy na VPS

### 1. Clone da Branch na VPS
```bash
# Navegar para o diretório do projeto
cd /path/to/research-agent-urban

# Fazer fetch das branches
git fetch origin

# Checkout da nova branch
git checkout vps-deploy-v3

# Pull para garantir última versão
git pull origin vps-deploy-v3
```

### 2. Configurar Variáveis de Ambiente
```bash
# Copiar exemplo do .env
cp .env.example .env

# Editar variáveis (ajustar conforme necessário)
nano .env
```

**Variáveis essenciais:**
```env
# Aplicação
PORT=3040
NODE_ENV=production
HEADLESS_MODE=true
SCRAPE_INTERVAL=5

# URLs de Login
RIDES_LOGIN_URL=https://urban.com.br/login
DRIVERS_LOGIN_URL=https://urban.com.br/drivers/login

# Banco de dados (PostgreSQL externo)
DATABASE_URL=postgres://n8n_user:n8n_pw@148.230.73.27:5432/n8n_db?sslmode=disable

# Webhook n8n
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/rides-data

# Timeouts
BROWSER_TIMEOUT=30000
PAGE_LOAD_TIMEOUT=30000
ELEMENT_TIMEOUT=10000
```

### 3. Build e Deploy Docker
```bash
# Parar containers existentes (se houver)
docker-compose down

# Build da nova imagem
docker-compose build

# Iniciar em background
docker-compose up -d

# Verificar logs
docker-compose logs -f
```

### 4. Verificações de Saúde

#### Health Check da Aplicação
```bash
curl http://localhost:3040/api/status
```

#### Health Check do Banco
```bash
curl http://localhost:3040/api/database/test-connection
```

#### Acesso VNC (Monitoramento Visual)
- **noVNC**: http://VPS_IP:6091
- **VNC direto**: VPS_IP:5902

### 5. Monitoramento de Logs
```bash
# Logs em tempo real
docker-compose logs -f

# Logs específicos do scraper
docker-compose logs -f research-agent-urban

# Logs específicos do VNC
docker-compose logs -f novnc
```

## 📊 Endpoints da API

### Status da Aplicação
- **GET** `/api/status` - Status geral da aplicação
- **GET** `/api/database/test-connection` - Teste de conectividade do banco

### Controle do Scraper
- **POST** `/api/scrape/rides/run-once` - Executar scraping único de rides
- **POST** `/api/scrape/drivers/run-once` - Executar scraping único de drivers
- **GET** `/api/scrape/status` - Status do scraping

### Monitoramento
- **GET** `/api/monitoring/start` - Iniciar monitoramento automático
- **GET** `/api/monitoring/stop` - Parar monitoramento automático
- **POST** `/api/monitoring/run-once` - Executar ciclo único de monitoramento

## 🔧 Configurações Avançadas

### Ajustar Intervalo de Scraping
```bash
# Editar docker-compose.yml
nano docker-compose.yml

# Alterar SCRAPE_INTERVAL (em minutos)
environment:
  - SCRAPE_INTERVAL=10  # Executa a cada 10 minutos
```

### Debug Mode
```bash
# Habilitar modo debug
environment:
  - HEADLESS_MODE=false  # Mostra browser no VNC
  - DEBUG=true
```

### Backup de Dados
```bash
# Backup do cache de drivers
docker cp research-agent-urban:/app/data ./backup-data

# Backup de logs
docker-compose logs > scraper-logs-$(date +%Y%m%d).log
```

## 🚨 Troubleshooting

### Container não inicia
```bash
# Verificar logs de erro
docker-compose logs

# Rebuildar imagem
docker-compose build --no-cache
docker-compose up -d
```

### Problemas de conexão com banco
```bash
# Testar conectividade
curl http://localhost:3040/api/database/test-connection

# Verificar variáveis de ambiente
docker-compose exec research-agent-urban env | grep DATABASE
```

### Browser travado no VNC
```bash
# Reiniciar container
docker-compose restart research-agent-urban

# Verificar processo browser
docker-compose exec research-agent-urban ps aux | grep chrome
```

### Performance lenta
```bash
# Ajustar recursos Docker
# Editar docker-compose.yml
services:
  research-agent-urban:
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '1.0'
```

## 📈 Métricas e Monitoramento

### Logs Importantes
- `🚀 Iniciando monitoramento automático` - Início do monitoramento
- `📊 Dados de rides extraídos: X registros` - Contagem de rides
- `👥 Drivers processados: X registros` - Contagem de drivers
- `✅ Dados enviados para n8n` - Sucesso no envio
- `❌ Erro durante scraping` - Falhas no processo

### Indicadores de Saúde
- **Status 200** nos health checks
- **Logs sem erros** por mais de 30 minutos
- **Dados sendo enviados** para n8n regularmente
- **VNC acessível** e mostrando interface

## 🔄 Atualizações Futuras

Para atualizações, simplesmente:
```bash
git pull origin vps-deploy-v3
docker-compose build
docker-compose up -d
```

---

## 📞 Suporte

- **Logs em tempo real**: `docker-compose logs -f`
- **Acesso VNC**: http://VPS_IP:6091
- **Health checks**: http://VPS_IP:3040/api/status

**Versão**: 3.0.0  
**Branch**: vps-deploy-v3  
**Docker**: Otimizado para produção  
**Database**: PostgreSQL externo (n8n_db)
