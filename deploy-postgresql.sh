#!/bin/bash

# ========================================
# DEPLOY RESEARCH AGENT URBAN - AI AGENT VERSION
# ========================================

echo "🤖 ========================================================"
echo "🚀 DEPLOY RESEARCH AGENT URBAN - AI AGENT VERSION"
echo "🤖 ========================================================"
echo ""

# Definir cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para printar com cor
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️ $1${NC}"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
   print_error "Este script deve ser executado como root (use sudo)"
   exit 1
fi

# 1. Verificar Docker
print_info "Verificando Docker..."
if ! command -v docker &> /dev/null; then
    print_error "Docker não está instalado!"
    exit 1
fi

if ! docker info &> /dev/null; then
    print_error "Docker não está rodando!"
    exit 1
fi

print_status "Docker verificado"

# 2. Verificar Docker Compose
print_info "Verificando Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    print_error "Docker Compose não está instalado!"
    exit 1
fi

print_status "Docker Compose verificado"

# 3. Verificar PostgreSQL na VPS
print_info "Verificando PostgreSQL..."
if ! command -v psql &> /dev/null; then
    print_warning "PostgreSQL não encontrado, instalando..."
    apt update
    apt install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

print_status "PostgreSQL verificado"

# 4. Configurar PostgreSQL
print_info "Configurando banco de dados..."

# Carregar variáveis de ambiente do .env.docker
if [ -f .env.docker ]; then
    print_info "Carregando variáveis de ambiente..."
    export $(grep -v '^#' .env.docker | xargs)
else
    print_error "Arquivo .env.docker não encontrado!"
    exit 1
fi

# Conectar ao PostgreSQL existente e criar estruturas necessárias
print_info "Criando usuário e banco para Research Agent..."
print_info "Usuário: $DB_USER | Banco: $DB_NAME"

# Criar usuário se não existir
sudo -u postgres psql -c "CREATE USER $DB_USER;" 2>/dev/null || print_warning "Usuário $DB_USER já existe"

# Definir senha para o usuário
sudo -u postgres psql -c "ALTER USER $DB_USER PASSWORD '$DB_PASSWORD';"

# Criar banco se não existir  
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;" 2>/dev/null || print_warning "Banco $DB_NAME já existe"

# Conceder privilégios ao usuário no banco
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"

# Conectar ao banco e conceder privilégios no schema
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT CREATE ON SCHEMA public TO $DB_USER;"

print_status "Usuário $DB_USER e banco $DB_NAME configurados"

# 5. Criar diretórios necessários para AI Agent
print_info "Criando diretórios para AI Agent..."
mkdir -p /opt/research-agent-urban-ai/{data,browser-data,cache,screenshots,ai-logs}
chown -R 1000:1000 /opt/research-agent-urban-ai/

print_status "Diretórios do AI Agent criados"

# 6. Verificar portas disponíveis
print_info "Verificando portas..."
PORTS_TO_CHECK=($PORT $VNC_PORT $NOVNC_PORT)
for port in "${PORTS_TO_CHECK[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Porta $port está em uso, mas continuando..."
    else
        print_status "Porta $port disponível"
    fi
done

# 7. Configurar variáveis de ambiente
print_info "Verificando arquivo de configuração..."
if [ ! -f .env.docker ]; then
    print_error "Arquivo .env.docker não encontrado!"
    exit 1
fi

# Verificar se as credenciais foram configuradas (as variáveis já foram carregadas anteriormente)
if grep -q "seu_email@exemplo.com" .env.docker; then
    print_warning "⚠️ ATENÇÃO: Configure as credenciais em .env.docker!"
    print_warning "   RIDES_USERNAME=seu_email_real"
    print_warning "   RIDES_PASSWORD=sua_senha_real"
    print_warning "   N8N_WEBHOOK_URL=sua_url_real"
    print_warning "   GEMINI_API_KEY=sua_api_key_gemini"
fi

# Verificar se a API Key do Gemini está configurada
if [ -z "$GEMINI_API_KEY" ] || [ "$GEMINI_API_KEY" = "your_google_gemini_api_key_here" ]; then
    print_warning "⚠️ ATENÇÃO: Configure GEMINI_API_KEY em .env.docker para habilitar AI Agent!"
fi

print_status "Configuração verificada"

