import express from 'express';
import { scrapeWebsite } from '../scraper/websiteScraper';
import { scrapeLinkedIn } from '../scraper/linkedinScraper';
import { scrapeAuthenticatedTables } from '../scraper/authenticatedTableScraper';
// import { summarizeContent } from '../summarizer/summarizer';

import { summarizeContentWithOllama } from '../summarizer/llamaSummarizer';
import { N8nService } from '../services/n8nService';

const router = express.Router();

// Rota original (mantida para compatibilidade)
router.post('/', async (req, res) => {
  try {
    const { companyUrl, linkedinUrl } = req.body;

    const websiteContent = await scrapeWebsite(companyUrl);
    const linkedinPosts = await scrapeLinkedIn(linkedinUrl);
    // const summary = await summarizeContent(websiteContent, linkedinPosts);
    const summarized = await summarizeContentWithOllama(websiteContent, linkedinPosts);

    res.json(summarized);
     } catch (error: any) {
    console.error('Scraping failed:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Nova rota para scraping de tabelas com envio para n8n
router.post('/tables-to-n8n', async (req, res) => {
  try {
    const { 
      url, 
      loginCredentials, 
      n8nWebhookUrl, 
      sendSummary = false,
      tableSelectors 
    } = req.body;

    // Validações
    if (!url || !n8nWebhookUrl) {
      return res.status(400).json({ 
        error: 'URL e n8nWebhookUrl são obrigatórios' 
      });
    }

    // Fazer scraping das tabelas
    const tables = await scrapeAuthenticatedTables(
      url, 
      loginCredentials, 
      tableSelectors
    );

    // Inicializar serviço n8n
    const n8nService = new N8nService(n8nWebhookUrl);

    let success = false;

    if (sendSummary) {
      // Se solicitado, criar resumo com LLM
      try {
        const tableContent = tables.map(table => 
          `Tabela ${table.title}: ${table.rows.length} linhas`
        ).join('\n');
        
        const summary = await summarizeContentWithOllama(
          `Dados extraídos de ${url}`, 
          [tableContent]
        );

        success = await n8nService.sendSummarizedData(url, tables, summary);
      } catch (summaryError) {
        console.warn('Erro ao gerar resumo, enviando dados brutos:', summaryError);
        success = await n8nService.sendTableData(url, tables);
      }
    } else {
      // Enviar apenas dados brutos
      success = await n8nService.sendTableData(url, tables);
    }

    if (success) {
      res.json({
        success: true,
        message: 'Dados enviados para n8n com sucesso',
        tablesFound: tables.length,
        emptyTables: tables.filter(t => t.rows.length === 0).length,
        totalRows: tables.reduce((sum, table) => sum + table.rows.length, 0)
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Falha ao enviar dados para n8n',
        tablesExtracted: tables.length
      });
    }

  } catch (error: any) {
    console.error('Erro no scraping com n8n:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

// Nova rota para apenas scraping de tabelas (sem envio para n8n)
router.post('/tables', async (req, res) => {
  try {
    const { url, loginCredentials, tableSelectors } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL é obrigatória' });
    }

    const tables = await scrapeAuthenticatedTables(
      url, 
      loginCredentials, 
      tableSelectors
    );

    res.json({
      success: true,
      url,
      extractedAt: new Date().toISOString(),
      tables,
      summary: {
        totalTables: tables.length,
        emptyTables: tables.filter(t => t.rows.length === 0).length,
        totalRows: tables.reduce((sum, table) => sum + table.rows.length, 0)
      }
    });

  } catch (error: any) {
    console.error('Erro no scraping de tabelas:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

export default router;
