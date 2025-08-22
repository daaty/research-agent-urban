#!/bin/bash

# 🎯 Dar foco à janela da DIREITA (Drivers/Híbrido)

export DISPLAY=:99

if [ -f /tmp/vnc_windows.conf ]; then
    source /tmp/vnc_windows.conf
    
    echo "🎯 Dando foco à janela DIREITA (Drivers/Híbrido)..."
    xdotool windowfocus $RIGHT_WINDOW
    xdotool windowactivate $RIGHT_WINDOW
    xdotool windowraise $RIGHT_WINDOW
    
    # Mover mouse para dentro da janela direita
    xdotool mousemove --window $RIGHT_WINDOW 400 300
    
    # Atualizar arquivo de controle
    sed -i 's/CURRENT_FOCUS=.*/CURRENT_FOCUS=RIGHT/' /tmp/vnc_windows.conf
    
    echo "✅ Foco na janela DIREITA (Drivers/Híbrido) ativado!"
else
    echo "❌ Arquivo de configuração não encontrado. Execute manage-window-focus.sh primeiro."
fi
