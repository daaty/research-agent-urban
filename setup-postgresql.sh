#!/bin/bash

# 🗄️ Script de Configuração PostgreSQL para Research Agent Urban

echo "🗄️ Configurando PostgreSQL para Research Agent Urban..."

# Variáveis do PostgreSQL existente (ChatWoot)
POSTGRES_HOST="n8n_postgres"
POSTGRES_PORT="5432"
ADMIN_USER="postgres"  # ou o usuário admin do seu PostgreSQL
ADMIN_PASSWORD="n8n_pw"  # senha do admin

# Novas configurações para Research Agent
NEW_DB="rides_db"
NEW_USER="rides_user"
NEW_PASSWORD="rides_password"

echo "📋 Configurações:"
echo "   - Host: $POSTGRES_HOST"
echo "   - Nova Database: $NEW_DB"
echo "   - Novo Usuário: $NEW_USER"
echo ""

# Comando SQL para criar database e usuário
SQL_COMMANDS="
-- Criar nova database para Research Agent
CREATE DATABASE $NEW_DB;

-- Criar usuário específico
CREATE USER $NEW_USER WITH PASSWORD '$NEW_PASSWORD';

-- Dar permissões completas ao usuário na nova database
GRANT ALL PRIVILEGES ON DATABASE $NEW_DB TO $NEW_USER;

-- Conectar na nova database e dar permissões no schema
\c $NEW_DB;
GRANT ALL ON SCHEMA public TO $NEW_USER;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO $NEW_USER;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO $NEW_USER;

-- Verificar databases existentes
\l

-- Verificar usuários
\du
"

echo "🔧 Comandos SQL que serão executados:"
echo "$SQL_COMMANDS"
echo ""
echo "📝 Para executar manualmente, conecte no PostgreSQL e execute:"
echo "   docker exec -it n8n_postgres psql -U postgres -d postgres"
echo ""
echo "   Ou use a interface administrativa do seu PostgreSQL."
echo ""
echo "✅ Após criar o banco, o Research Agent Urban poderá conectar automaticamente!"

# Salvar comandos em arquivo para execução manual
echo "$SQL_COMMANDS" > setup-database.sql
echo "💾 Comandos salvos em: setup-database.sql"
