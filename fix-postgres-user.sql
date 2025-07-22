-- Script para criar usuário rides_user no PostgreSQL existente
-- Execute este script no container PostgreSQL

-- Criar usuário rides_user
CREATE USER rides_user;

-- Definir senha
ALTER USER rides_user PASSWORD 'rides_password';

-- Criar banco rides_db
CREATE DATABASE rides_db;

-- Conceder privilégios
GRANT ALL PRIVILEGES ON DATABASE rides_db TO rides_user;

-- Conectar ao banco e dar privilégios no schema
\c rides_db;
GRANT ALL ON SCHEMA public TO rides_user;
GRANT CREATE ON SCHEMA public TO rides_user;
