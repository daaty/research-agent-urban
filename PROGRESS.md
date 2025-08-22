# Documentação do Progresso - Scraping Rides Dashboard

## 🎯 Objetivo
Fazer scraping de uma página autenticada (https://rides.ec2dashboard.com) e extrair dados de múltiplas tabelas.

## ✅ Progresso Realizado

### 1. Configuração Inicial
- ✅ Configuramos o ambiente com Playwright
- ✅ Instalamos as dependências necessárias (`npx playwright install`)
- ✅ Configuramos o arquivo `.env` com credenciais corretas

### 2. Resolução de Problemas de Browser
**Problema:** Browser não funcionava em modo headless
**Solução:** 
- Identificamos que o ambiente Codespaces não tem servidor X
- Configuramos `headless: true` com argumentos corretos:
```javascript
{
  headless: true,
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
}
```

### 3. Análise da Página de Login
**Descobertas importantes:**
- Site usa AngularJS (`ng-submit="loginAdmin(user)"`)
- Campos de login: `#exampleInputEmail1` e `#exampleInputPassword1`
- API de login: `https://prod-acl-api.jugnoo.in/v1/acl/operator/login`
- Formulário usa `ng-model="user.email"`

### 4. Problema com Credenciais
**Problema:** Recebíamos "Incorrect Password" mesmo com credenciais aparentemente corretas
**Causa:** Senha estava incorreta no `.env`
**Solução:** Corrigimos a senha de `guaranta@urban25` para `herbert@urban25`

### 5. 🎉 SUCESSO NO LOGIN!
**Endpoint que funcionou:** `/api/rides/test-enter-login`
**Resultado:** 
- Login bem-sucedido ✅
- Redirecionamento para: `https://rides.ec2dashboard.com/#/app/dashboard/`
- Título da página: "Dashboard - Urban"

## 🔧 Código que Funciona

### Configuração do .env
```env
RIDES_URL=https://rides.ec2dashboard.com/#/page/login
RIDES_LOGIN=herbert@urbandobrasil.com.br
RIDES_PASSWORD=herbert@urban25
```

### Endpoint de Login Funcional
```javascript
// Endpoint: POST /api/rides/test-enter-login
// Arquivo: src/scraper/ridesEnterLogin.ts
```

**Características do código que funciona:**
- Usa `headless: true` com argumentos de segurança
- Preenche campos usando `page.fill()`
- Pressiona Enter no campo de senha: `page.press('#exampleInputPassword1', 'Enter')`
- Aguarda redirecionamento com timeout adequado
- Verifica mudança de URL para confirmar sucesso

## 📝 Próximos Passos - SISTEMA HÍBRIDO

### Fase 2: Sistema Híbrido de Extração + Recarga
1. **✅ DriverIdProvider Simplificado** - Uma cidade por processo
2. **✅ HybridOperationService** - Extração contínua + interrupção para recarga
3. **🔄 FASE ATUAL: Integração com Dashboard Real**

### Fluxo do Sistema Híbrido
1. **Login Automático** 
   - URL: `https://rides.ec2dashboard.com/#/page/login`
   - Aguarda resolução de CAPTCHA (se houver)
   - Faz login igual ao scraper existente

2. **Verificação de Login**
   - Redirecionamento para: `https://rides.ec2dashboard.com/#/app/dashboard/`
   - Confirma que login foi bem-sucedido

3. **Identificação da Cidade**
   - Navega para: `https://rides.ec2dashboard.com/#/app/active-drivers/`
   - Extrai cidade do elemento: `<span class="select2-chosen"><span class="ng-binding ng-scope">Matupá</span></span>`

4. **Extração Contínua de Dados Pessoais**
   - Volta para: `https://rides.ec2dashboard.com/#/app/dashboard/`
   - Preenche input: `<input type="text" id="driverId" class="form-control text-center ng-pristine ng-valid ng-touched" placeholder="Enter User ID/Phone/Email">`
   - Clica botão: `<button class="fancyButton md-button md-ink-ripple" ng-click="getDriverInfo(enteredDriverValue)">Details Driver</button>`
   - Extrai dados pessoais do motorista
   - Salva no banco de dados
   - Repete para próximo ID da fila

5. **Interrupção Inteligente para Recarga**
   - Sistema monitora fila de recargas
   - Quando chega pedido de recarga, **interrompe** extração
   - Processa recarga via API específica da cidade
   - **Retoma** extração contínua após recarga

### URLs Hardcoded no Sistema
```javascript
// URLs fixas no código (NÃO adicionar ao .env)
const RIDES_DASHBOARD = 'https://rides.ec2dashboard.com/#/app/dashboard/';
const RIDES_ACTIVE_DRIVERS = 'https://rides.ec2dashboard.com/#/app/active-drivers/';
const RIDES_LOGIN_CHECK = 'https://rides.ec2dashboard.com/#/app/dashboard/';
```

### Configuração ENV (Apenas Login)
```bash
# Manter apenas URL de login no .env
RIDES_LOGIN_URL=https://rides.ec2dashboard.com/#/page/login
RIDES_USERNAME=herbert@urbandobrasil.com.br
RIDES_PASSWORD=herbert@urban25

# Configuração da cidade (uma por processo)
CITY_NAME="Matupá"
CITY_API_URL="https://api-matupa.exemplo.com/drivers"
FALLBACK_DRIVER_IDS="MAT001,MAT002,MAT003"
```

## 🚀 Endpoints Funcionais Criados

1. **`POST /api/rides/test-enter-login`** - Login funcional ✅
2. **`POST /api/rides/test-simple`** - Teste simples de acesso ✅
3. **`POST /api/rides/investigate-form`** - Investigação de formulários ✅
4. **`POST /api/rides/capture-network`** - Captura de tráfego de rede ✅

## 📚 Lições Aprendidas

1. **Sempre usar `headless: true`** em ambientes sem interface gráfica
2. **Reiniciar aplicação** após mudanças no `.env`
3. **AngularJS requer abordagens específicas** para preenchimento de formulários
4. **Captura de rede** é essencial para debug de problemas de autenticação
5. **User-agent pode influenciar** detecção de bots
6. **Timeouts adequados** são cruciais para sites com JavaScript pesado

## 🔗 Arquivos Importantes

- `src/scraper/ridesEnterLogin.ts` - Login funcional
- `src/api/ridesController.ts` - Controller com endpoints
- `.env` - Credenciais corretas
- `src/app.ts` - Aplicação principal

## 🎯 Status Atual
**✅ FASE 1 COMPLETA: Login autenticado funcional**
**🔄 FASE 2 EM ANDAMENTO: Extração de dados das tabelas**
