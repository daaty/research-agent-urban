# ==================================
# DOCKERFILE - RESEARCH AGENT URBAN v3.0 
# Sistema de Prevenção de Duplicados com PostgreSQL
# ==================================

FROM node:18-slim

# Metadados
LABEL maintainer="Research Agent Urban v3.0 Team"
LABEL version="3.0.0"
LABEL description="Auto-Scraper v3.0 com PostgreSQL Database Integration e VNC support"

# Variáveis de ambiente
ENV DISPLAY=:99
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/app/browsers
ENV DEBIAN_FRONTEND=noninteractive

# Instalar dependências do sistema incluindo VNC
RUN apt-get update && apt-get install -y \
    wget \
    curl \
    unzip \
    xvfb \
    libgconf-2-4 \
    libxss1 \
    libnss3 \
    libnspr4 \
    libasound2 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    xdg-utils \
    fonts-liberation \
    dbus \
    xauth \
    x11vnc \
    tigervnc-tools \
    supervisor \
    net-tools \
    procps \
    git \
    vim \
    fontconfig \
    fonts-dejavu \
    fonts-dejavu-core \
    fonts-dejavu-extra \
    fonts-noto \
    fonts-noto-color-emoji \
    ca-certificates \
    python3 \
    python3-pip \
    libglib2.0-0 \
    libnss3-dev \
    libatk-bridge2.0-dev \
    libdrm-dev \
    libxcomposite-dev \
    libxdamage-dev \
    libxrandr-dev \
    libgbm-dev \
    libxss-dev \
    libasound2-dev \
    && rm -rf /var/lib/apt/lists/*

# Instalar noVNC para acesso web
RUN git clone https://github.com/novnc/noVNC.git /opt/novnc \
    && git clone https://github.com/novnc/websockify /opt/novnc/utils/websockify \
    && ln -s /opt/novnc/vnc.html /opt/novnc/index.html

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração de dependências
COPY package*.json ./
COPY tsconfig*.json ./

# Instalar dependências NPM COMPLETAS (incluindo devDependencies para build)
RUN npm ci --include=dev && \
    npm cache clean --force

# Copiar código fonte
COPY . .

# Build da aplicação (com TypeScript completo)
RUN npm run build

# Instalar navegadores do Playwright com TODAS as dependências
RUN npx playwright install chromium --with-deps

# Limpar devDependencies após build para otimizar imagem
RUN npm prune --production

# Criar diretórios necessários para v3.0
RUN mkdir -p \
    /app/data \
    /app/browser-data \
    /app/cache \
    /app/screenshots \
    /var/log/supervisor

# Configurar Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Scripts de inicialização
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Expor portas (v3.0 - porta 3040 para evitar conflito com EasyPanel + VNC)
EXPOSE 3040 6090 6091

# Health check para v3.0
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:3040/health || exit 1

# Comando padrão usando supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
