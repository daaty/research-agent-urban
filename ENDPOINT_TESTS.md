# 🧪 Testes dos Endpoints - Sistema de Recarga

Este documento contém os comandos para testar os endpoints do sistema de recarga do Research Agent Urban.

## 🌐 URL Base
```
https://aiagent.urbanmt.com.br/
```

## 📋 Endpoints Disponíveis

### 1. 🏠 Status do Sistema
**Verificar se o servidor está online:**

```bash
# PowerShell
Invoke-RestMethod -Uri "https://aiagent.urbanmt.com.br/" -Method GET

# cURL (Linux/Mac)
curl -X GET "https://aiagent.urbanmt.com.br/"
```

**Resposta esperada:**
```json
{
  "status": "online",
  "message": "🚀 Scraper Persistente funcionando!",
  "mode": "persistent-browser",
  "headlessMode": false,
  "timestamp": "2025-08-22T10:05:25.582Z"
}
```

### 2. 💰 Solicitar Recarga
**Endpoint:** `POST /api/recharge/request`

⚠️ **Requer autenticação:** Token obrigatório via header `Authorization`

```bash
# PowerShell
Invoke-RestMethod -Uri "https://aiagent.urbanmt.com.br/api/recharge/request" -Method POST -Headers @{"Authorization"="Bearer e4c5417942b022424e7bb23dada2e2593ebfebc2bb94f3999dfe6b9d95de8f9a"} -ContentType "application/json" -Body '{"driverId": "17147322", "amount": 10, "priority": "normal"}'

# cURL (Linux/Mac)
curl -X POST "https://aiagent.urbanmt.com.br/api/recharge/request" \
  -H "Authorization: Bearer e4c5417942b022424e7bb23dada2e2593ebfebc2bb94f3999dfe6b9d95de8f9a" \
  -H "Content-Type: application/json" \
  -d '{"driverId": "17147322", "amount": 10, "priority": "normal"}'
```

**Headers obrigatórios:**
- `Authorization: Bearer {RECHARGE_API_TOKEN}` - Token de autenticação

**Parâmetros:**
- `driverId` (string, obrigatório): ID do motorista
- `amount` (number, obrigatório): Valor em centavos (10 = R$ 0,10)
- `priority` (string, opcional): "normal" ou "urgent" (padrão: "normal")

**Resposta esperada:**
```json
{
  "success": true,
  "message": "Recarga solicitada com sucesso",
  "data": {
    "rechargeId": "recharge_1755857195839_02pp09uu2",
    "driverId": "17147322",
    "amount": 10,
    "priority": "normal",
    "status": "queued",
    "timestamp": "2025-08-22T10:06:35.839Z",
    "trackingUrl": "/api/recharge/track/recharge_1755857195839_02pp09uu2"
  }
}
```

### 3. 📊 Rastrear Recarga
**Endpoint:** `GET /api/recharge/track/{rechargeId}`

⚠️ **Requer autenticação:** Token obrigatório via header `Authorization`

```bash
# PowerShell
Invoke-RestMethod -Uri "https://aiagent.urbanmt.com.br/api/recharge/track/recharge_1755858349108_i37987tyx" -Method GET -Headers @{"Authorization"="Bearer e4c5417942b022424e7bb23dada2e2593ebfebc2bb94f3999dfe6b9d95de8f9a"}

# cURL (Linux/Mac)
curl -X GET "https://aiagent.urbanmt.com.br/api/recharge/track/recharge_1755858349108_i37987tyx" \
  -H "Authorization: Bearer e4c5417942b022424e7bb23dada2e2593ebfebc2bb94f3999dfe6b9d95de8f9a"
```

### 4. 🎯 Controles de VNC
**Resetar cursor do VNC:**
```bash
# PowerShell
Invoke-RestMethod -Uri "https://aiagent.urbanmt.com.br/api/vnc/reset-cursor" -Method POST

# cURL
curl -X POST "https://aiagent.urbanmt.com.br/api/vnc/reset-cursor"
```

