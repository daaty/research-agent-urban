import express from 'express';
import { testCancelledRidesAdvanced } from './src/scraper/testCancelledRides2';

const app = express();
app.use(express.json());

// Endpoint simples para testar
app.post('/test-cancelled-advanced', async (req, res) => {
  try {
    console.log('🧪 Iniciando teste AVANÇADO da aba CANCELADOS...');
    const result = await testCancelledRidesAdvanced();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: `Erro durante teste avançado: ${error.message}`,
      timestamp: new Date().toISOString()
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔍 Teste: POST http://localhost:${PORT}/test-cancelled-advanced`);
});
