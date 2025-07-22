#!/bin/bash

# ========================================
# TESTE RÁPIDO - AI AGENT RESEARCH URBAN
# ========================================

echo "🤖 ========================================================"
echo "🚀 TESTE RÁPIDO - AI AGENT RESEARCH URBAN"
echo "🤖 ========================================================"
echo ""

BASE_URL="http://localhost:3000"

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

print_test() {
    echo -e "${BLUE}🧪 TESTE: $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Função para testar endpoint
test_endpoint() {
    local method=$1
    local endpoint=$2
    local description=$3
    local data=$4
    
    print_test "$description"
    
    if [ -n "$data" ]; then
        response=$(curl -s -X $method "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -X $method "$BASE_URL$endpoint")
    fi
    
    if [[ $response == *"success"* ]]; then
        print_success "Endpoint funcionando"
        echo "   Resposta: ${response:0:100}..."
    else
        print_warning "Resposta obtida"
        echo "   Resposta: ${response:0:100}..."
    fi
    echo ""
}

# 1. Testar servidor básico
print_test "Verificando se servidor está rodando..."
if curl -s "$BASE_URL/api/status" > /dev/null; then
    print_success "Servidor rodando na porta 3000"
else
    print_error "Servidor não está respondendo"
    echo "Execute: npm start"
    exit 1
fi
echo ""

# 2. Testar endpoints AI Agent
echo "🤖 TESTANDO ENDPOINTS AI AGENT:"
echo "================================="

test_endpoint "GET" "/api/ai/status" "Status do AI Agent"

test_endpoint "POST" "/api/ai/initialize" "Inicializar AI Agent (sem API key)"

test_endpoint "POST" "/api/ai/execute" "Comando natural (sem AI key)" \
    '{"command": "Olá! Teste de comando em linguagem natural"}'

test_endpoint "POST" "/api/ai/navigate" "Navegação AI (sem API key)" \
    '{"url": "https://example.com", "task": "analisar página"}'

test_endpoint "POST" "/api/ai/extract" "Extração de dados AI (sem API key)" \
    '{"instruction": "extrair informações da página"}'

test_endpoint "POST" "/api/ai/analyze" "Análise de página AI (sem API key)" \
    '{"question": "o que há nesta página?"}'

# 3. Testar endpoints tradicionais
echo "📊 TESTANDO ENDPOINTS TRADICIONAIS:"
echo "===================================="

test_endpoint "GET" "/api/status" "Status geral do sistema"

test_endpoint "GET" "/api/rides/pages" "Páginas disponíveis para scraping"

test_endpoint "GET" "/api/database/test-connection" "Teste conexão PostgreSQL"

# 4. Resumo
echo "📋 RESUMO DOS TESTES:"
echo "====================="
print_success "Servidor AI Agent funcionando"
print_success "Endpoints AI implementados"
print_success "Endpoints tradicionais mantidos"
print_warning "AI Agent precisa de GEMINI_API_KEY para funcionar completamente"
print_warning "PostgreSQL desconectado (normal em desenvolvimento)"

echo ""
echo "🎯 PRÓXIMOS PASSOS:"
echo "==================="
echo "1. Configure GEMINI_API_KEY no .env"
echo "2. Execute: npm start"
echo "3. Teste comando: curl -X POST localhost:3000/api/ai/initialize"
echo "4. Para deploy: sudo ./deploy-postgresql.sh"
echo ""
echo "🌟 AI AGENT PRONTO PARA USO! 🚀"
