#!/bin/bash

# 🎯 Gerenciador de Foco para Split-Screen VNC
# Automatiza o foco entre os navegadores no noVNC

export DISPLAY=:99

echo "🎯 Iniciando gerenciamento de foco para split-screen..."

# Função para dar foco a uma janela específica
focus_window() {
    local window_id=$1
    local window_name=$2
    
    if [ -n "$window_id" ]; then
        echo "🎯 Dando foco para janela: $window_name (ID: $window_id)"
        xdotool windowfocus $window_id
        xdotool windowactivate $window_id
        xdotool windowraise $window_id
        
        # Pequeno delay para garantir que o foco foi aplicado
        sleep 0.5
        
        # Mover mouse para dentro da janela para ativar eventos
        xdotool mousemove --window $window_id 400 300
        
        echo "✅ Foco aplicado para $window_name"
        return 0
    else
        echo "❌ Janela $window_name não encontrada"
        return 1
    fi
}

# Encontrar janelas do Chrome
CHROME_WINDOWS=($(xdotool search --class chrome 2>/dev/null || echo ""))

if [ ${#CHROME_WINDOWS[@]} -eq 0 ]; then
    echo "❌ Nenhuma janela do Chrome encontrada"
    exit 1
fi

echo "🔍 Encontradas ${#CHROME_WINDOWS[@]} janelas do Chrome"

# Se temos exatamente 2 janelas, configurar foco alternado
if [ ${#CHROME_WINDOWS[@]} -eq 2 ]; then
    WINDOW_LEFT=${CHROME_WINDOWS[0]}
    WINDOW_RIGHT=${CHROME_WINDOWS[1]}
    
    echo "🖥️ Configurando split-screen com foco automático:"
    echo "   Esquerda: $WINDOW_LEFT"
    echo "   Direita:  $WINDOW_RIGHT"
    
    # Inicialmente dar foco à janela da esquerda (rides)
    focus_window $WINDOW_LEFT "Rides (Esquerda)"
    
    # Criar arquivo de controle para APIs
    cat > /tmp/vnc_windows.conf << EOF
LEFT_WINDOW=$WINDOW_LEFT
RIGHT_WINDOW=$WINDOW_RIGHT
CURRENT_FOCUS=LEFT
EOF
    
    echo "✅ Sistema de foco configurado!"
    echo "💡 Use os seguintes comandos para trocar foco:"
    echo "   - Foco Esquerda: /app/focus-left.sh"
    echo "   - Foco Direita:  /app/focus-right.sh"
    
else
    echo "⚠️ Número inesperado de janelas: ${#CHROME_WINDOWS[@]}"
    echo "   Dando foco à primeira janela disponível"
    focus_window ${CHROME_WINDOWS[0]} "Chrome Principal"
fi

echo "🎯 Gerenciamento de foco concluído!"
