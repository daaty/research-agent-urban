# 🔐 Guia de Uso com Captcha

## Problema Resolvido

O sistema agora detecta automaticamente quando há captcha na página de login e oferece uma solução híbrida:

1. **Detecção automática** de captcha
2. **Login manual** quando necessário
3. **Continuidade automática** do scraping após login manual

## 🚀 Como Usar

### Cenário 1: Sem Captcha (Automático)
```bash
# Funciona como antes
POST /api/rides/scrape
```

### Cenário 2: Com Captcha (Híbrido)

#### Passo 1: Verificar Status
```bash
GET /api/rides/login-status
```

**Resposta esperada:**
```json
{
  "success": true,
  "status": {
    "browserActive": true,
    "sessionValid": false,
    "currentlyLoggedIn": false,
    "message": "Captcha detectado - login manual necessário",
    "requiresManualLogin": true
  }
}
```

#### Passo 2: Abrir Navegador para Login Manual
```bash
POST /api/rides/open-browser-login
```

**Resposta:**
```json
{
  "success": true,
  "message": "Navegador aberto na página de login",
  "instructions": [
    "1. Faça login manualmente no navegador que foi aberto",
    "2. Resolva o captcha se necessário",
    "3. Aguarde até estar logado no dashboard",
    "4. Use o endpoint /api/rides/wait-manual-login para aguardar confirmação"
  ]
}
```

#### Passo 3: Aguardar Confirmação de Login
```bash
POST /api/rides/wait-manual-login
Content-Type: application/json

{
  "timeout": 300000
}
```

**Resposta quando login detectado:**
```json
{
  "success": true,
  "message": "Login manual detectado com sucesso!"
}
```

#### Passo 4: Executar Scraping Normalmente
```bash
POST /api/rides/scrape
```

## 🔄 Fluxo Automático Híbrido

O sistema também oferece um endpoint que combina tudo:

```bash
POST /api/rides/scrape
```

**Comportamento:**
1. ✅ Tenta login automático primeiro
2. 🤖 Se detectar captcha, retorna instrução para login manual
3. ⏳ Aguarda até que login manual seja feito
4. 🚀 Continua com scraping automaticamente

**Resposta com captcha:**
```json
{
  "success": false,
  "message": "Captcha detectado - por favor faça login manualmente no navegador e tente novamente",
  "sessionInfo": {
    "requiresManualLogin": true
  }
}
```

## 📊 Vantagens do Sistema

### 1. **Detecção Inteligente**
- Detecta automaticamente captcha
- Não tenta login automático quando há captcha
- Preserva sessão após login manual

### 2. **Sessão Persistente**
- Browser permanece aberto
- Login manual é feito apenas uma vez
- Reutiliza sessão para múltiplos scrapings

### 3. **Recuperação Automática**
- Detecta quando usuário fez login manual
- Atualiza cache de sessão automaticamente
- Continua scraping sem interrupção

## 🛠️ Fluxo de Desenvolvimento

### Primeira Execução (com captcha)
```bash
# 1. Tentar scraping
curl -X POST http://localhost:3000/api/rides/scrape

# 2. Se retornar erro de captcha, abrir navegador
curl -X POST http://localhost:3000/api/rides/open-browser-login

# 3. Fazer login manualmente no navegador

# 4. Aguardar confirmação
curl -X POST http://localhost:3000/api/rides/wait-manual-login

# 5. Executar scraping
curl -X POST http://localhost:3000/api/rides/scrape
```

### Execuções Subsequentes
```bash
# Funciona automaticamente, sem captcha
curl -X POST http://localhost:3000/api/rides/scrape
```

## 🎯 Configurações Importantes

### Environment Variables
```env
HEADLESS_MODE=false  # IMPORTANTE: deixar false para login manual
SCRAPER_TIMEOUT=300000
```

### Browser Settings
- Browser abre em modo visível
- Sessão é preservada entre execuções
- Dados de login ficam salvos

## 🔧 Troubleshooting

### Problema: "Captcha detectado"
**Solução:** Use o fluxo de login manual descrito acima

### Problema: "Browser não está ativo"
**Solução:** 
```bash
POST /api/rides/open-browser-login
```

### Problema: "Sessão expirada"
**Solução:** Fazer novo login manual ou reiniciar o sistema

### Problema: Captcha mudou
**Solução:** O sistema detecta automaticamente novos tipos de captcha pelos seletores configurados

## 🚀 Exemplo Completo de Uso

```bash
# 1. Verificar status
curl -X GET http://localhost:3000/api/rides/login-status

# 2. Se precisar de login manual
curl -X POST http://localhost:3000/api/rides/open-browser-login

# 3. Fazer login manualmente no navegador (resolver captcha)

# 4. Aguardar confirmação (5 minutos de timeout)
curl -X POST http://localhost:3000/api/rides/wait-manual-login \
  -H "Content-Type: application/json" \
  -d '{"timeout": 300000}'

# 5. Executar scraping
curl -X POST http://localhost:3000/api/rides/scrape

# 6. Verificar dados extraídos
curl -X GET http://localhost:3000/api/status
```

## 📈 Monitoramento

Use o endpoint de status para monitorar:
```bash
GET /api/rides/login-status
```

**Campos importantes:**
- `requiresManualLogin`: true se há captcha
- `currentlyLoggedIn`: true se está logado
- `sessionValid`: true se sessão é válida
- `browserActive`: true se browser está ativo
