#!/bin/bash

# 🚀 Script de inicialização para VPS com split-screen
echo "🚀 Iniciando Research Agent Urban com Split-Screen VNC..."

# Verificar se já está rodando
if pgrep -f "supervisord" > /dev/null; then
    echo "⚠️ Supervisor já está rodando, parando..."
    pkill -f supervisord
    sleep 2
fi

# Limpar processos antigos
echo "🧹 Limpando processos antigos..."
pkill -f "chrome" 2>/dev/null || true
pkill -f "Xvfb" 2>/dev/null || true
pkill -f "x11vnc" 2>/dev/null || true
pkill -f "websockify" 2>/dev/null || true
pkill -f "openbox" 2>/dev/null || true
pkill -f "tint2" 2>/dev/null || true

# Criar diretórios necessários
mkdir -p /var/log/supervisor
mkdir -p /app/logs
mkdir -p /app/browser-data

# Configurar permissões
chmod 755 /app/setup-window-manager.sh 2>/dev/null || true

# Executar setup do window manager
echo "🪟 Configurando window manager..."
bash /app/setup-window-manager.sh 2>/dev/null || true

# Verificar arquivo supervisord.conf
if [ ! -f "/app/supervisord.conf" ]; then
    echo "❌ Arquivo supervisord.conf não encontrado!"
    exit 1
fi

# Compilar TypeScript se necessário
if [ -d "/app/src" ] && [ ! -d "/app/dist" ]; then
    echo "⚙️ Compilando TypeScript..."
    npm run build || echo "⚠️ Falha na compilação, continuando..."
fi

# Iniciar supervisor com configuração personalizada
echo "🎯 Iniciando supervisor com configuração split-screen..."
exec /usr/bin/supervisord -c /app/supervisord.conf -n
