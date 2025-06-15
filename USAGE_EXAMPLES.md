# Exemplos de Uso - Rides Dashboard Scraper

## 🚀 Como Usar os Endpoints

### 1. Testar Login
```bash
curl -X POST https://sturdy-space-spoon-7g5gx9w5r6whrpvv-3000.app.github.dev/api/rides/test-enter-login \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Resposta de Sucesso:**
```json
{
  "success": true,
  "message": "Login bem-sucedido! URL final: https://rides.ec2dashboard.com/#/app/dashboard/, Título: \"Dashboard - Urban\""
}
```

### 2. Investigar Formulários
```bash
curl -X POST https://sturdy-space-spoon-7g5gx9w5r6whrpvv-3000.app.github.dev/api/rides/investigate-form \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 3. Capturar Tráfego de Rede
```bash
curl -X POST https://sturdy-space-spoon-7g5gx9w5r6whrpvv-3000.app.github.dev/api/rides/capture-network \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 📋 Checklist para Próximas Implementações

### Extração de Tabelas
- [ ] Identificar seções/abas do dashboard
- [ ] Localizar as 5 tabelas mencionadas
- [ ] Implementar navegação entre abas
- [ ] Extrair headers das tabelas
- [ ] Extrair dados das linhas
- [ ] Lidar com tabelas vazias
- [ ] Implementar retry em caso de falha

### Integração com n8n
- [ ] Criar endpoint para envio de dados brutos
- [ ] Criar endpoint para envio de dados resumidos
- [ ] Implementar tratamento de erros
- [ ] Adicionar logs de debug
- [ ] Configurar webhooks do n8n

### Melhorias de Robustez
- [ ] Implementar reconexão automática
- [ ] Adicionar capturas de tela para debug
- [ ] Implementar cache de sessão
- [ ] Adicionar monitoramento de saúde
- [ ] Implementar rate limiting

## 🔧 Configuração do Ambiente

### Variáveis de Ambiente Necessárias
```env
# Acesso ao Rides Dashboard
RIDES_URL=https://rides.ec2dashboard.com/#/page/login
RIDES_LOGIN=herbert@urbandobrasil.com.br
RIDES_PASSWORD=herbert@urban25

# Integração com n8n (futuro)
N8N_WEBHOOK_URL=https://seu-n8n-webhook-url
N8N_API_KEY=sua-api-key-aqui
```

### Comandos Úteis
```bash
# Instalar dependências
npm install

# Instalar browsers do Playwright
npx playwright install

# Executar em modo desenvolvimento
npm run dev

# Testar conexão básica
curl -X POST http://localhost:3000/api/rides/test-simple \
  -H "Content-Type: application/json" \
  -d '{}'
```

## 🐛 Troubleshooting

### Problema: "Target page, context or browser has been closed"
**Solução:** Verificar se `headless: true` está configurado

### Problema: "url: expected string, got undefined"
**Solução:** Reiniciar aplicação para recarregar variáveis do `.env`

### Problema: "Incorrect Password"
**Solução:** Verificar credenciais no `.env` e reiniciar aplicação

### Problema: Playwright não funciona
**Solução:** Executar `npx playwright install chromium`
