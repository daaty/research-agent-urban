#!/bin/bash
# ========================================
# TESTE VNC COM RESOLUÇÃO OTIMIZADA
# ========================================

echo "🖥️ Iniciando teste de VNC com resolução 1600x1200..."

# Definir variáveis
export DISPLAY=:99
export RESOLUTION=1600x1200

# Matar processos VNC existentes
echo "🧹 Limpando processos VNC existentes..."
pkill -f "Xvfb :99" 2>/dev/null || true
pkill -f "x11vnc" 2>/dev/null || true
pkill -f "websockify" 2>/dev/null || true

# Aguardar cleanup
sleep 2

# Iniciar Xvfb com nova resolução
echo "🚀 Iniciando Xvfb com resolução ${RESOLUTION}..."
Xvfb :99 -screen 0 ${RESOLUTION}x24 -ac +extension GLX +render -noreset -dpi 96 &
XVFB_PID=$!

# Aguardar Xvfb inicializar
sleep 3

# Iniciar x11vnc
echo "🔗 Iniciando x11vnc..."
x11vnc -display :99 \
       -nopw \
       -listen 0.0.0.0 \
       -xkb \
       -ncache 10 \
       -ncache_cr \
       -forever \
       -rfbport 5902 \
       -shared \
       -desktop "Research-Agent-Test" \
       -geometry ${RESOLUTION} \
       -scale ${RESOLUTION} \
       -noxdamage \
       -sb 15 &

VNC_PID=$!

sleep 2

# Iniciar noVNC
echo "🌐 Iniciando noVNC na porta 6091..."
cd /opt/novnc || cd ./novnc 2>/dev/null || echo "⚠️ noVNC não encontrado"
if [ -d "/opt/novnc" ] || [ -d "./novnc" ]; then
    ./utils/websockify/run --web /opt/novnc 6091 localhost:5902 &
    NOVNC_PID=$!
fi

echo "✅ VNC Test Server iniciado!"
echo "📺 Resolução: ${RESOLUTION}"
echo "🔗 VNC Direto: localhost:5902"
echo "🌐 noVNC Web: http://localhost:6091"
echo ""
echo "Pressione Ctrl+C para parar..."

# Função para cleanup
cleanup() {
    echo ""
    echo "🛑 Parando serviços VNC..."
    [ ! -z "$NOVNC_PID" ] && kill $NOVNC_PID 2>/dev/null
    [ ! -z "$VNC_PID" ] && kill $VNC_PID 2>/dev/null
    [ ! -z "$XVFB_PID" ] && kill $XVFB_PID 2>/dev/null
    echo "✅ Cleanup concluído!"
    exit 0
}

# Trap para cleanup
trap cleanup SIGTERM SIGINT

# Manter script rodando
wait
