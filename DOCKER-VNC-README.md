# 🐳 Docker VNC Setup - Research Agent Urban

## 🚀 Deploy com VNC Support

Sua aplicação agora tem **suporte completo ao VNC** para visualizar a interface gráfica dos navegadores em containers Docker!

### ✨ **Funcionalidades VNC:**
- 🖥️ **noVNC Web**: Acesso via navegador
- 🔐 **VNC Direto**: Cliente VNC nativo
- 👀 **Visualização em tempo real** do navegador
- 🎯 **Debug visual** das automações

---

## 🏗️ **Como Usar:**

### **1. Configurar Variáveis:**
```bash
# Copiar exemplo
cp .env.docker .env

# Editar credenciais
nano .env
```

### **2. Build e Deploy:**
```bash
# Docker Compose (recomendado)
docker-compose up --build

# Ou Docker tradicional
docker build -t research-agent-urban .
docker run -p 3000:3000 -p 6080:6080 research-agent-urban
```

### **3. Acessar Interfaces:**

#### 🌐 **Web UI da Aplicação:**
```
http://localhost:3000
```

#### 🖥️ **VNC via Web (noVNC):**
```
http://localhost:6080/vnc.html
```
- **Senha padrão:** `youvncpassword`
- **Mudar senha:** Configure `VNC_PASSWORD` no .env

#### 🎯 **VNC Direto:**
```
vnc://localhost:5901
```

---

## 🎯 **Para EasyPanel:**

### **Configuração Necessária:**

1. **Repositório GitHub:** ✅ Ready
2. **Dockerfile:** ✅ Ready  
3. **Portas expostas:**
   - `3000` - Web UI
   - `6080` - noVNC web
   - `5901` - VNC direto

### **Variáveis de Ambiente no EasyPanel:**
```env
RIDES_USERNAME=seu_email@exemplo.com
RIDES_PASSWORD=sua_senha
N8N_WEBHOOK_URL=https://seu-webhook.com
VNC_PASSWORD=sua_senha_vnc
BROWSER_HEADLESS=false
```

### **URLs de Acesso:**
- **App:** `https://seu-app.easypanel.host`
- **VNC:** `https://seu-app.easypanel.host:6080/vnc.html`

---

## 🔧 **Debugging:**

### **Ver logs do container:**
```bash
docker-compose logs -f research-agent-urban
```

### **Entrar no container:**
```bash
docker exec -it research-agent-urban bash
```

### **Testar VNC manualmente:**
```bash
# No container
x11vnc -display :99 -nopw -listen localhost
```

---

## 📋 **Arquivos de Configuração:**

- `Dockerfile` - Multi-stage com VNC
- `supervisord.conf` - Gerencia VNC + App
- `docker-compose.yml` - Orquestração completa
- `.env.docker` - Exemplo de configuração

---

## 🎉 **Vantagens do VNC:**

✅ **Visualização em tempo real** dos navegadores  
✅ **Debug visual** das automações  
✅ **Compatível com EasyPanel**  
✅ **Acesso via web browser**  
✅ **Sem dependência de GUI local**  
✅ **Ideal para produção em cloud**  

---

## 🚨 **Importante:**

- VNC funciona **perfeitamente** em containers
- Navegadores abrem **visualmente** no VNC
- **NÃO precisa** de interface gráfica no host
- **Funciona** em qualquer VPS/Cloud

Agora você pode fazer deploy no **EasyPanel** ou qualquer plataforma Docker! 🎯
