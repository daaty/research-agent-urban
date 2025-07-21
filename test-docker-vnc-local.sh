#!/bin/bash

# ============================================
# TESTE LOCAL - DOCKER VNC
# ============================================

echo "🚀 Testando Research Agent Urban com VNC..."

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down

# Limpar imagens antigas (opcional)
echo "🧹 Limpando cache..."
docker system prune -f

# Build da nova imagem
echo "🔨 Construindo imagem VNC..."
docker-compose build --no-cache

# Iniciar containers
echo "🚀 Iniciando containers..."
docker-compose up -d

# Verificar status
echo "📊 Verificando status..."
docker-compose ps

echo ""
echo "✅ PRONTO! Acessos disponíveis:"
echo ""
echo "🌐 Aplicação Web:    http://localhost:3030"
echo "🖥️  VNC via Web:      http://localhost:6080"
echo "🖥️  VNC direto:       vnc://localhost:5901"
echo ""
echo "🔑 Senha VNC: suasenhaVNC123"
echo ""
echo "📝 Para ver logs:"
echo "   docker-compose logs -f"
echo ""
echo "⏹️  Para parar:"
echo "   docker-compose down"
