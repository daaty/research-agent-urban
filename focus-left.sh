#!/bin/bash

# 🎯 Dar foco à janela da ESQUERDA (Rides)

export DISPLAY=:99

if [ -f /tmp/vnc_windows.conf ]; then
    source /tmp/vnc_windows.conf
    
    echo "🎯 Dando foco à janela ESQUERDA (Rides)..."
    xdotool windowfocus $LEFT_WINDOW
    xdotool windowactivate $LEFT_WINDOW
    xdotool windowraise $LEFT_WINDOW
    
    # Mover mouse para dentro da janela esquerda
    xdotool mousemove --window $LEFT_WINDOW 400 300
    
    # Atualizar arquivo de controle
    sed -i 's/CURRENT_FOCUS=.*/CURRENT_FOCUS=LEFT/' /tmp/vnc_windows.conf
    
    echo "✅ Foco na janela ESQUERDA (Rides) ativado!"
else
    echo "❌ Arquivo de configuração não encontrado. Execute manage-window-focus.sh primeiro."
fi
