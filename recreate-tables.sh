#!/bin/bash

# ========================================
# SCRIPT PARA RECRIAR TABELAS POSTGRESQL
# ========================================

echo "🔧 Recriando tabelas PostgreSQL após drop acidental..."

# Encontrar o container da aplicação
APP_CONTAINER=$(docker ps --format "table {{.Names}}" | grep research-agent | head -1)

if [ -z "$APP_CONTAINER" ]; then
    echo "❌ Container da aplicação não encontrado!"
    exit 1
fi

echo "✅ Container encontrado: $APP_CONTAINER"

# Reiniciar o container para recriar as tabelas
echo "🔄 Reiniciando container para recriar tabelas..."
docker restart $APP_CONTAINER

echo "⏳ Aguardando inicialização (30 segundos)..."
sleep 30

# Testar a conexão
echo "🧪 Testando conexão PostgreSQL..."
if curl -s http://localhost:3040/api/database/test-connection | grep -q "success"; then
    echo "✅ PostgreSQL reconectado e tabelas recriadas!"
else
    echo "⚠️ Testando novamente em 10 segundos..."
    sleep 10
    if curl -s http://localhost:3040/api/database/test-connection | grep -q "success"; then
        echo "✅ PostgreSQL conectado!"
    else
        echo "❌ Problema na conexão - verifique logs"
    fi
fi

echo "🎉 Processo concluído!"
echo "💡 O sistema deve voltar a funcionar normalmente"
