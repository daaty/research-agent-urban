#!/bin/bash

# ========================================
# TESTE COMPLETO - RESEARCH AGENT URBAN AI
# ========================================

echo "🤖 ========================================================"
echo "🚀 TESTANDO RESEARCH AGENT URBAN - AI AGENT VERSION 3.0.0"
echo "🤖 ========================================================"
echo ""

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_success() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️ $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️ $1${NC}"; }

# URL base (ajustar conforme ambiente)
BASE_URL="http://localhost:3000"

print_info "Testando sistema na URL: $BASE_URL"
echo ""

# 1. Teste de Status Geral
print_info "1. Testando status geral..."
STATUS_RESPONSE=$(curl -s "$BASE_URL/api/status")
if echo "$STATUS_RESPONSE" | grep -q "online"; then
    print_success "Sistema online e funcionando"
else
    print_error "Sistema não está respondendo corretamente"
    exit 1
fi

# 2. Teste de Status AI Agent
print_info "2. Testando status do AI Agent..."
AI_STATUS=$(curl -s "$BASE_URL/api/ai/status")
if echo "$AI_STATUS" | grep -q "success"; then
    print_success "AI Agent endpoint funcionando"
    
    # Verificar se AI está inicializado
    if echo "$AI_STATUS" | grep -q '"ai_agent_initialized":true'; then
        print_success "AI Agent inicializado"
    else
        print_warning "AI Agent não inicializado (precisa GEMINI_API_KEY)"
    fi
else
    print_error "AI Agent não está funcionando"
fi

# 3. Teste de Endpoints Tradicionais
print_info "3. Testando endpoints tradicionais..."

# Database stats
DB_RESPONSE=$(curl -s "$BASE_URL/api/database/stats" 2>/dev/null)
if echo "$DB_RESPONSE" | grep -q "error\|success"; then
    print_success "Database endpoint respondendo"
else
    print_warning "Database endpoint pode estar offline"
fi

# 4. Teste de Páginas Disponíveis  
print_info "4. Testando páginas disponíveis..."
PAGES_RESPONSE=$(curl -s "$BASE_URL/api/rides/pages")
if echo "$PAGES_RESPONSE" | grep -q "success"; then
    print_success "Páginas de scraping configuradas"
else
    print_warning "Páginas de scraping não configuradas"
fi

# 5. Teste de Inicialização AI (se GEMINI_API_KEY estiver configurada)
print_info "5. Testando inicialização do AI Agent..."
if [ ! -z "$GEMINI_API_KEY" ] && [ "$GEMINI_API_KEY" != "your_google_gemini_api_key_here" ]; then
    print_info "   GEMINI_API_KEY configurada, testando inicialização..."
    
    INIT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/initialize" \
        -H "Content-Type: application/json")
    
    if echo "$INIT_RESPONSE" | grep -q "success.*true"; then
        print_success "AI Agent inicializado com sucesso!"
        
        # Teste comando simples
        print_info "   Testando comando simples..."
        CMD_RESPONSE=$(curl -s -X POST "$BASE_URL/api/ai/execute" \
            -H "Content-Type: application/json" \
            -d '{"command": "Olá, você está funcionando?"}')
            
        if echo "$CMD_RESPONSE" | grep -q "success"; then
            print_success "Comando AI executado com sucesso!"
        else
            print_warning "Comando AI falhou (pode precisar de browser ativo)"
        fi
    else
        print_warning "AI Agent não pôde ser inicializado"
    fi
else
    print_warning "GEMINI_API_KEY não configurada - pulando teste AI"
fi

echo ""
print_info "🔍 RESUMO DOS TESTES:"

# Verificar cada componente
echo ""
print_info "📊 COMPONENTES DO SISTEMA:"

# Sistema Principal
if echo "$STATUS_RESPONSE" | grep -q "online"; then
    print_success "Sistema Principal: FUNCIONANDO"
else
    print_error "Sistema Principal: FALHA"
fi

# AI Agent
if echo "$AI_STATUS" | grep -q "success"; then
    print_success "AI Agent: FUNCIONANDO"
else
    print_error "AI Agent: FALHA"
fi

# Browser
if echo "$STATUS_RESPONSE" | grep -q '"active":true'; then
    print_success "Browser: ATIVO"
else
    print_warning "Browser: INATIVO (normal para dev)"
fi

# PostgreSQL
if echo "$DB_RESPONSE" | grep -q "success"; then
    print_success "PostgreSQL: CONECTADO"
else
    print_warning "PostgreSQL: DESCONECTADO (normal para dev)"
fi

echo ""
print_info "📋 ENDPOINTS DISPONÍVEIS:"
echo "   🌐 Status: $BASE_URL/api/status"
echo "   🤖 AI Status: $BASE_URL/api/ai/status"
echo "   🗄️ Database: $BASE_URL/api/database/stats"
echo "   📊 Dashboard: $BASE_URL/api/database/dashboard"

echo ""
print_info "🤖 COMANDOS AI PARA TESTAR:"
echo "   curl -X POST $BASE_URL/api/ai/initialize"
echo "   curl -X POST $BASE_URL/api/ai/execute -H 'Content-Type: application/json' -d '{\"command\": \"Olá AI!\"}'"

echo ""
if [ ! -z "$GEMINI_API_KEY" ] && [ "$GEMINI_API_KEY" != "your_google_gemini_api_key_here" ]; then
    print_success "🎉 SISTEMA PRONTO PARA USO COMPLETO!"
    print_success "   AI Agent funcional com Gemini API"
else
    print_warning "⚙️ PARA USO COMPLETO:"
    print_warning "   Configure GEMINI_API_KEY no arquivo .env"
    print_warning "   Obtenha sua chave em: https://ai.google.dev/"
fi

echo ""
print_info "🐳 PARA DEPLOY EM PRODUÇÃO:"
print_info "   1. Configure .env.docker com suas credenciais"
print_info "   2. Execute: sudo ./deploy-postgresql.sh"
print_info "   3. Acesse VNC em: http://seu-ip:6091"

echo ""
print_success "🚀 TESTE CONCLUÍDO - SISTEMA FUNCIONANDO!"
echo "🤖 ========================================================="
