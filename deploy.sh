#!/bin/bash
# Deploy script para VPS

echo "🚀 Iniciando deploy do Rides Monitoring System..."

# 1. Verificar se Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "❌ Node.js não encontrado. Instalando..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# 2. Verificar se npm está instalado
if ! command -v npm &> /dev/null; then
    echo "❌ npm não encontrado. Instalando..."
    sudo apt-get install -y npm
fi

# 3. Instalar dependências do sistema (para Playwright/Puppeteer)
echo "📦 Instalando dependências do sistema..."
sudo apt-get update
sudo apt-get install -y \
    wget \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libdrm2 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libxss1 \
    libgconf-2-4 \
    xvfb

# 4. Instalar PM2 para gerenciamento de processos
echo "🔧 Instalando PM2..."
sudo npm install -g pm2

# 5. Instalar dependências do projeto
echo "📦 Instalando dependências do projeto..."
npm install

# 6. Instalar browsers do Playwright (garantir que Chromium seja instalado)
echo "🌐 Instalando browsers do Playwright..."
npx playwright install
npx playwright install-deps

# 7. Verificar instalação do Puppeteer (backup)
echo "🔍 Verificando Puppeteer..."
npm run puppeteer-install-chrome || echo "⚠️ Puppeteer pode precisar de configuração manual"

# 8. Buildar o projeto
echo "🔨 Buildando projeto..."
npm run build

# 7. Verificar se .env existe
if [ ! -f .env ]; then
    echo "⚠️ Arquivo .env não encontrado. Copiando .env.example..."
    cp .env.example .env
    echo "✏️ IMPORTANTE: Edite o arquivo .env com suas credenciais!"
fi

# 8. Criar diretório de dados
mkdir -p data

# 9. Iniciar com PM2
echo "🚀 Iniciando aplicação com PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

echo "✅ Deploy concluído!"
echo "📊 Para monitorar: pm2 monit"
echo "🔄 Para restart: pm2 restart rides-monitor"
echo "🛑 Para parar: pm2 stop rides-monitor"
