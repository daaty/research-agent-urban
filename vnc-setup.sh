#!/bin/bash

# Script para configurar senha VNC
VNC_PASSWORD=${VNC_PASSWORD:-suasenhaVNC123}

# Criar diretório VNC se não existir
mkdir -p /root/.vnc

# Gerar arquivo de senha VNC usando x11vnc
echo "$VNC_PASSWORD" | x11vnc -storepasswd /root/.vnc/passwd

# Definir permissões corretas
chmod 600 /root/.vnc/passwd

echo "Senha VNC configurada: $VNC_PASSWORD"
echo "Arquivo de senha criado: /root/.vnc/passwd"
