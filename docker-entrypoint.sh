#!/bin/sh

# ========================================
# DOCKER ENTRYPOINT - RESEARCH AGENT URBAN
# ========================================

set -e

echo "🚀 Iniciando Research Agent Urban..."

# Verificar variáveis obrigatórias
if [ -z "$RIDES_USERNAME" ] || [ -z "$RIDES_PASSWORD" ] || [ -z "$N8N_WEBHOOK_URL" ]; then
    echo "❌ ERRO: Variáveis obrigatórias não configuradas!"
    echo "Necessário: RIDES_USERNAME, RIDES_PASSWORD, N8N_WEBHOOK_URL"
    exit 1
fi

# Iniciar X Virtual Display
echo "🖥️ Iniciando display virtual..."
Xvfb :99 -screen 0 1024x768x24 > /dev/null 2>&1 &

# Aguardar display inicializar
sleep 3

# Verificar se display está funcionando
if ! pgrep -x "Xvfb" > /dev/null; then
    echo "⚠️ Aviso: Display virtual pode não estar funcionando corretamente"
fi

# Criar diretórios se não existirem
mkdir -p /app/data /app/browser-data /app/cache

# Definir permissões
chmod 755 /app/data /app/browser-data /app/cache

echo "✅ Configuração concluída. Executando comando: $@"

# Executar comando
exec "$@"
