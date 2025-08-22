#!/bin/bash

# 🎯 VNC Focus Helper - Script para testar gerenciamento de foco
# Este script permite testar facilmente o sistema de foco no VNC

echo "🎯 ========================================"
echo "🎯 VNC FOCUS HELPER - Sistema de Foco"
echo "🎯 ========================================"
echo ""

# Verificar se DISPLAY está configurado
if [ -z "$DISPLAY" ]; then
    export DISPLAY=:99
    echo "📺 DISPLAY configurado para :99"
fi

# Funções de foco usando xdotool
focus_left_window() {
    echo "🎯 Focando janela ESQUERDA (Rides Scraper)..."
    WINDOW_IDS=$(DISPLAY=:99 xdotool search --class chrome 2>/dev/null || echo "")
    if [ -n "$WINDOW_IDS" ]; then
        FIRST_WINDOW=$(echo "$WINDOW_IDS" | head -1)
        DISPLAY=:99 xdotool windowfocus "$FIRST_WINDOW"
        DISPLAY=:99 xdotool windowactivate "$FIRST_WINDOW"
        DISPLAY=:99 xdotool windowraise "$FIRST_WINDOW"
        echo "✅ Foco aplicado na janela esquerda (ID: $FIRST_WINDOW)"
    else
        echo "❌ Nenhuma janela do Chrome encontrada"
    fi
}

focus_right_window() {
    echo "🎯 Focando janela DIREITA (Hybrid Scraper)..."
    WINDOW_IDS=$(DISPLAY=:99 xdotool search --class chrome 2>/dev/null || echo "")
    if [ -n "$WINDOW_IDS" ]; then
        SECOND_WINDOW=$(echo "$WINDOW_IDS" | sed -n '2p')
        if [ -n "$SECOND_WINDOW" ]; then
            DISPLAY=:99 xdotool windowfocus "$SECOND_WINDOW"
            DISPLAY=:99 xdotool windowactivate "$SECOND_WINDOW"
            DISPLAY=:99 xdotool windowraise "$SECOND_WINDOW"
            echo "✅ Foco aplicado na janela direita (ID: $SECOND_WINDOW)"
        else
            echo "❌ Segunda janela não encontrada"
        fi
    else
        echo "❌ Nenhuma janela do Chrome encontrada"
    fi
}

list_windows() {
    echo "🔍 Listando todas as janelas do Chrome:"
    WINDOW_IDS=$(DISPLAY=:99 xdotool search --class chrome 2>/dev/null || echo "")
    if [ -n "$WINDOW_IDS" ]; then
        i=1
        echo "$WINDOW_IDS" | while read -r window_id; do
            if [ -n "$window_id" ]; then
                WINDOW_NAME=$(DISPLAY=:99 xdotool getwindowname "$window_id" 2>/dev/null || echo "Desconhecido")
                echo "  $i. ID: $window_id | Nome: $WINDOW_NAME"
                i=$((i+1))
            fi
        done
    else
        echo "❌ Nenhuma janela do Chrome encontrada"
    fi
}

switch_focus() {
    echo "🔄 Alternando foco entre janelas..."
    WINDOW_IDS=$(DISPLAY=:99 xdotool search --class chrome 2>/dev/null || echo "")
    if [ -n "$WINDOW_IDS" ]; then
        CURRENT_FOCUS=$(DISPLAY=:99 xdotool getwindowfocus 2>/dev/null || echo "")
        FIRST_WINDOW=$(echo "$WINDOW_IDS" | head -1)
        SECOND_WINDOW=$(echo "$WINDOW_IDS" | sed -n '2p')
        
        if [ "$CURRENT_FOCUS" = "$FIRST_WINDOW" ] && [ -n "$SECOND_WINDOW" ]; then
            DISPLAY=:99 xdotool windowfocus "$SECOND_WINDOW"
            DISPLAY=:99 xdotool windowactivate "$SECOND_WINDOW"
            echo "✅ Foco alternado para janela direita"
        else
            DISPLAY=:99 xdotool windowfocus "$FIRST_WINDOW"
            DISPLAY=:99 xdotool windowactivate "$FIRST_WINDOW"
            echo "✅ Foco alternado para janela esquerda"
        fi
    else
        echo "❌ Nenhuma janela do Chrome encontrada"
    fi
}

# Menu interativo
while true; do
    echo ""
    echo "📋 Opções disponíveis:"
    echo "1. Focar janela ESQUERDA (Rides Scraper)"
    echo "2. Focar janela DIREITA (Hybrid Scraper)"
    echo "3. Alternar foco entre janelas"
    echo "4. Listar todas as janelas"
    echo "5. Sair"
    echo ""
    read -p "Escolha uma opção (1-5): " choice
    
    case $choice in
        1)
            focus_left_window
            ;;
        2)
            focus_right_window
            ;;
        3)
            switch_focus
            ;;
        4)
            list_windows
            ;;
        5)
            echo "👋 Saindo do VNC Focus Helper..."
            break
            ;;
        *)
            echo "❌ Opção inválida. Tente novamente."
            ;;
    esac
done
