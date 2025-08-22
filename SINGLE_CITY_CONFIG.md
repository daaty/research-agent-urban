# Configuração do Sistema Híbrido Simplificado

## Visão Geral
O sistema foi simplificado para funcionar com **uma cidade por processo**, conforme sua clarificação. Cada instância do processo gerencia apenas uma cidade específica.

## Variáveis de Ambiente

### Configuração da Cidade
```bash
# Nome da cidade
CITY_NAME="São Paulo"

# URL da API para obter IDs de motoristas
CITY_API_URL="https://api-sp.exemplo.com/drivers"

# Token de autenticação (opcional)
CITY_API_TOKEN="seu_token_aqui"

# Parâmetro adicional para a cidade (opcional)
CITY_PARAM="sao_paulo"

# Habilitar/desabilitar API (padrão: true)
CITY_ENABLED="true"

# IDs de fallback (separados por vírgula)
FALLBACK_DRIVER_IDS="DRV001,DRV002,DRV003,DRV004,DRV005"
```

### Configuração de Recarga
```bash
# URL da API de recarga específica da cidade
RECHARGE_API_URL="https://api-sp.exemplo.com/recharge"

# Token para API de recarga
RECHARGE_API_TOKEN="token_recarga"

# Valor padrão de recarga (em centavos)
DEFAULT_RECHARGE_AMOUNT="5000"
```

## Arquitetura Simplificada

### Uma Cidade por Processo
- **Processo SP**: Gerencia apenas São Paulo
- **Processo RJ**: Gerencia apenas Rio de Janeiro  
- **Processo BH**: Gerencia apenas Belo Horizonte

### Fluxo de Operação
1. **Inicialização**: Carrega configuração da cidade específica
2. **Auto-alimentação**: Busca IDs da API da cidade periodicamente
3. **Extração Contínua**: Extrai dados pessoais dos motoristas
4. **Interrupção Inteligente**: Para extrair quando recebe pedido de recarga
5. **Processamento de Recarga**: Executa recarga via API específica
6. **Retomada**: Volta à extração contínua

## Exemplos de Configuração por Cidade

### São Paulo
```bash
CITY_NAME="São Paulo"
CITY_API_URL="https://dashboard-sp.uber.com/api/drivers"
CITY_API_TOKEN="sp_token_123"
RECHARGE_API_URL="https://dashboard-sp.uber.com/api/recharge"
FALLBACK_DRIVER_IDS="SP001,SP002,SP003"
```

### Rio de Janeiro  
```bash
CITY_NAME="Rio de Janeiro"
CITY_API_URL="https://dashboard-rj.uber.com/api/drivers"
CITY_API_TOKEN="rj_token_456"
RECHARGE_API_URL="https://dashboard-rj.uber.com/api/recharge"
FALLBACK_DRIVER_IDS="RJ001,RJ002,RJ003"
```

### Belo Horizonte
```bash
CITY_NAME="Belo Horizonte"
CITY_API_URL="https://dashboard-bh.uber.com/api/drivers"
CITY_API_TOKEN="bh_token_789"
RECHARGE_API_URL="https://dashboard-bh.uber.com/api/recharge"
FALLBACK_DRIVER_IDS="BH001,BH002,BH003"
```

## API Endpoints Esperados

### Endpoint de IDs de Motoristas
```
GET {CITY_API_URL}?city={CITY_PARAM}
Authorization: Bearer {CITY_API_TOKEN}

Resposta esperada:
{
  "drivers": [
    {
      "id": "DRV123",
      "name": "João Silva",
      "status": "active",
      "last_activity": "2024-01-01T10:00:00Z"
    }
  ]
}
```

### Endpoint de Recarga
```
POST {RECHARGE_API_URL}
Authorization: Bearer {RECHARGE_API_TOKEN}
Content-Type: application/json

{
  "driver_id": "DRV123",
  "amount": 5000,
  "city": "São Paulo"
}
```

## Deployment

### Docker Compose para Múltiplas Cidades
```yaml
version: '3.8'
services:
  hybrid-sp:
    build: .
    environment:
      - CITY_NAME=São Paulo
      - CITY_API_URL=https://api-sp.exemplo.com/drivers
      - RECHARGE_API_URL=https://api-sp.exemplo.com/recharge
    volumes:
      - ./data-sp:/app/data

  hybrid-rj:
    build: .
    environment:
      - CITY_NAME=Rio de Janeiro
      - CITY_API_URL=https://api-rj.exemplo.com/drivers
      - RECHARGE_API_URL=https://api-rj.exemplo.com/recharge
    volumes:
      - ./data-rj:/app/data

  hybrid-bh:
    build: .
    environment:
      - CITY_NAME=Belo Horizonte
      - CITY_API_URL=https://api-bh.exemplo.com/drivers
      - RECHARGE_API_URL=https://api-bh.exemplo.com/recharge
    volumes:
      - ./data-bh:/app/data
```

### Scripts de Inicialização
```bash
# start-sp.sh
export CITY_NAME="São Paulo"
export CITY_API_URL="https://api-sp.exemplo.com/drivers"
npm start

# start-rj.sh  
export CITY_NAME="Rio de Janeiro"
export CITY_API_URL="https://api-rj.exemplo.com/drivers"
npm start

# start-bh.sh
export CITY_NAME="Belo Horizonte"
export CITY_API_URL="https://api-bh.exemplo.com/drivers"
npm start
```

## Vantagens da Arquitetura Simplificada

1. **Isolamento**: Cada cidade opera independentemente
2. **Escalabilidade**: Fácil adicionar novas cidades
3. **Manutenção**: Problemas em uma cidade não afetam outras
4. **Configuração**: Simples e direta para cada cidade
5. **Monitoramento**: Logs e métricas específicas por cidade

## Próximos Passos

1. ✅ DriverIdProvider simplificado implementado
2. ✅ HybridOperationService atualizado
3. 🔄 Teste com configuração de cidade única
4. 📋 Documentação de deployment por cidade
5. 🚀 Deploy em produção por cidade
