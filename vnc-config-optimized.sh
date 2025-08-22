#!/bin/bash
# ========================================
# VNC Configuration Optimized for Browser
# ========================================

# Configurar resolução do display virtual
export DISPLAY=:99
export RESOLUTION=1600x1200

# Configurar Xvfb com resolução otimizada
Xvfb :99 -screen 0 ${RESOLUTION}x24 -ac +extension GLX +render -noreset -dpi 96 &
XVFB_PID=$!

# Aguardar Xvfb inicializar
sleep 3

# Configurar x11vnc com opções otimizadas para visualização
x11vnc -display :99 \
       -nopw \
       -listen 0.0.0.0 \
       -xkb \
       -ncache 10 \
       -ncache_cr \
       -forever \
       -rfbport 5902 \
       -shared \
       -desktop "Research-Agent-VNC" \
       -geometry ${RESOLUTION} \
       -scale ${RESOLUTION} \
       -noxdamage \
       -noxfixes \
       -noxrandr \
       -wait 20 \
       -sb 15 \
       -fixscreen V=3.0 &

VNC_PID=$!

# Configurar noVNC na porta 6091
cd /opt/novnc
./utils/websockify/run --web /opt/novnc 6091 localhost:5902 &
NOVNC_PID=$!

# Função para cleanup
cleanup() {
    echo "Shutting down VNC services..."
    kill $NOVNC_PID 2>/dev/null
    kill $VNC_PID 2>/dev/null
    kill $XVFB_PID 2>/dev/null
    exit 0
}

# Trap para cleanup adequado
trap cleanup SIGTERM SIGINT

echo "VNC Server iniciado com resolução ${RESOLUTION}"
echo "Acesse via noVNC em: http://localhost:6091"
echo "Ou via cliente VNC em: localhost:5902"

# Manter script rodando
wait
