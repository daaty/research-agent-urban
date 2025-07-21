# 🌐 Guia de Interfaces - Research Agent Urban

## 📍 **IMPORTANTE: Esclarecimento sobre as Interfaces**

### 🔗 **Porta 3030 - API REST (SEM INTERFACE VISUAL)**
```
http://[seu-dominio]:3030
```

**⚠️ NÃO É UMA INTERFACE WEB VISUAL!**

Esta porta expõe apenas **endpoints API REST** para controlar o scraper:

#### 📋 **Endpoints Disponíveis:**
```bash
# Status Geral
GET /                           # Status básico do sistema
GET /api/status                 # Status detalhado com browser info

# Scraping
POST /api/rides/scrape          # ⭐ ENDPOINT PRINCIPAL - Executa scraping
POST /api/rides/scrape-page     # Scraping de página específica
GET /api/rides/pages            # Lista páginas disponíveis

# Autenticação  
POST /api/auth/force-login      # Força novo login
POST /api/rides/open-browser-login   # Abre browser para login manual
POST /api/rides/wait-manual-login    # Aguarda login manual (para captcha)
GET /api/rides/login-status     # Verifica status do login

# Sistema
POST /api/system/cleanup        # Limpeza completa
GET /api/test                   # Teste rápido
GET /api/cache/stats           # Estatísticas do cache
POST /api/cache/clear          # Limpar cache
```

#### 💡 **Como Usar:**
```bash
# Exemplo: Verificar status
curl http://seu-dominio:3030/api/status

# Exemplo: Executar scraping
curl -X POST http://seu-dominio:3030/api/rides/scrape

# Exemplo: Forçar login
curl -X POST http://seu-dominio:3030/api/auth/force-login
```

---

### 🖥️ **Porta 6080 - Interface VNC (VISUAL)**
```
http://[seu-dominio]:6080/vnc.html
```

**✅ ESTA É A INTERFACE VISUAL!**

- 🔑 **Senha**: `suasenhaVNC123`
- 🌐 **Ver navegador** funcionando em tempo real
- 🎯 **Debug visual** do processo de scraping
- 🖱️ **Controle manual** quando necessário (ex: resolver captcha)

---

## 🎯 **Fluxo de Trabalho Recomendado:**

### 1. **Monitoramento via VNC**
- Acesse `http://[seu-dominio]:6080/vnc.html`
- Digite a senha VNC
- Veja o navegador funcionando

### 2. **Controle via API**
- Use `http://[seu-dominio]:3030/api/rides/scrape` para executar
- Monitore pelo VNC
- Verifique logs no EasyPanel

### 3. **Resolução de Captcha**
- Se aparecer captcha, acesse o VNC
- Resolva manualmente
- Continue monitorando

---

## 🔄 **Automação N8N:**

Configure seu webhook N8N para chamar:
```
POST http://[seu-dominio]:3030/api/rides/scrape
```

O sistema enviará os dados automaticamente para o webhook configurado quando houver mudanças.

---

## 📊 **Resumo das Portas:**

| Porta | Tipo | Propósito | Interface |
|-------|------|-----------|-----------|
| 3030  | API REST | Controle programático | ❌ Sem interface visual |
| 6080  | VNC Web  | Visualização do browser | ✅ Interface visual completa |
