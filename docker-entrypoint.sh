#!/bin/bash

# ========================================
# DOCKER ENTRYPOINT - RESEARCH AGENT URBAN WITH VNC
# ========================================

set -e

echo "🚀 Iniciando Research Agent Urban com VNC..."

# Verificar variáveis obrigatórias
if [ -z "$RIDES_USERNAME" ] || [ -z "$RIDES_PASSWORD" ] || [ -z "$N8N_WEBHOOK_URL" ]; then
    echo "❌ ERRO: Variáveis obrigatórias não configuradas!"
    echo "Necessário: RIDES_USERNAME, RIDES_PASSWORD, N8N_WEBHOOK_URL"
    exit 1
fi

# Criar diretórios se não existirem
mkdir -p /app/data /app/browser-data /app/cache

# Definir permissões
chmod 755 /app/data /app/browser-data /app/cache

# Configurar variáveis de ambiente para VNC
export DISPLAY=:99

echo "✅ Configuração concluída."
echo "🌐 WebUI será acessível em: http://localhost:${PORT:-3030}"
echo "🖥️ VNC será acessível em: http://localhost:6080/vnc.html"
echo "🔑 Senha VNC: ${VNC_PASSWORD:-youvncpassword}"

# Executar comando
exec "$@"
