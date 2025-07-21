#!/bin/bash

echo "🚀 SCRIPT DE DEPLOY PARA PRODUÇÃO - SISTEMA PERSISTENTE"
echo "======================================================="

# Verificar se está em ambiente Linux/VPS
if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    echo "✅ Sistema Linux detectado"
    
    # Instalar dependências do sistema se necessário
    echo "📦 Verificando dependências do sistema..."
    sudo apt-get update -qq
    sudo apt-get install -y -qq \
        libnss3 \
        libatk-bridge2.0-0 \
        libdrm2 \
        libxkbcommon0 \
        libxcomposite1 \
        libxdamage1 \
        libxrandr2 \
        libgbm1 \
        libxss1 \
        libasound2
fi

# Instalar dependências Node.js
echo "📦 Instalando dependências Node.js..."
npm install

# Instalar browsers Playwright
echo "🌐 Instalando browsers Playwright..."
npx playwright install chromium

# Verificar se .env existe, se não, criar um modelo
if [ ! -f .env ]; then
    echo "⚙️ Criando arquivo .env para produção..."
    cat > .env << EOF
# MODO PRODUÇÃO
HEADLESS_MODE=true

# CREDENCIAIS RIDES
RIDES_LOGIN_URL=https://rides.ec2dashboard.com/#/page/login
RIDES_EMAIL=herbert@urbandobrasil.com.br
RIDES_PASSWORD=herbert@urban25

# WEBHOOK N8N (CONFIGURAR)
N8N_WEBHOOK_URL=https://seu-n8n.com/webhook/rides

# SERVIDOR
PORT=3000
EOF
    echo "⚠️ ATENÇÃO: Configure o N8N_WEBHOOK_URL no arquivo .env"
fi

# Compilar projeto
echo "🔨 Compilando projeto..."
npm run build

# Verificar se compilação funcionou
if [ -f "dist/auto-scraper.js" ]; then
    echo "✅ Compilação bem-sucedida!"
    
    # Verificar se PM2 está instalado
    if command -v pm2 &> /dev/null; then
        echo "🎯 PM2 encontrado. Iniciando aplicação..."
        pm2 delete rides-scraper 2>/dev/null || true
        pm2 start dist/auto-scraper.js --name "rides-scraper"
        pm2 save
        echo "✅ Aplicação rodando com PM2!"
        echo "📊 Use 'pm2 logs rides-scraper' para ver logs"
        echo "📊 Use 'pm2 monit' para monitorar"
    else
        echo "⚠️ PM2 não encontrado. Instale com: npm install -g pm2"
        echo "🎯 Iniciando aplicação normal..."
        npm start
    fi
else
    echo "❌ Erro na compilação!"
    exit 1
fi

echo ""
echo "🎉 DEPLOY CONCLUÍDO!"
echo "================================="
echo "📡 Aplicação rodando na porta 3000"
echo "⏰ Scraping automático a cada 2,5 min"
echo "🔧 Configure o webhook N8N no .env se necessário"
