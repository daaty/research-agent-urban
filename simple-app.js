require('ts-node/register');
const express = require('express');
const { testCancelledRidesOnly } = require('./src/scraper/testCancelledRides.ts');
const { testCancelledRidesAdvanced } = require('./src/scraper/testCancelledRides2.ts');

const app = express();
app.use(express.json());

// Endpoint simples para testar cancelados
app.post('/test-cancelled', async (req, res) => {
  try {
    console.log('🚀 Testando rides cancelados...');
    const result = await testCancelledRidesOnly();
    res.json(result);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint avançado para testar cancelados
app.post('/test-cancelled-advanced', async (req, res) => {
  try {
    console.log('🚀 Testando rides cancelados (avançado)...');
    const result = await testCancelledRidesAdvanced();
    res.json(result);
  } catch (error) {
    console.error('❌ Erro:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`📍 Endpoints disponíveis:`);
  console.log(`   POST http://localhost:${PORT}/test-cancelled`);
  console.log(`   POST http://localhost:${PORT}/test-cancelled-advanced`);
});
