#!/bin/bash

# 🖥️ Setup de Split-Screen para VNC
# Instala ferramentas e configura posicionamento automático

echo "🔧 Configurando ambiente split-screen..."

# Verificar se estamos em ambiente VNC
if [ -z "$DISPLAY" ]; then
    echo "❌ DISPLAY não configurado, pulando setup de janelas"
    exit 0
fi

# Instalar wmctrl se não existir
if ! command -v wmctrl &> /dev/null; then
    echo "📦 Instalando wmctrl..."
    apt-get update -qq
    apt-get install -y wmctrl xdotool
else
    echo "✅ wmctrl já instalado"
fi

# Verificar se xdotool existe
if ! command -v xdotool &> /dev/null; then
    echo "📦 Instalando xdotool..."
    apt-get install -y xdotool
else
    echo "✅ xdotool já instalado"
fi

# Configurar Openbox para não forçar posições
if [ -f /etc/xdg/openbox/rc.xml ]; then
    echo "⚙️ Configurando Openbox para split-screen..."
    
    # Backup do arquivo original
    cp /etc/xdg/openbox/rc.xml /etc/xdg/openbox/rc.xml.backup
    
    # Remover políticas de força de posição
    sed -i 's/<decor>yes<\/decor>/<decor>no<\/decor>/g' /etc/xdg/openbox/rc.xml
    sed -i '/<application class="\*">/,/<\/application>/d' /etc/xdg/openbox/rc.xml
fi

echo "✅ Setup de split-screen concluído!"

# Função para arranjar janelas (será chamada pelo Node.js)
arrange_windows() {
    sleep 3  # Aguardar janelas abrirem
    
    echo "🖥️ Procurando janelas do Chrome..."
    
    # Listar janelas do Chrome
    CHROME_WINDOWS=$(wmctrl -l | grep -i chrome | awk '{print $1}')
    
    if [ -z "$CHROME_WINDOWS" ]; then
        echo "⚠️ Nenhuma janela do Chrome encontrada"
        return 1
    fi
    
    WINDOW_COUNT=$(echo "$CHROME_WINDOWS" | wc -l)
    echo "📊 Encontradas $WINDOW_COUNT janela(s) do Chrome"
    
    # Converter para array
    WINDOWS_ARRAY=($CHROME_WINDOWS)
    
    # Posicionar primeira janela à esquerda (800x1170+0+0)
    if [ ${#WINDOWS_ARRAY[@]} -ge 1 ]; then
        echo "⬅️ Posicionando janela 1 à esquerda..."
        wmctrl -i -r ${WINDOWS_ARRAY[0]} -e 0,0,0,800,1170
    fi
    
    # Posicionar segunda janela à direita (800x1170+800+0)
    if [ ${#WINDOWS_ARRAY[@]} -ge 2 ]; then
        echo "➡️ Posicionando janela 2 à direita..."
        wmctrl -i -r ${WINDOWS_ARRAY[1]} -e 0,800,0,800,1170
    fi
    
    echo "✅ Split-screen configurado!"
}

# Exportar função para uso externo
export -f arrange_windows
