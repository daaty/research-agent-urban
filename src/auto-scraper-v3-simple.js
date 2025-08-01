const dotenv = require('dotenv');
dotenv.config();

const { scrapeAllRidesDataPersistent } = require('./scraper/ridesPersistentScraper');
const axios = require('axios');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const { Pool } = require('pg');

class SimpleRideDataService {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST || 'n8n_postgres',
      port: parseInt(process.env.DB_PORT || '5432'),
      user: process.env.DB_USERNAME || 'n8n_user',
      password: process.env.DB_PASSWORD || 'n8n_pw',
      database: process.env.DB_NAME || 'n8n_db',
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  
  async saveRidesData(ridesData, tableName) {
    const savedRides = [];
    const duplicates = [];
    
    for (const ride of ridesData) {
      const hash = this.createDataHash(ride);
      
      try {
        const existsQuery = 'SELECT id FROM rides_data WHERE data_hash = $1';
        const existsResult = await this.pool.query(existsQuery, [hash]);
        
        if (existsResult.rows.length > 0) {
          duplicates.push(hash);
          continue;
        }
        
        const insertQuery = `
          INSERT INTO rides_data (table_name, data_hash, ride_data, scraped_at, source)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING id
        `;
        
        const insertResult = await this.pool.query(insertQuery, [
          tableName,
          hash,
          JSON.stringify(ride),
          new Date(),
          'auto-scraper-v3.0'
        ]);
        
        if (insertResult.rows.length > 0) {
          savedRides.push(ride);
        }
        
      } catch (error) {
        console.error(`❌ Erro ao salvar ride:`, error.message);
        duplicates.push(hash);
      }
    }
    
    return {
      savedCount: savedRides.length,
      duplicatesCount: duplicates.length,
      savedRides,
      duplicates
    };
  }
  
  createDataHash(data) {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return crypto.createHash('md5').update(dataString).digest('hex');
  }
  
  async testConnection() {
    try {
      const result = await this.pool.query('SELECT NOW()');
      console.log('✅ Conexão com base de dados OK');
      return true;
    } catch (error) {
      console.error('❌ Erro de conexão com base de dados:', error.message);
      return false;
    }
  }
  
  async disconnect() {
    await this.pool.end();
  }
}

class AutoScraperV3Simple {
  constructor() {
    this.intervalId = null;
    this.isRunning = false;
    this.lastExecution = null;
    this.executionCount = 0;
    this.rideDataService = new SimpleRideDataService();
    this.setupHealthCheck();
  }
  
