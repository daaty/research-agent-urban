#!/bin/bash

# 🖱️ Script para dar foco correto às janelas no VNC
# Resolve problema de interação no noVNC

echo "🎯 Configurando foco das janelas para interação no noVNC..."

export DISPLAY=:99

# 1. Encontrar janelas do Chrome
CHROME_WINDOWS=$(xdotool search --class chrome 2>/dev/null)

if [ -z "$CHROME_WINDOWS" ]; then
    echo "❌ Nenhuma janela do Chrome encontrada!"
    exit 1
fi

echo "✅ Encontradas $(echo $CHROME_WINDOWS | wc -w) janelas do Chrome"

# 2. Configurar propriedades de foco para todas as janelas
for WINDOW_ID in $CHROME_WINDOWS; do
    echo "🔧 Configurando janela $WINDOW_ID..."
    
    # Dar foco
    xdotool windowfocus $WINDOW_ID
    
    # Ativar janela
    xdotool windowactivate $WINDOW_ID
    
    # Garantir que está visível
    xdotool windowmap $WINDOW_ID
    
    # Trazer para frente
    xdotool windowraise $WINDOW_ID
    
    sleep 0.5
done

# 3. Configurar window manager para aceitar cliques
echo "⚙️ Configurando Openbox para melhor interação..."

# Criar configuração do Openbox se não existir
mkdir -p ~/.config/openbox

cat > ~/.config/openbox/rc.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/">
  <mouse>
    <default>
      <action name="Focus"/>
      <action name="Raise"/>
    </default>
    <context name="Frame">
      <mousebind button="A-Left" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
        <action name="Unshade"/>
      </mousebind>
      <mousebind button="Left" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
    </context>
    <context name="Client">
      <mousebind button="Left" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
      <mousebind button="Middle" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
      <mousebind button="Right" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
    </context>
  </mouse>
  <focus>
    <focusNew>yes</focusNew>
    <followMouse>no</followMouse>
    <focusLast>yes</focusLast>
    <underMouse>no</underMouse>
    <focusDelay>200</focusDelay>
    <raiseOnFocus>yes</raiseOnFocus>
  </focus>
</openbox_config>
EOF

# 4. Recarregar configuração do Openbox
openbox --reconfigure 2>/dev/null || echo "⚠️ Openbox não está rodando"

# 5. Testar interação em cada janela
echo "🔍 Testando interação em cada janela..."

WINDOW_ARRAY=($CHROME_WINDOWS)
for i in "${!WINDOW_ARRAY[@]}"; do
    WINDOW_ID=${WINDOW_ARRAY[$i]}
    echo "🖱️ Testando janela $((i+1)): $WINDOW_ID"
    
    # Dar foco
    xdotool windowfocus $WINDOW_ID
    xdotool windowactivate $WINDOW_ID
    
    # Esperar um pouco
    sleep 1
    
    # Mover mouse para centro da janela
    WINDOW_INFO=$(xwininfo -id $WINDOW_ID 2>/dev/null)
    if [ $? -eq 0 ]; then
        WIDTH=$(echo "$WINDOW_INFO" | grep "Width:" | awk '{print $2}')
        HEIGHT=$(echo "$WINDOW_INFO" | grep "Height:" | awk '{print $2}')
        X=$(echo "$WINDOW_INFO" | grep "Absolute upper-left X:" | awk '{print $4}')
        Y=$(echo "$WINDOW_INFO" | grep "Absolute upper-left Y:" | awk '{print $4}')
        
        CENTER_X=$((X + WIDTH/2))
        CENTER_Y=$((Y + HEIGHT/2))
        
        echo "📍 Movendo mouse para centro da janela: ($CENTER_X, $CENTER_Y)"
        xdotool mousemove $CENTER_X $CENTER_Y
        
        # Teste de clique
        xdotool click 1
        echo "✅ Clique testado na janela $((i+1))"
    fi
    
    sleep 1
done

echo "🎯 Configuração de foco concluída!"
echo "💡 Agora as janelas devem responder aos cliques no noVNC"
