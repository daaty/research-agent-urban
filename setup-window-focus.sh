#!/bin/bash

# 🖱️ Script para dar foco correto às janelas no VNC
# Resolve problema de interação no noVNC

echo "🎯 Configurando foco das janelas para interação no noVNC..."

export DISPLAY=:99

# Aguardar X11 estar pronto
while ! xdpyinfo -display :99 >/dev/null 2>&1; do
    echo "Aguardando X11 estar pronto..."
    sleep 1
done

echo "✅ X11 pronto, configurando Openbox para suportar _NET_ACTIVE_WINDOW..."

# Configurar Openbox com suporte completo a EWMH
mkdir -p ~/.config/openbox
cat > ~/.config/openbox/rc.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<openbox_config xmlns="http://openbox.org/3.4/rc">
  <focus>
    <focusNew>yes</focusNew>
    <followMouse>no</followMouse>
    <focusLast>yes</focusLast>
    <underMouse>no</underMouse>
    <focusDelay>0</focusDelay>
    <raiseOnFocus>yes</raiseOnFocus>
  </focus>
  <placement>
    <policy>Smart</policy>
    <center>no</center>
    <monitor>Primary</monitor>
    <primaryMonitor>1</primaryMonitor>
  </placement>
  <theme>
    <name>Clearlooks</name>
    <titleLayout>NLIMC</titleLayout>
    <keepBorder>yes</keepBorder>
    <animateIconify>no</animateIconify>
    <font place="ActiveWindow">
      <name>sans</name>
      <size>8</size>
      <weight>normal</weight>
      <slant>normal</slant>
    </font>
  </theme>
  <desktops>
    <number>1</number>
    <firstdesk>1</firstdesk>
    <names>
      <name>Desktop</name>
    </names>
    <popupTime>875</popupTime>
  </desktops>
  <resize>
    <drawContents>yes</drawContents>
    <popupShow>Nonpixel</popupShow>
    <popupPosition>Center</popupPosition>
    <popupFixedPosition>
      <x>10</x>
      <y>10</y>
    </popupFixedPosition>
  </resize>
  <margins>
    <top>0</top>
    <bottom>0</bottom>
    <left>0</left>
    <right>0</right>
  </margins>
  <dock>
    <position>TopLeft</position>
    <floatingX>0</floatingX>
    <floatingY>0</floatingY>
    <noStrut>no</noStrut>
    <stacking>Above</stacking>
    <direction>Vertical</direction>
    <autoHide>no</autoHide>
    <hideDelay>300</hideDelay>
    <showDelay>300</showDelay>
    <moveButton>Middle</moveButton>
  </dock>
  <keyboard>
    <chainQuitKey>C-g</chainQuitKey>
  </keyboard>
  <mouse>
    <dragThreshold>1</dragThreshold>
    <doubleClickTime>500</doubleClickTime>
    <screenEdgeWarpTime>400</screenEdgeWarpTime>
    <screenEdgeWarpMouse>false</screenEdgeWarpMouse>
    <context name="Frame">
      <mousebind button="A-Left" action="Press">
        <action name="Focus"/>
        <action name="Raise"/>
      </mousebind>
      <mousebind button="A-Left" action="Click">
        <action name="Unshade"/>
      </mousebind>
      <mousebind button="A-Left" action="Drag">
        <action name="Move"/>
      </mousebind>
    </context>
    <context name="Titlebar">
      <mousebind button="Left" action="Drag">
        <action name="Move"/>
      </mousebind>
      <mousebind button="Left" action="DoubleClick">
        <action name="ToggleMaximize"/>
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
</openbox_config>
EOF

echo "📝 Configuração do Openbox criada com suporte a _NET_ACTIVE_WINDOW"

# Instalar wmctrl se não estiver disponível
if ! command -v wmctrl &> /dev/null; then
    echo "📦 Instalando wmctrl..."
    apt-get update && apt-get install -y wmctrl
fi

# Recarregar configuração do Openbox se estiver rodando
if pgrep openbox > /dev/null; then
    echo "🔄 Recarregando configuração do Openbox..."
    openbox --reconfigure
    sleep 2
fi

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
