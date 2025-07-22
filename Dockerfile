# ==================================
# DOCKERFILE - RESEARCH AGENT URBAN WITH VNC
# ==================================

FROM node:18-slim

# Metadados
LABEL maintainer="Research Agent Urban Team"
LABEL version="2.0.0"
LABEL description="Sistema de scraping inteligente com VNC support"

# Variáveis de ambiente para VNC
ENV DISPLAY=:99
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/app/browsers

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
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instalar noVNC para acesso web
RUN git clone https://github.com/novnc/noVNC.git /opt/novnc \
    && git clone https://github.com/novnc/websockify /opt/novnc/utils/websockify \
    && ln -s /opt/novnc/vnc.html /opt/novnc/index.html

# Diretório de trabalho
WORKDIR /app

# Copiar arquivos de configuração
COPY package*.json ./
COPY tsconfig*.json ./

# Instalar TODAS as dependências (incluindo devDependencies para build)
# Force cache bust - v2024-07-21
RUN npm ci && \
    npm cache clean --force

# Copiar código fonte
COPY . .

# Dar permissões aos scripts de deploy
RUN chmod +x deploy-postgresql.sh || echo "Script deploy-postgresql.sh não encontrado, continuando..."

# Build da aplicação (agora com todos os tipos disponíveis)
RUN npm run build

# Instalar navegadores do Playwright
RUN npx playwright install chromium --with-deps

# Criar diretórios necessários
RUN mkdir -p /app/data /app/browser-data /app/cache /var/log/supervisor

# Configurar Supervisor
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Script de inicialização VNC
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Scripts de configuração PostgreSQL
COPY deploy-postgresql.sh setup-postgresql.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/deploy-postgresql.sh /usr/local/bin/setup-postgresql.sh

# Expor portas (NOVA VERSÃO COM POSTGRESQL)
EXPOSE 3040 6090 6091

# Health check (nova porta)
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3040/api/status || exit 1

# Comando padrão usando supervisor
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
