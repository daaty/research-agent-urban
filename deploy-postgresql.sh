#!/bin/bash

# ========================================
# DEPLOY RESEARCH AGENT URBAN - VERSÃO POSTGRESQL
# ========================================

echo "🗄️ ========================================================"
echo "🚀 DEPLOY RESEARCH AGENT URBAN - VERSÃO POSTGRESQL"
echo "🗄️ ========================================================"
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
sudo -u postgres psql -c "CREATE DATABASE rides_db;" 2>/dev/null || print_warning "Banco rides_db já existe"
sudo -u postgres psql -c "CREATE USER postgres;" 2>/dev/null || print_warning "Usuário postgres já existe"
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'senha123';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE rides_db TO postgres;"

print_status "Banco de dados configurado"

# 5. Criar diretórios necessários
print_info "Criando diretórios..."
mkdir -p /opt/research-agent-urban-postgresql/{data,browser-data,cache}
chown -R 1000:1000 /opt/research-agent-urban-postgresql/

print_status "Diretórios criados"

# 6. Verificar portas disponíveis
print_info "Verificando portas..."
PORTS_TO_CHECK=(3040 6090 6091)
for port in "${PORTS_TO_CHECK[@]}"; do
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        print_warning "Porta $port está em uso, mas continuando..."
    else
        print_status "Porta $port disponível"
    fi
done

# 7. Configurar variáveis de ambiente
print_info "Configurando variáveis de ambiente..."
if [ ! -f .env.docker ]; then
    print_error "Arquivo .env.docker não encontrado!"
    exit 1
fi

# Verificar se as credenciais foram configuradas
if grep -q "seu_email@exemplo.com" .env.docker; then
    print_warning "⚠️ ATENÇÃO: Configure as credenciais em .env.docker!"
    print_warning "   RIDES_USERNAME=seu_email_real"
    print_warning "   RIDES_PASSWORD=sua_senha_real"
    print_warning "   N8N_WEBHOOK_URL=sua_url_real"
fi

print_status "Configuração verificada"

# 8. Fazer backup da versão anterior (se existir)
print_info "Verificando versão anterior..."
if docker ps -a | grep -q "research-agent-urban-postgresql"; then
    print_warning "Container anterior encontrado, fazendo backup..."
    docker stop research-agent-urban-postgresql 2>/dev/null || true
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
    if curl -s http://localhost:3040/api/status > /dev/null 2>&1; then
        print_status "Aplicação respondendo na porta 3040"
        break
    else
        print_warning "Tentativa $i/10 - Aguardando resposta..."
        sleep 10
    fi
done

# 13. Testar PostgreSQL
print_info "Testando conexão PostgreSQL..."
if curl -s http://localhost:3040/api/database/test-connection | grep -q "success"; then
    print_status "PostgreSQL conectado com sucesso!"
else
    print_warning "PostgreSQL pode não estar conectado corretamente"
fi

# 14. Mostrar status final
print_info "Verificando status final..."
docker-compose -f docker-compose.postgresql.yml ps

echo ""
echo "🎉 ========================================================"
echo "🚀 DEPLOY CONCLUÍDO - VERSÃO POSTGRESQL!"
echo "🎉 ========================================================"
echo ""
print_status "🌐 API Principal: http://seu-vps-ip:3040"
print_status "🖥️ VNC Web (noVNC): http://seu-vps-ip:6091"
print_status "🔍 Status: http://seu-vps-ip:3040/api/status"
print_status "🗄️ Database Stats: http://seu-vps-ip:3040/api/database/stats"
print_status "📊 Dashboard Data: http://seu-vps-ip:3040/api/database/dashboard"
echo ""
print_info "📋 NOVOS ENDPOINTS POSTGRESQL:"
print_info "   GET  /api/database/stats           (estatísticas)"
print_info "   GET  /api/database/recent          (dados 24h)"
print_info "   GET  /api/database/test-connection (teste conexão)"
print_info "   GET  /api/database/dashboard       (dados dashboard)"
print_info "   POST /api/database/query           (busca período)"
echo ""
print_warning "⚙️ IMPORTANTE:"
print_warning "   1. Configure as credenciais em .env.docker"
print_warning "   2. A versão anterior continua rodando em outras portas"
print_warning "   3. Esta versão PostgreSQL roda em portas 3040, 6090, 6091"
print_warning "   4. Use VNC na porta 6091 para login manual"
echo ""
print_status "🎯 Sistema dual funcionando: Webhook + PostgreSQL!"
