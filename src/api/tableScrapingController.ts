import express from 'express';
import { scrapeAuthenticatedTables } from '../scraper/authenticatedTableScraper';
import { AuthCredentials, TableSelectors } from '../types/tableTypes';

const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { 
      url, 
      credentials, 
      tableSelectors, 
      options = {} 
    }: {
      url: string;
      credentials?: AuthCredentials;
      tableSelectors: TableSelectors;
      options?: { headless?: boolean; manualLogin?: boolean };
    } = req.body;

    // Validação básica
    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    if (!tableSelectors?.tableSelector) {
      return res.status(400).json({ error: 'Seletor de tabela é obrigatório' });
    }

    console.log(`Iniciando scraping de tabelas para: ${url}`);

    const result = await scrapeAuthenticatedTables(
      url,
      credentials || null,
      tableSelectors,
      options
    );

    console.log(`Scraping concluído: ${result.totalTables} tabelas encontradas, ${result.emptyTables} vazias`);

    res.json({
      success: true,
      data: result,
      summary: {
        totalTables: result.totalTables,
        emptyTables: result.emptyTables,
        nonEmptyTables: result.totalTables - result.emptyTables,
        timestamp: result.timestamp
      }
    });

  } catch (error: any) {
    console.error('Erro no scraping de tabelas:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Endpoint para testar conectividade
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Authenticated Table Scraper API está funcionando',
    timestamp: new Date().toISOString()
  });
});

export default router;
