#!/bin/bash

# ========================================
# SCRIPT PARA CRIAR USUÁRIO RIDES_USER NO POSTGRESQL EXISTENTE
# ========================================

echo "🗄️ Criando usuário rides_user no PostgreSQL existente..."

# Encontrar o container PostgreSQL
POSTGRES_CONTAINER=$(docker ps --format "table {{.Names}}" | grep postgres | head -1)

if [ -z "$POSTGRES_CONTAINER" ]; then
    echo "❌ Container PostgreSQL não encontrado!"
    exit 1
fi

echo "✅ Container PostgreSQL encontrado: $POSTGRES_CONTAINER"

# Executar comandos SQL no container
echo "📝 Criando usuário e banco..."

docker exec -i $POSTGRES_CONTAINER psql -U postgres -c "CREATE USER rides_user;" 2>/dev/null || echo "⚠️ Usuário rides_user já existe"

docker exec -i $POSTGRES_CONTAINER psql -U postgres -c "ALTER USER rides_user PASSWORD 'rides_password';"

docker exec -i $POSTGRES_CONTAINER psql -U postgres -c "CREATE DATABASE rides_db;" 2>/dev/null || echo "⚠️ Banco rides_db já existe"

docker exec -i $POSTGRES_CONTAINER psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE rides_db TO rides_user;"

docker exec -i $POSTGRES_CONTAINER psql -U postgres -d rides_db -c "GRANT ALL ON SCHEMA public TO rides_user;"

docker exec -i $POSTGRES_CONTAINER psql -U postgres -d rides_db -c "GRANT CREATE ON SCHEMA public TO rides_user;"

echo "✅ Usuário rides_user criado com sucesso!"
echo "🔗 Pode testar a conexão agora"
