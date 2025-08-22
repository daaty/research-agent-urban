#!/bin/bash

# 🖱️ Script para resetar cursor no VNC
# Usado quando o mouse fica com X ou não responde

echo "🖱️ Resetando cursor no VNC..."

# 1. Matar processos do Chrome que podem estar capturando cursor
pkill -f "chrome.*--remote-debugging"

# 2. Resetar cursor do X11
export DISPLAY=:99
xsetroot -cursor_name left_ptr

# 3. Forçar atualização do cursor
xdotool mousemove 100 100
xdotool mousemove 200 200

# 4. Limpar cache de cursor
xset r

echo "✅ Cursor resetado!"

# 5. Organizar janelas novamente
echo "🖥️ Reorganizando janelas..."
/app/organize-windows.sh

echo "🎯 Reset completo do VNC concluído!"