# 8. Fazer backup da versão anterior (se existir)
print_info "Verificando versão anterior..."
if docker ps -a | grep -q "research-agent-urban"; then
    print_warning "Container anterior encontrado, fazendo backup..."
    docker stop research-agent-urban-ai 2>/dev/null || true
    docker stop research-agent-urban-postgresql 2>/dev/null || true
    docker rename research-agent-urban-ai research-agent-urban-ai-backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
    docker rename research-agent-urban-postgresql research-agent-urban-postgresql-backup-$(date +%Y%m%d-%H%M%S) 2>/dev/null || true
fi

print_status "Backup realizado"

# 9. Build da imagem
print_info "Construindo imagem Docker..."
docker-compose -f docker-compose.postgresql.yml build --no-cache

if [ $? -ne 0 ]; then
    print_error "Falha no build da imagem!"
    exit 1
fi

print_status "Imagem construída com sucesso"

# 10. Deploy do container
print_info "Fazendo deploy do container..."
docker-compose -f docker-compose.postgresql.yml up -d

if [ $? -ne 0 ]; then
    print_error "Falha no deploy!"
    exit 1
fi

print_status "Container iniciado"

# 11. Aguardar inicialização
print_info "Aguardando inicialização (60 segundos)..."
sleep 60

# 12. Verificar health check
print_info "Verificando health check..."
for i in {1..10}; do
    if curl -s http://localhost:$PORT/api/status > /dev/null 2>&1; then
        print_status "Aplicação respondendo na porta $PORT"
        break
    else
        print_warning "Tentativa $i/10 - Aguardando resposta..."
        sleep 10
    fi
done

# 13. Testar AI Agent
print_info "Testando AI Agent..."
if [ ! -z "$GEMINI_API_KEY" ] && [ "$GEMINI_API_KEY" != "your_google_gemini_api_key_here" ]; then
    if curl -s http://localhost:$PORT/api/ai/status | grep -q "success"; then
        print_status "AI Agent inicializado com sucesso!"
    else
        print_warning "AI Agent pode não estar funcionando (verifique GEMINI_API_KEY)"
    fi
else
    print_warning "AI Agent desabilitado (GEMINI_API_KEY não configurada)"
fi

# 14. Mostrar status final
print_info "Verificando status final..."
docker-compose -f docker-compose.postgresql.yml ps

echo ""
echo "🤖 ========================================================"
echo "🚀 DEPLOY CONCLUÍDO - AI AGENT VERSION!"
echo "🤖 ========================================================"
echo ""
print_status "🌐 API Principal: http://seu-vps-ip:$PORT"
print_status "🖥️ VNC Web (noVNC): http://seu-vps-ip:$NOVNC_PORT"
print_status "🔍 Status: http://seu-vps-ip:$PORT/api/status"
print_status "🗄️ Database Stats: http://seu-vps-ip:$PORT/api/database/stats"
print_status "🤖 AI Agent Status: http://seu-vps-ip:$PORT/api/ai/status"
echo ""
print_info "📋 ENDPOINTS TRADICIONAIS:"
print_info "   GET  /api/database/stats           (estatísticas)"
print_info "   GET  /api/database/recent          (dados 24h)"
print_info "   GET  /api/database/test-connection (teste conexão)"
print_info "   GET  /api/database/dashboard       (dados dashboard)"
print_info "   POST /api/database/query           (busca período)"
echo ""
print_info "🤖 NOVOS ENDPOINTS AI AGENT:"
print_info "   POST /api/ai/initialize            (inicializar AI)"
print_info "   POST /api/ai/execute               (comandos naturais)"
print_info "   POST /api/ai/navigate              (navegar com AI)"
print_info "   POST /api/ai/extract               (extrair dados AI)"
print_info "   POST /api/ai/analyze               (analisar página)"
print_info "   POST /api/ai/workflow              (automação complexa)"
print_info "   GET  /api/ai/status                (status AI)"
print_info "   POST /api/ai/clear                 (limpar histórico)"
echo ""
print_warning "⚙️ IMPORTANTE - AI AGENT:"
print_warning "   1. Configure GEMINI_API_KEY no .env.docker para habilitar IA"
print_warning "   2. Usuário PostgreSQL: $DB_USER / Banco: $DB_NAME"
print_warning "   3. AI Agent usa portas $PORT, $VNC_PORT, $NOVNC_PORT"
print_warning "   4. Use VNC na porta $NOVNC_PORT para login manual"
print_warning "   5. Comandos em linguagem natural via /api/ai/execute"
echo ""
print_status "🎯 Sistema COMPLETO: Webhook + PostgreSQL + AI Agent!"
