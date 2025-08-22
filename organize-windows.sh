#!/bin/bash

# organize-windows.sh
# Script para organizar janelas em layout split-screen

echo "🔄 Organizando janelas em split-screen..."

export DISPLAY=:99

# Aguardar X11 estar pronto
while ! xdpyinfo -display :99 >/dev/null 2>&1; do
    echo "Aguardando X11 estar pronto..."
    sleep 1
done

# Encontrar todas as janelas do Chrome
CHROME_WINDOWS=$(xdotool search --class "chrome" 2>/dev/null)

if [ -z "$CHROME_WINDOWS" ]; then
    echo "❌ Nenhuma janela do Chrome encontrada!"
    exit 1
fi

echo "✅ Encontradas $(echo $CHROME_WINDOWS | wc -w) janelas do Chrome"

# Converter para array
WINDOW_ARRAY=($CHROME_WINDOWS)
WINDOW_COUNT=${#WINDOW_ARRAY[@]}

echo "📊 Total de janelas: $WINDOW_COUNT"

# Organizar até 2 janelas em split-screen
if [ $WINDOW_COUNT -ge 1 ]; then
    # Primeira janela - lado esquerdo
    WINDOW1=${WINDOW_ARRAY[0]}
    echo "🖼️ Posicionando janela 1 (ID: $WINDOW1) no lado esquerdo..."
    
    xdotool windowactivate $WINDOW1
    xdotool windowmove $WINDOW1 0 0
    xdotool windowsize $WINDOW1 800 1170
    xdotool windowraise $WINDOW1
    
    echo "✅ Janela 1 posicionada: 0,0 - 800x1170"
fi

if [ $WINDOW_COUNT -ge 2 ]; then
    # Segunda janela - lado direito
    WINDOW2=${WINDOW_ARRAY[1]}
    echo "🖼️ Posicionando janela 2 (ID: $WINDOW2) no lado direito..."
    
    xdotool windowactivate $WINDOW2
    xdotool windowmove $WINDOW2 800 0
    xdotool windowsize $WINDOW2 800 1170
    xdotool windowraise $WINDOW2
    
    echo "✅ Janela 2 posicionada: 800,0 - 800x1170"
fi

# Ativar a primeira janela por padrão
if [ $WINDOW_COUNT -ge 1 ]; then
    xdotool windowactivate ${WINDOW_ARRAY[0]}
    xdotool windowfocus ${WINDOW_ARRAY[0]}
    echo "🎯 Foco ativado na janela 1"
fi

echo "🎉 Organização de janelas concluída!"

# Mostrar status das janelas
echo "📋 Status das janelas:"
for i in "${!WINDOW_ARRAY[@]}"; do
    WINDOW_ID=${WINDOW_ARRAY[$i]}
    WINDOW_INFO=$(xdotool getwindowgeometry $WINDOW_ID 2>/dev/null)
    echo "   Janela $((i+1)) (ID: $WINDOW_ID): $WINDOW_INFO"
done
