# DEBUG LOCAL - Branch: debug-headless-local

## 🎯 PROBLEMA
O scraping da aba "Cancelados" está fazendo login com sucesso, navegando corretamente, mas os dados aparecem como "No data available in table" mesmo quando há dados manualmente.

## 🔧 PARA RODAR LOCALMENTE COM HEADLESS=FALSE

### 1. Clonar/baixar esta branch:
```bash
git clone https://github.com/daaty/research-agent-urban.git
cd research-agent-urban
git checkout debug-headless-local
```

### 2. Instalar dependências:
```bash
npm install
npx playwright install
```

### 3. Configurar .env (arquivo já está incluído):
```
RIDES_EMAIL=herbert@urbandobrasil.com.br
RIDES_PASSWORD=sua_senha_aqui
HEADLESS_MODE=false  # <- IMPORTANTE: false para ver o browser
```

### 4. Rodar o servidor:
```bash
npm run dev
```

### 5. Testar os endpoints disponíveis:

#### Endpoints de debug disponíveis:
- `POST http://localhost:3000/api/rides/test-cancelled-only` - Teste básico da aba cancelados
- `POST http://localhost:3000/api/rides/investigate-filters` - Investigar filtros e botões
- `POST http://localhost:3000/api/rides/test-robust-browser` - Teste com browser robusto
- `POST http://localhost:3000/api/rides/test-with-search-button` - Teste clicando no botão "Procurar"

#### Teste recomendado:
```bash
curl -X POST http://localhost:3000/api/rides/test-with-search-button -H "Content-Type: application/json"
```

## 🐛 O QUE OBSERVAR NO BROWSER VISUAL

Quando rodar com `HEADLESS_MODE=false`, observe:

1. **Login**: Deve fazer login com sucesso
2. **Navegação**: Deve ir para https://rides.ec2dashboard.com/#/app/cancelled-rides/4/
3. **Carregamento**: Verificar se há spinners/loading
4. **Botão Procurar**: Deve tentar clicar no botão com texto "Procurar" ou "Search"
5. **Tabela**: Ver se a tabela #ridesTable carrega dados ou fica vazia

## 🔍 SUSPEITAS DO PROBLEMA

1. **Filtros automáticos**: Pode precisar interagir com filtros de data
2. **Botão de pesquisa**: O botão "Procurar" (`ng-click="resetSearchTerm();getRidesData()"`) pode ser necessário
3. **Timing**: Pode precisar aguardar mais tempo para AJAX
4. **Sessão/Context**: Diferenças entre sessão manual vs automatizada

## 📊 ESTADO ATUAL DOS TESTES

- ✅ Login funciona
- ✅ Navegação funciona  
- ✅ Tabela é encontrada
- ❌ Dados não aparecem (sempre "No data available in table")
- ❌ Botão "Procurar" pode não estar sendo clicado corretamente

## 🎯 PRÓXIMOS PASSOS

1. Rodar localmente com headless=false
2. Observar o comportamento visual
3. Identificar se o botão "Procurar" está sendo clicado
4. Verificar se há filtros que precisam ser aplicados
5. Comparar com acesso manual para identificar diferenças
