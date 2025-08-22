#!/bin/bash
# ========================================
# TESTE SPLIT-SCREEN - DOIS NAVEGADORES LADO A LADO
# ========================================

echo "🎯 Testando Split-Screen - Dois Navegadores Lado a Lado"
echo "📐 Resolução VNC: 1600x1200"
echo "🌐 Cada navegador: 800x1170"
echo ""

export DISPLAY=:99

# Aguardar X server estar pronto
sleep 3

echo "🟢 Abrindo Browser ESQUERDO (Extração)..."
echo "   └── Posição: (0,0) | Tamanho: 800x1170"
chromium-browser \
  --user-data-dir=/app/browser-data/hybrid_operation \
  --window-position=0,0 \
  --window-size=800,1170 \
  --new-window \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  --disable-dev-shm-usage \
  https://rides.ec2dashboard.com/#/page/login &

BROWSER1_PID=$!
sleep 4

echo "🔵 Abrindo Browser DIREITO (Recarga)..."
echo "   └── Posição: (800,0) | Tamanho: 800x1170"
chromium-browser \
  --user-data-dir=/app/browser-data/hybrid_scraper \
  --window-position=800,0 \
  --window-size=800,1170 \
  --new-window \
  --disable-web-security \
  --disable-features=VizDisplayCompositor \
  --disable-dev-shm-usage \
  https://rides.ec2dashboard.com/#/page/login &

BROWSER2_PID=$!
sleep 2

echo ""
echo "✅ SPLIT-SCREEN CONFIGURADO COM SUCESSO!"
echo ""
echo "📺 LAYOUT FINAL:"
echo "┌──────────────────────────────────────┐ 1600px"
echo "│  🟢 EXTRAÇÃO    │  🔵 RECARGA       │"
echo "│     800x1170    │     800x1170      │ 1170px"
echo "│                 │                   │"
echo "│  Browser 1      │  Browser 2        │"
echo "│  (Esquerda)     │  (Direita)        │"
echo "│                 │                   │"
echo "└──────────────────────────────────────┘"
echo "│        Taskbar (30px)                │"
echo "└──────────────────────────────────────┘ 1200px total"
echo ""
echo "🎮 CONTROLES:"
echo "   • Alt + Tab     → Alternar entre navegadores"
echo "   • Clique Taskbar → Focar navegador específico"
echo "   • Botão Direito → Menu de contexto"
echo ""
echo "🔗 ACESSO VNC:"
echo "   • Cliente VNC: sua-vps:6090"
echo "   • noVNC Web:   http://sua-vps:6091"
echo "   • Senha:       suasenhaVNC123"
echo ""
echo "🚀 Agora você pode usar os dois navegadores simultaneamente!"

# Função para cleanup
cleanup() {
    echo ""
    echo "🛑 Fechando navegadores..."
    kill $BROWSER1_PID $BROWSER2_PID 2>/dev/null
    echo "✅ Navegadores fechados!"
    exit 0
}

# Trap para cleanup
trap cleanup SIGTERM SIGINT

echo ""
echo "⚡ Navegadores rodando (Pressione Ctrl+C para parar)..."
wait
