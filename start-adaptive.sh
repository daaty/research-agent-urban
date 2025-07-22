#!/bin/bash

# 🚀 Research Agent Urban - Environment-Aware Startup Script
# Detecta automaticamente o ambiente e inicia o sistema com configurações adequadas

echo "🔍 Detectando ambiente de execução..."

# Detectar Docker
if [ -f /.dockerenv ] || [ -n "$DOCKER_CONTAINER" ]; then
    echo "🐳 Ambiente Docker detectado"
    ENVIRONMENT="docker"
elif [ -n "$CODESPACES" ] || [ -n "$CODESPACE_NAME" ]; then
    echo "🌐 Ambiente Codespace detectado"
    ENVIRONMENT="codespace"
else
    echo "🖥️ Ambiente Local detectado"
    ENVIRONMENT="local"
fi

echo "🔧 Configurando para ambiente: $ENVIRONMENT"

case $ENVIRONMENT in
    "docker")
        echo "🐳 Iniciando com configuração Docker (VNC)"
        if [ -n "$VNC_PORT" ] || [ -n "$NOVNC_PORT" ]; then
            echo "📺 VNC habilitado"
            export DISPLAY=:1
            npm run prod
        else
            echo "📺 Modo headless"
            export HEADLESS_MODE=true
            npm run prod
        fi
        ;;
        
    "codespace")
        echo "🌐 Iniciando com configuração Codespace (Xvfb)"
        export DISPLAY=:99
        echo "⚡ Iniciando com xvfb-run..."
        xvfb-run -a -s "-screen 0 1920x1080x24" npm run prod
        ;;
        
    "local")
        echo "🖥️ Iniciando com configuração Local"
        if [ -n "$DISPLAY" ] && [ "$DISPLAY" != "" ]; then
            echo "📺 Display local detectado: $DISPLAY"
            npm run prod
        else
            echo "⚡ Sem display disponível, usando Xvfb"
            export DISPLAY=:99
            xvfb-run -a -s "-screen 0 1920x1080x24" npm run prod
        fi
        ;;
        
    *)
        echo "❌ Ambiente não reconhecido, usando configuração padrão"
        npm run prod
        ;;
esac
