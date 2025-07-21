#!/bin/bash

# =============================================
# TESTE LOCAL DOCKER VNC - RESEARCH AGENT URBAN
# =============================================

echo "🐳 Testando Docker com VNC..."

# Verificar se Docker está rodando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker não está rodando. Inicie o Docker primeiro."
    exit 1
fi

# Parar containers existentes
echo "🛑 Parando containers existentes..."
docker-compose down 2>/dev/null || true

# Build da imagem
echo "🏗️ Fazendo build da imagem..."
docker-compose build

# Verificar se build foi bem-sucedido
if [ $? -ne 0 ]; then
    echo "❌ Erro no build da imagem"
    exit 1
fi

# Iniciar containers
echo "🚀 Iniciando containers..."
docker-compose up -d

# Aguardar inicialização
echo "⏳ Aguardando inicialização..."
sleep 10

# Verificar status
echo "🔍 Verificando status dos containers..."
docker-compose ps

# Verificar logs
echo "📋 Últimos logs:"
docker-compose logs --tail=20 research-agent-urban

# Verificar conectividade
echo "🌐 Testando conectividade..."

# Testar Web UI
if curl -s http://localhost:3030 > /dev/null; then
    echo "✅ Web UI: http://localhost:3030"
else
    echo "❌ Web UI não está respondendo"
fi

# Testar VNC Web
if curl -s http://localhost:6080 > /dev/null; then
    echo "✅ VNC Web: http://localhost:6080/vnc.html"
else
    echo "❌ VNC Web não está respondendo"
fi

echo ""
echo "🎯 ACESSOS DISPONÍVEIS:"
echo "📱 Web UI:    http://localhost:3030"
echo "🖥️ VNC Web:   http://localhost:6080/vnc.html"
echo "🔐 VNC Direct: vnc://localhost:5901"
echo ""
echo "🔧 COMANDOS ÚTEIS:"
echo "📋 Ver logs:  docker-compose logs -f"
echo "🐚 Terminal:  docker exec -it research-agent-urban bash"
echo "🛑 Parar:     docker-compose down"
echo ""
echo "✅ Teste concluído!"
