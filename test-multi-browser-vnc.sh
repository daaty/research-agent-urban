#!/bin/bash
# ========================================
# TESTE MÚLTIPLOS NAVEGADORES NO VNC
# ========================================

echo "🖥️ Testando múltiplos navegadores no VNC..."

export DISPLAY=:99

# Aguardar X server estar pronto
sleep 5

echo "🌐 Abrindo Browser 1 (Extração) - Lado Esquerdo..."
chromium-browser \
  --user-data-dir=/app/browser-data/browser1 \
  --window-position=0,0 \
  --window-size=800,1170 \
  --new-window \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  https://rides.ec2dashboard.com/#/page/login &

sleep 3

echo "🔄 Abrindo Browser 2 (Recarga) - Lado Direito..."
chromium-browser \
  --user-data-dir=/app/browser-data/browser2 \
  --window-position=800,0 \
  --window-size=800,1170 \
  --new-window \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  https://rides.ec2dashboard.com/#/page/login &

sleep 2

echo "✅ Dois navegadores lado a lado!"
echo "🔗 Acesse via VNC: sua-vps:6090 ou noVNC: sua-vps:6091"
echo ""
echo "🎯 LAYOUT SPLIT-SCREEN (1600x1200):"
echo "┌─────────────┬─────────────┐"
echo "│  Browser 1  │  Browser 2  │"
echo "│ (Extração)  │  (Recarga)  │"
echo "│   800x1170  │  800x1170   │"
echo "│             │             │"
echo "│             │             │"
echo "└─────────────┴─────────────┘"
echo "  ←── Taskbar (parte inferior) ──→"
echo ""
echo "💡 Use Alt+Tab para alternar entre navegadores"
echo "💡 Clique na taskbar para focar navegador específico"
echo "💡 Cada navegador ocupa exatamente metade da tela"

wait