**Focar janela esquerda (Rides):**
```bash
# PowerShell
Invoke-RestMethod -Uri "https://aiagent.urbanmt.com.br/api/vnc/focus-left" -Method POST

# cURL
curl -X POST "https://aiagent.urbanmt.com.br/api/vnc/focus-left"
```

**Focar janela direita (Drivers/Híbrido):**
```bash
# PowerShell
Invoke-RestMethod -Uri "https://aiagent.urbanmt.com.br/api/vnc/focus-right" -Method POST

# cURL
curl -X POST "https://aiagent.urbanmt.com.br/api/vnc/focus-right"
```

## 🧪 Exemplos de Teste

### Teste Básico de Recarga
```bash
# Solicitar recarga de R$ 1,00 para motorista (COM TOKEN)
Invoke-RestMethod -Uri "https://aiagent.urbanmt.com.br/api/recharge/request" -Method POST -Headers @{"Authorization"="Bearer e4c5417942b022424e7bb23dada2e2593ebfebc2bb94f3999dfe6b9d95de8f9a"} -ContentType "application/json" -Body '{"driverId": "17147322", "amount": 100, "priority": "normal"}'
```

### Teste de Recarga Urgente
```bash
# Solicitar recarga urgente de R$ 0,50 (COM TOKEN)
Invoke-RestMethod -Uri "https://aiagent.urbanmt.com.br/api/recharge/request" -Method POST -Headers @{"Authorization"="Bearer e4c5417942b022424e7bb23dada2e2593ebfebc2bb94f3999dfe6b9d95de8f9a"} -ContentType "application/json" -Body '{"driverId": "17147322", "amount": 50, "priority": "urgent"}'
```

### Verificar Resposta Completa
```bash
# PowerShell - Ver resposta formatada (COM TOKEN)
$result = Invoke-RestMethod -Uri "https://aiagent.urbanmt.com.br/api/recharge/request" -Method POST -Headers @{"Authorization"="Bearer e4c5417942b022424e7bb23dada2e2593ebfebc2bb94f3999dfe6b9d95de8f9a"} -ContentType "application/json" -Body '{"driverId": "17147322", "amount": 10, "priority": "normal"}'
$result | ConvertTo-Json -Depth 10
```

## 📝 IDs de Motoristas para Teste

Base de motoristas extraídos pelo sistema:
- `17147322` - Testado ✅
- `17166153` - Disponível
- `17116809` - Disponível  
- `17109343` - Disponível
- `17101714` - Disponível

## 🚨 Códigos de Erro

### 401 - Unauthorized (Sem Token)
```json
{
  "success": false,
  "error": "Token de acesso obrigatório",
  "message": "Forneça o token via Authorization header (Bearer) ou query parameter (?token=...)"
}
```

### 403 - Forbidden (Token Inválido)
```json
{
  "success": false,
  "error": "Token inválido",
  "message": "Token fornecido não é válido"
}
```

### 400 - Bad Request
```json
{
  "success": false,
  "error": "driver_id é obrigatório"
}
```

```json
{
  "success": false,
  "error": "amount deve ser maior que zero (em centavos)"
}
```

### 404 - Not Found
Endpoint não encontrado ou ID de recarga inválido.

### 500 - Internal Server Error
Erro interno do servidor - verificar logs.

## 🔧 Configuração

O sistema utiliza as seguintes variáveis de ambiente:
- `HYBRID_SPEED_MULTIPLIER=1.5` - Controle de velocidade (50% mais lento para estabilidade)
- `PORT=3030` - Porta do servidor
- `NODE_ENV=production` - Ambiente de produção

## 📊 Status dos Scrapers

O sistema possui 3 scrapers coordenados:
1. **RidesPersistentScraper** - Extrai dados de corridas (`rides_scraper`)
2. **DriversPersistentScraper** - Extrai dados de motoristas (`rides_scraper`)  
3. **RidesDashboardHybridScraper** - Processa recargas individuais (`hybrid_scraper`)

---

**Última atualização:** 22/08/2025 10:06 UTC
**Ambiente:** Produção (aiagent.urbanmt.com.br)
**Status:** ✅ Operacional
