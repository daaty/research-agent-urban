#!/bin/bash

# ==================echo "✅ Configuração concluída."
echo "🌐 Auto-scraper v3.0 será acessível em: http://localhost:${PORT:-3040}/health"
echo "🖥️ VNC será acessível em: http://localhost:6091/vnc.html"
echo "🛡️ Sistema de prevenção de duplicados: ATIVO"==================
# DOCKER ENTRYPOINT - RESEARCH AGENT URBAN v3.0
# Sistema de Prevenção de Duplicados com PostgreSQL
# ========================================

set -e

echo "🚀 Iniciando Research Agent Urban v3.0..."
echo "🛡️ Sistema de prevenção de duplicados com PostgreSQL"

# Verificar variáveis obrigatórias para scraping
if [ -z "$RIDES_EMAIL" ] || [ -z "$RIDES_PASSWORD" ] || [ -z "$N8N_WEBHOOK_URL" ]; then
    echo "❌ ERRO: Variáveis obrigatórias para scraping não configuradas!"
    echo "Necessário: RIDES_EMAIL, RIDES_PASSWORD, N8N_WEBHOOK_URL"
    exit 1
fi

# Verificar variáveis obrigatórias para database
if [ -z "$DB_HOST" ] || [ -z "$DB_USERNAME" ] || [ -z "$DB_PASSWORD" ] || [ -z "$DB_NAME" ]; then
    echo "❌ ERRO: Variáveis obrigatórias para database não configuradas!"
    echo "Necessário: DB_HOST, DB_USERNAME, DB_PASSWORD, DB_NAME"
    exit 1
fi

# Criar diretórios se não existirem
mkdir -p /app/data /app/browser-data /app/cache

# Definir permissões
chmod 755 /app/data /app/browser-data /app/cache

# Configurar variáveis de ambiente para VNC
export DISPLAY=:99

echo "✅ Configuração concluída."
echo "🌐 Auto-scraper v3.0 será acessível em: http://localhost:${PORT:-3000}/health"
echo "🖥️ VNC será acessível em: http://localhost:6091/vnc.html"
echo "�️ Sistema de prevenção de duplicados: ATIVO"

# Executar comando
exec "$@"