  setupHealthCheck() {
    this.app = express();
    this.app.use(express.json());
    
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'Research Agent Urban',
        version: '3.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        isRunning: this.isRunning,
        lastExecution: this.lastExecution,
        executionCount: this.executionCount
      });
    });
    
    this.app.get('/status', (req, res) => {
      res.json({
        status: 'running',
        isRunning: this.isRunning,
        lastExecution: this.lastExecution,
        executionCount: this.executionCount,
        intervalActive: this.intervalId !== null
      });
    });
    
    const port = process.env.PORT || 3040;
    this.server = this.app.listen(port, () => {
      console.log(`🌐 Health check server running on port ${port}`);
      console.log(`📋 Health: http://localhost:${port}/health`);
      console.log(`📊 Status: http://localhost:${port}/status`);
    });
  }

  async start() {
    console.log('🚀 Starting Research Agent Urban v3.0...');
    console.log('🛡️ Sistema de prevenção de duplicados com PostgreSQL ATIVO');
    
    try {
      await this.rideDataService.testConnection();
    } catch (error) {
      console.log('⚠️ Database connection test failed, but continuing...');
    }
    
    const intervalMinutes = parseFloat(process.env.SCRAPE_INTERVAL || '2.5');
    const intervalMs = intervalMinutes * 60 * 1000;
    
    console.log(`⏰ Configurando execução automática a cada ${intervalMinutes} minutos`);
    
    // Execute immediately
    await this.doScraping();
    
    // Then set interval
    this.intervalId = setInterval(async () => {
      await this.doScraping();
    }, intervalMs);
    
    console.log('✅ Auto-scraper iniciado com sucesso!');
  }
  
  async doScraping() {
    if (this.isRunning) {
      console.log('⏳ Scraping já em execução, aguardando...');
      return;
    }
    
    this.isRunning = true;
    this.executionCount++;
    this.lastExecution = new Date();
    
    console.log(`🔄 [${this.lastExecution.toLocaleTimeString()}] Iniciando scraping... (Execução #${this.executionCount})`);
    
    try {
      const scrapedData = await scrapeAllRidesDataPersistent();
      
      if (!scrapedData || !scrapedData.data) {
        console.log('❌ Nenhum dado retornado do scraping');
        return;
      }
      
      console.log(`✅ [${new Date().toLocaleTimeString()}] Sucesso: ${scrapedData.data.length} registros encontrados`);
      
      // Process with duplicate prevention
      const currentTimestamp = new Date().toISOString();
      await this.processDataWithDuplicateCheck(scrapedData.data, currentTimestamp);
      
    } catch (error) {
      console.error('❌ Erro durante scraping:', error.message);
    } finally {
      this.isRunning = false;
    }
  }
  
  async processDataWithDuplicateCheck(data, timestamp) {
    console.log('🛡️ Processando dados com verificação direta na base de dados...');
    
    const completedRides = data.filter(item => item.tableName === 'Completed Rides');
    const ongoingRides = data.filter(item => item.tableName === 'Ongoing Rides');
    
    const completedResult = completedRides.length > 0 
      ? await this.rideDataService.saveRidesData(completedRides, 'Completed Rides')
      : { savedCount: 0, duplicatesCount: 0, savedRides: [], duplicates: [] };
      
    const ongoingResult = ongoingRides.length > 0
      ? await this.rideDataService.saveRidesData(ongoingRides, 'Ongoing Rides')
      : { savedCount: 0, duplicatesCount: 0, savedRides: [], duplicates: [] };
    
    console.log(`   🛡️ Completed Rides: ${completedResult.savedCount} novos, ${completedResult.duplicatesCount} duplicatas`);
    console.log(`   🛡️ Ongoing Rides: ${ongoingResult.savedCount} novos, ${ongoingResult.duplicatesCount} duplicatas`);
    
    const totalNew = completedResult.savedCount + ongoingResult.savedCount;
    const totalDuplicates = completedResult.duplicatesCount + ongoingResult.duplicatesCount;
    
    if (totalNew > 0) {
      console.log(`🆕 ${totalNew} NOVOS REGISTROS salvos na base de dados!`);
      
      const newData = [...completedResult.savedRides, ...ongoingResult.savedRides];
      await this.sendDatabaseVerifiedWebhook({ data: newData, timestamp }, timestamp);
    } else {
      console.log('📊 Nenhum dado novo - webhook não enviado');
    }
    
    if (totalDuplicates > 0) {
      console.log(`🛡️ ${totalDuplicates} duplicatas prevenidas`);
    }
  }
  
  async sendDatabaseVerifiedWebhook(duplicateCheckResult, timestamp) {
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    
    if (!webhookUrl) {
      console.log('⚠️ N8N_WEBHOOK_URL não configurada');
      return;
    }
    
    const payload = {
      timestamp,
      source: 'research-agent-urban-v3.0',
      version: '3.0.0',
      duplicatePreventionActive: true,
      data: duplicateCheckResult.data,
      summary: {
        recordCount: duplicateCheckResult.data.length,
        newRecords: duplicateCheckResult.data.length,
        duplicatesPrevented: 'Handled by PostgreSQL verification'
      }
    };
    
    try {
      console.log(`🌐 Enviando ${duplicateCheckResult.data.length} registros para webhook...`);
      
      const response = await axios.post(webhookUrl, payload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000
      });
      
      console.log(`✅ [${new Date().toLocaleTimeString()}] Webhook enviado com sucesso (${duplicateCheckResult.data.length} novos registros)`);
      console.log(`📊 Status: ${response.status} | Resposta: ${JSON.stringify(response.data).substring(0, 100)}...`);
      
    } catch (error) {
      console.error('❌ Erro ao enviar webhook:', error.message);
    }
  }
  
  async stop() {
    console.log('🛑 Parando auto-scraper...');
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    
    if (this.server) {
      this.server.close();
    }
    
    await this.rideDataService.disconnect();
    console.log('✅ Auto-scraper parado');
  }
}

// Start the application
const autoScraper = new AutoScraperV3Simple();

process.on('SIGINT', async () => {
  console.log('\n🛑 Recebido SIGINT, parando aplicação...');
  await autoScraper.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Recebido SIGTERM, parando aplicação...');
  await autoScraper.stop();
  process.exit(0);
});

autoScraper.start().catch((error) => {
  console.error('💥 Erro fatal ao iniciar auto-scraper:', error);
  process.exit(1);
});
