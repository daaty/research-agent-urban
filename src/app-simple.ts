import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import { scrapeAllRidesData } from './scraper/ridesScrapingSimple';
import { config } from './config';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// 🏥 Health check
app.get('/', (req, res) => {
  res.json({ 
    status: 'online', 
    message: '🚀 Scraper funcionando!',
    headlessMode: config.headlessMode,
    timestamp: new Date().toISOString() 
  });
});

// 🎯 ENDPOINT PRINCIPAL - Scraping das tabelas do Rides Dashboard
app.post('/api/rides/scrape', async (req, res) => {
  try {
    console.log('🚀 Iniciando scraping do Rides Dashboard...');
    
    const result = await scrapeAllRidesData();
    
    if (result.success) {
      console.log('✅ Scraping concluído com sucesso!');
      
      // Enviar dados para n8n se configurado
      if (config.n8nWebhookUrl && !config.n8nWebhookUrl.includes('seu-n8n.com')) {
        try {
          console.log('📤 Enviando dados para n8n...');
          await axios.post(config.n8nWebhookUrl, {
            timestamp: new Date().toISOString(),
            source: 'rides-dashboard',
            data: result.data
          });
          console.log('✅ Dados enviados para n8n com sucesso!');
        } catch (error) {
          console.error('❌ Erro ao enviar para n8n:', error);
        }
      }
      
      res.json({
        success: true,
        message: result.message,
        data: result.data,
        summary: {
          totalTables: result.data.length,
          tablesWithData: result.data.filter(table => !table.isEmpty).length,
          tablesEmpty: result.data.filter(table => table.isEmpty).length,
          totalRecords: result.data.reduce((sum, table) => sum + table.rows.length, 0),
          timestamp: new Date().toISOString()
        }
      });
    } else {
      console.error('❌ Erro no scraping:', result.message);
      res.status(500).json({
        success: false,
        message: result.message,
        data: []
      });
    }
    
  } catch (error: any) {
    console.error('❌ Erro crítico no scraping:', error);
    res.status(500).json({
      success: false,
      message: `Erro crítico durante scraping: ${error.message}`,
      data: []
    });
  }
});

// 📊 Status do scraper
app.get('/api/rides/status', (req, res) => {
  res.json({
    status: 'online',
    headlessMode: config.headlessMode,
    n8nConfigured: config.n8nWebhookUrl && !config.n8nWebhookUrl.includes('seu-n8n.com'),
    timestamp: new Date().toISOString()
  });
});

app.listen(PORT, () => {
  console.log('🎉='.repeat(50));
  console.log(`🚀 SERVIDOR FUNCIONANDO NA PORTA ${PORT}`);
  console.log('🎉='.repeat(50));
  console.log(`📋 ENDPOINTS DISPONÍVEIS:`);
  console.log(`- GET  / (status geral)`);
  console.log(`- POST /api/rides/scrape (🎯 NOSSO SCRAPER PRINCIPAL)`);
  console.log(`- GET  /api/rides/status (status do scraper)`);
  console.log('🎉='.repeat(50));
  console.log(`🖥️  Modo visual: ${!config.headlessMode ? 'HABILITADO ✅' : 'Desabilitado'}`);
  console.log('🎉='.repeat(50));
});
