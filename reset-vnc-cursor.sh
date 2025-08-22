#!/bin/bash

# 🖱️ Script para resetar cursor e eventos de mouse no VNC

echo "🖱️ Resetando cursor e eventos de mouse no VNC..."

export DISPLAY=:99

# 1. Resetar cursor do X11
xsetroot -cursor_name left_ptr

# 2. Testar eventos de mouse
echo "🔧 Testando eventos de mouse..."
xdotool mousemove 400 300
sleep 0.5
xdotool mousemove 500 400
sleep 0.5

# 3. Limpar cache e resetar configurações de input
xset r
xset m default

# 4. Verificar se janelas estão respondendo
echo "🔍 Verificando janelas do Chrome..."
CHROME_WINDOWS=$(xdotool search --class chrome 2>/dev/null || echo "")
if [ -n "$CHROME_WINDOWS" ]; then
    echo "✅ Encontradas janelas do Chrome: $(echo $CHROME_WINDOWS | wc -w)"
    
    # Dar foco para a primeira janela e testar clique
    FIRST_WINDOW=$(echo $CHROME_WINDOWS | cut -d' ' -f1)
    xdotool windowfocus $FIRST_WINDOW
    sleep 1
    
    # Teste de clique na posição central da janela
    xdotool mousemove --window $FIRST_WINDOW 400 300
    xdotool click 1
    
    echo "✅ Teste de clique realizado na janela principal"
else
    echo "⚠️ Nenhuma janela do Chrome encontrada"
fi

echo "✅ Reset completo do mouse/cursor concluído!"
