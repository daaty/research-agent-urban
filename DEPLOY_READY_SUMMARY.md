# 🚀 SISTEMA SPLIT-SCREEN VNC - CONFIGURAÇÃO FINAL

## ✅ Status: PRONTO PARA DEPLOY

### 📋 Configurações Principais Confirmadas

#### 🖥️ Portas VNC (CORRETAS)
- **APP**: 3040 
- **VNC**: 5902 (internal)
- **noVNC Web**: 6091 ← **ESTA É A QUE VOCÊ USA**

#### 🎯 Split-Screen Layout
```
┌─────────────────────────────────────────┐
│ VNC Display: 1600x1200                 │
├─────────────────┬───────────────────────┤
│ 🟢 EXTRAÇÃO     │ 🔵 RECARGA           │
│ (0,0)           │ (800,0)              │
│ 800x1170        │ 800x1170             │
└─────────────────┴───────────────────────┘
```

#### 🏙️ Configuração Matupá (PRESERVADA)
```env
CITY_NAME=Matupá
FALLBACK_DRIVER_IDS=MAT001,MAT002,MAT003,MAT004,MAT005
```

### 🔧 Problemas Corrigidos

#### ✅ Supervisord
- Seção `[supervisord]` adicionada
- Prioridades configuradas (10,20,30,40,50,60)
- Logs direcionados corretamente

#### ✅ Browser Initialization  
- Timeouts aumentados (60s)
- Cleanup automático em caso de erro
- Posicionamento split-screen preservado
- Argumentos de estabilidade adicionados

#### ✅ Environment Variables
- `FALLBACK_DRIVER_IDS` **PRESERVADO**
- `CITY_NAME=Matupá` mantido
- Portas VNC corrigidas (5902/6091)

### 🚀 Deploy Instructions

#### 1. EasyPanel Configuration
```yaml
# Branch: vps-deploy-v4
# Ports: 3040, 5902, 6091
# Environment: Usar .env.vps completo
```

#### 2. Volumes Necessários
```yaml
volumes:
  - /app/logs
  - /app/browser-data
  - /app/screenshots
```

#### 3. Acesso VNC
```bash
# Via navegador (ESTE É O QUE VOCÊ USA)
https://seu-dominio:6091

# Via cliente VNC direto
seu-dominio:5902
```

### 🎮 Controles Split-Screen

#### Navegação Entre Browsers
- **Alt + Tab**: Alternar janelas
- **Taskbar**: Barra inferior com abas
- **Mouse**: Clique direto na janela

#### Layout Esperado
- **Esquerda**: Browser extração (hybrid_operation)
- **Direita**: Browser recarga (hybrid_scraper)
- **Ambos**: 800x1170 pixels, lado a lado

### ⚠️ Variáveis CRÍTICAS (NÃO REMOVER)

```env
# ESSENCIAIS PARA MATUPÁ
FALLBACK_DRIVER_IDS=MAT001,MAT002,MAT003,MAT004,MAT005
CITY_NAME=Matupá

# PORTAS CORRETAS
VNC_PORT=5902
NOVNC_PORT=6091

# SPLIT-SCREEN
BROWSER_WIDTH=800
BROWSER_HEIGHT=1170
BROWSER_SPLIT_SCREEN=true
```

### 🧪 Teste Local (Se Necessário)
```bash
# Executar com novo script
docker-compose up --build
# ou
./start-split-screen.sh

# Acessar: http://localhost:6091
```

### 📊 Logs para Monitorar
```bash
# Supervisor services
docker logs research-agent-urban

# Browser específico
tail -f /app/logs/HYBRID-*.log

# VNC connection
tail -f /var/log/supervisor/x11vnc.log
```

## 🎉 RESUMO FINAL

✅ **Split-screen implementado e corrigido**  
✅ **Configurações VNC na porta 6091 (sua porta)**  
✅ **FALLBACK_DRIVER_IDS preservados**  
✅ **Browser positioning automático**  
✅ **Supervisord configurado corretamente**  
✅ **Branch vps-deploy-v4 pronta para deploy**

**🚀 PRÓXIMO PASSO**: Deploy no EasyPanel usando branch `vps-deploy-v4`

---
*Configuração final confirmada - Agosto 2025*
