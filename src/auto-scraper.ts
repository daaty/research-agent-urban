import dotenv from 'dotenv';
dotenv.config();
import { scrapeAllRidesDataPersistent } from './scraper/ridesPersistentScraper';
import { config } from './config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import express from 'express';
import { RideDataService } from './services/rideDataService';

interface CachedData {
  timestamp: string;
  data: any[];
  hash: string;
  recordCount: number;
}

class AutoScraper {
  private intervalId: NodeJS.Timeout | null = null;
  private cacheFilePath: string;
  private app: express.Application;
  private server: any;
  private isRunning: boolean = false;
  private lastExecution: Date | null = null;
  private executionCount: number = 0;
  private rideDataService: RideDataService;
  
  constructor() {
    this.cacheFilePath = path.join(process.cwd(), 'data', 'previous-rides-data.json');
    this.app = express();
    this.rideDataService = new RideDataService();
    this.setupHealthCheck();
  }
  
  private setupHealthCheck() {
    this.app.use(express.json());
    
    // Health check endpoint
    this.app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        service: 'Research Agent Urban',
        version: '3.0.0-DATABASE-DUPLICATE-PREVENTION',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        isRunning: this.isRunning,
        lastExecution: this.lastExecution?.toISOString() || null,
        executionCount: this.executionCount,
        cacheFile: this.cacheFilePath,
        webhookConfigured: !!config.n8nWebhookUrl,
        duplicatePreventionSystem: 'database-based'
      });
    });
    
    // Status endpoint
    this.app.get('/status', (req, res) => {
      const cacheExists = fs.existsSync(this.cacheFilePath);
      let cacheData = null;
      
      if (cacheExists) {
        try {
          cacheData = JSON.parse(fs.readFileSync(this.cacheFilePath, 'utf8'));
        } catch (error) {
          cacheData = { error: 'Unable to read cache' };
        }
      }
      
      res.json({
        service: 'Research Agent Urban Auto Scraper',
        status: this.isRunning ? 'running' : 'stopped',
        interval: '2.5 minutes',
        cache: {
          exists: cacheExists,
          path: this.cacheFilePath,
          data: cacheData
        },
        stats: {
          lastExecution: this.lastExecution?.toISOString() || null,
          executionCount: this.executionCount,
          uptime: process.uptime()
        }
      });
    });
    
    // Start HTTP server
    const port = process.env.PORT || 3000;
    this.server = this.app.listen(port, () => {
      console.log(`🌐 Health check server running on port ${port}`);
      console.log(`📋 Health: http://localhost:${port}/health`);
      console.log(`📊 Status: http://localhost:${port}/status`);
    });
  }

  async start() {
    console.log('🤖 INICIANDO SISTEMA AUTOMÁTICO DE SCRAPING COM CACHE');
    console.log('⏰ Executará a cada 2,5 minutos');
    console.log('🔄 Só enviará dados quando houver MUDANÇAS');
    console.log(`📡 Webhook: ${config.n8nWebhookUrl ? 'Configurado ✅' : 'Não configurado ❌'}`);
    console.log(`💾 Cache: ${this.cacheFilePath}`);
    console.log('='.repeat(60));
    
    this.isRunning = true;
    
    // Verificar se existe cache antigo e mostrar info
    this.showCacheInfo();
    
    // Reset do cache para garantir funcionamento correto
    await this.resetCache();
    
    // Primeira execução
    await this.doScraping();
    
    // Agendar execuções a cada 2,5 minutos
    this.intervalId = setInterval(() => {
      this.doScraping();
    }, 2.5 * 60 * 1000);
  }
    private async doScraping() {
    const now = new Date().toLocaleString('pt-BR');
    this.lastExecution = new Date();
    this.executionCount++;
    
    console.log(`\n🔄 [${now}] Iniciando scraping... (Execução #${this.executionCount})`);
    
    try {
      const result = await scrapeAllRidesDataPersistent();
      
      if (result.success) {
        const totalRecords = result.data.reduce((sum, table) => sum + table.rows.length, 0);
        
        console.log(`✅ [${now}] Sucesso: ${totalRecords} registros encontrados`);
        
        // Mostrar resumo
        result.data.forEach(table => {
          const status = table.isEmpty ? 'Vazio' : `${table.rows.length} registros`;
          console.log(`   📄 ${table.name}: ${status}`);
        });
        
        // 🆕 NOVA FUNCIONALIDADE: Processar e salvar dados COM verificação de duplicados
        console.log(`🛡️ [${now}] Processando dados com verificação direta na base de dados...`);
        const duplicateCheckResult = await this.processDataWithDuplicateCheck(result.data, now);
        
        // Verificar se há dados novos após verificação
        const hasNewData = duplicateCheckResult.totalNewRecords > 0;
        
        if (hasNewData) {
          console.log(`🆕 [${now}] ${duplicateCheckResult.totalNewRecords} NOVOS REGISTROS salvos na base de dados!`);
          
          if (duplicateCheckResult.totalDuplicates > 0) {
            console.log(`🛡️ [${now}] ${duplicateCheckResult.totalDuplicates} duplicatas prevenidas`);
          }
          
          // Enviar apenas dados novos para webhook
          await this.sendDatabaseVerifiedWebhook(duplicateCheckResult, now);
          
          // Salvar dados atuais como cache (opcional, para logs locais)
          await this.saveCache(result.data, now);
          
        } else {
          if (duplicateCheckResult.totalDuplicates > 0) {
            console.log(`�️ [${now}] TODOS os ${duplicateCheckResult.totalDuplicates} registros são duplicatas - webhook não enviado`);
          } else {
            console.log(`📊 [${now}] Nenhum dado encontrado - webhook não enviado`);
          }
        }
        
      } else {
        console.error(`❌ [${now}] Erro: ${result.message}`);
      }
      
    } catch (error: any) {
      console.error(`💥 [${now}] Erro crítico:`, error.message);
    }
    
    console.log(`⏳ Próxima execução em 2,5 minutos...`);
  }
    /**
   * Verifica se houve mudanças nos dados comparando com a execução anterior
   */
  private async checkForChanges(currentData: any[], timestamp: string): Promise<boolean> {
    try {
      // Criar hash dos dados atuais
      const currentHash = this.createDataHash(currentData);
      const currentRecordCount = currentData.reduce((sum, table) => sum + table.rows.length, 0);
      
      console.log(`🔍 [${timestamp}] Verificando mudanças...`);
      console.log(`   Hash atual: ${currentHash.substring(0, 12)}...`);
      console.log(`   Registros atuais: ${currentRecordCount}`);
      
      // Verificar se existe cache anterior
      if (!fs.existsSync(this.cacheFilePath)) {
        console.log(`🆕 [${timestamp}] Cache não encontrado - primeira execução`);
        console.log(`   Arquivo esperado: ${this.cacheFilePath}`);
        return true; // Primeira execução, considerar como mudança
      }
      
      // Carregar dados anteriores
      let previousData: CachedData;
      try {
        const fileContent = fs.readFileSync(this.cacheFilePath, 'utf8');
        
        // Verificar se é o formato antigo (array) ou novo (objeto com hash)
        const parsedContent = JSON.parse(fileContent);
        
        if (Array.isArray(parsedContent)) {
          console.log(`🔄 [${timestamp}] Detectado formato antigo de cache - convertendo...`);
          // Formato antigo, criar hash dos dados antigos
          const oldDataFormatted = [{
            name: 'Legacy Data',
            headers: [],
            rows: parsedContent,
            isEmpty: parsedContent.length === 0
          }];
          
          previousData = {
            timestamp: 'Legacy format',
            data: oldDataFormatted,
            hash: this.createDataHash(oldDataFormatted),
            recordCount: parsedContent.length
          };
        } else {
          // Formato novo
          previousData = parsedContent as CachedData;
        }
        
      } catch (parseError: any) {
        console.log(`❌ [${timestamp}] Erro ao ler cache anterior:`, parseError.message);
        return true; // Se não conseguir ler, assumir mudança
      }
      
      // Comparar hashes
      const hashChanged = currentHash !== previousData.hash;
      const countChanged = currentRecordCount !== previousData.recordCount;
      
      console.log(`   Hash anterior: ${previousData.hash.substring(0, 12)}...`);
      console.log(`   Registros anteriores: ${previousData.recordCount}`);
      console.log(`   Hash mudou: ${hashChanged ? '✅ SIM' : '❌ NÃO'}`);
      console.log(`   Quantidade mudou: ${countChanged ? '✅ SIM' : '❌ NÃO'}`);
      
      if (hashChanged || countChanged) {
        console.log(`📊 [${timestamp}] MUDANÇAS DETECTADAS!`);
        return true;
      }
      
      console.log(`📊 [${timestamp}] Nenhuma mudança detectada`);
      return false;
      
    } catch (error: any) {
      console.error(`❌ [${timestamp}] Erro ao verificar mudanças:`, error.message);
      return true; // Em caso de erro, assumir que há mudanças
    }
  }
    /**
   * Cria um hash dos dados para comparação
   */
  private createDataHash(data: any[]): string {
    // Criar uma representação string dos dados importantes, ordenada para consistência
    const normalizedData = data.map(table => ({
      name: table.name || 'unnamed',
      isEmpty: table.isEmpty || false,
      rowCount: (table.rows || []).length,
      headers: (table.headers || []).sort(), // Ordenar headers
      rows: (table.rows || []).map((row: any) => {
        // Normalizar cada linha, removendo campos vazios e ordenando chaves
        const normalizedRow: any = {};
        Object.keys(row).sort().forEach(key => {
          if (row[key] !== '' && row[key] !== null && row[key] !== undefined) {
            normalizedRow[key] = row[key];
          }
        });
        return normalizedRow;
      })
    })).sort((a, b) => a.name.localeCompare(b.name)); // Ordenar tabelas por nome
    
    const dataString = JSON.stringify(normalizedData);
    const hash = crypto.createHash('md5').update(dataString).digest('hex');
    
    // Debug: mostrar tamanho dos dados e primeira parte do hash
    console.log(`📊 Hash calculado: ${hash.substring(0, 12)}... (dados: ${dataString.length} chars)`);
    
    return hash;
  }
  
  /**
   * Salva os dados atuais como cache para próxima comparação
   */
  private async saveCache(data: any[], timestamp: string): Promise<void> {
    try {
      const cacheData: CachedData = {
        timestamp,
        data,
        hash: this.createDataHash(data),
        recordCount: data.reduce((sum, table) => sum + table.rows.length, 0)
      };
      
      fs.writeFileSync(this.cacheFilePath, JSON.stringify(cacheData, null, 2));
      console.log(`💾 [${timestamp}] Cache salvo com ${cacheData.recordCount} registros`);
      
    } catch (error: any) {
      console.error(`❌ [${timestamp}] Erro ao salvar cache:`, error.message);
    }
  }
  
  private hasWebhook(): boolean {
    return !!(config.n8nWebhookUrl && !config.n8nWebhookUrl.includes('seu-n8n.com'));
  }
  
  private async sendWebhook(data: any[], timestamp: string) {
    try {
      console.log(`📤 [${timestamp}] Enviando DADOS NOVOS para webhook...`);
      
      const payload = {
        timestamp: new Date().toISOString(),
        localTime: timestamp,
        source: 'rides-auto-scraper-with-changes',
        hasChanges: true,
        data: data,
        summary: {
          totalRecords: data.reduce((sum, table) => sum + table.rows.length, 0),
          tablesWithData: data.filter(table => !table.isEmpty).length,
          changeDetected: true,
          cacheSystem: 'active'
        }
      };
      
      await axios.post(config.n8nWebhookUrl, payload, {
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log(`✅ [${timestamp}] Webhook com DADOS NOVOS enviado com sucesso!`);
      
    } catch (error: any) {
      console.error(`❌ [${timestamp}] Erro webhook:`, error.message);
    }
  }
    /**
   * Limpa o cache forçando envio na próxima execução
   */
  clearCache(): void {
    if (fs.existsSync(this.cacheFilePath)) {
      fs.unlinkSync(this.cacheFilePath);
      console.log('🗑️ Cache limpo - próxima execução enviará dados');
    } else {
      console.log('🗑️ Nenhum cache para limpar');
    }
  }

  /**
   * Força limpeza do cache antigo se necessário
   */
  async resetCache(): Promise<void> {
    console.log('🔄 Resetando cache para garantir funcionamento correto...');
    this.clearCache();
    
    // Criar diretório data se não existir
    const dataDir = path.dirname(this.cacheFilePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
      console.log(`📁 Diretório criado: ${dataDir}`);
    }
  }
    /**
   * Mostra informações do cache atual
   */
  showCacheInfo(): void {
    if (fs.existsSync(this.cacheFilePath)) {
      try {
        const fileContent = fs.readFileSync(this.cacheFilePath, 'utf8');
        const parsedContent = JSON.parse(fileContent);
        
        if (Array.isArray(parsedContent)) {
          console.log('📋 Cache atual (formato antigo):');
          console.log(`   Arquivo: ${this.cacheFilePath}`);
          console.log(`   Registros antigos: ${parsedContent.length}`);
          console.log(`   Formato: Array legacy (será convertido)`);
        } else {
          const cache: CachedData = parsedContent;
          console.log('📋 Cache atual (formato novo):');
          console.log(`   Arquivo: ${this.cacheFilePath}`);
          console.log(`   Última execução: ${cache.timestamp}`);
          console.log(`   Registros salvos: ${cache.recordCount}`);
          console.log(`   Hash: ${cache.hash.substring(0, 16)}...`);
        }
      } catch (error: any) {
        console.log('📋 Erro ao ler cache:', error.message);
      }
    } else {
      console.log('📋 Nenhum cache encontrado - primeira execução');
      console.log(`   Arquivo esperado: ${this.cacheFilePath}`);
    }
  }
    stop() {
    console.log('⏹️ Parando sistema automático...');
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('✅ Timer parado');
    }
    
    if (this.server) {
      this.server.close(() => {
        console.log('✅ Servidor HTTP encerrado');
      });
    }
    
    console.log('🔄 Shutdown completo');
  }

  /**
   * 🆕 Processa dados com verificação de duplicados na base de dados
   */
  async processDataWithDuplicateCheck(scrapedData: any[], timestamp: string): Promise<any> {
    let totalNewRecords = 0;
    let totalDuplicates = 0;
    const processedTables: any[] = [];
    
    for (const table of scrapedData) {
      if (table.isEmpty || table.rows.length === 0) {
        processedTables.push({
          tableName: table.name,
          newRecords: 0,
          duplicates: 0,
          processedData: []
        });
        continue;
      }
      
      try {
        // Processar cada linha da tabela
        const processedRows = [];
        let tableNewRecords = 0;
        let tableDuplicates = 0;
        
        for (const row of table.rows) {
          const rideData = {
            tableName: table.name,
            headers: table.headers,
            data: row,
            scrapedAt: timestamp,
            sourceUrl: table.url
          };
          
          // Verificar e salvar com proteção anti-erro
          try {
            const saveResult = await this.rideDataService.saveRidesData([rideData], table.name);
            
            if (saveResult.savedCount > 0) {
              processedRows.push(rideData);
              tableNewRecords++;
            } else {
              tableDuplicates++;
            }
          } catch (error: any) {
            console.error(`⚠️ Erro ao salvar registro individual (continuando):`, error.message);
            tableDuplicates++; // Contar como duplicata para não parar o processo
          }
        }
        
        totalNewRecords += tableNewRecords;
        totalDuplicates += tableDuplicates;
        
        processedTables.push({
          tableName: table.name,
          newRecords: tableNewRecords,
          duplicates: tableDuplicates,
          processedData: processedRows
        });
        
        console.log(`   🛡️ ${table.name}: ${tableNewRecords} novos, ${tableDuplicates} duplicatas`);
        
      } catch (error: any) {
        console.error(`❌ Erro ao processar tabela ${table.name} (continuando):`, error.message);
        processedTables.push({
          tableName: table.name,
          newRecords: 0,
          duplicates: table.rows.length,
          processedData: [],
          error: error.message
        });
        totalDuplicates += table.rows.length;
      }
    }
    
    return {
      totalNewRecords,
      totalDuplicates,
      processedTables,
      timestamp
    };
  }

  /**
   * 🆕 Envia webhook apenas com dados novos verificados
   */
  async sendDatabaseVerifiedWebhook(duplicateCheckResult: any, timestamp: string): Promise<void> {
    if (!this.hasWebhook()) {
      console.log(`⚠️ [${timestamp}] Webhook URL não configurada`);
      return;
    }
    
    try {
      const payload = {
        timestamp,
        localTime: new Date().toLocaleString('pt-BR'),
        source: 'rides-auto-scraper-database-verified',
        version: '3.0.0-DATABASE-DUPLICATE-PREVENTION',
        duplicatePreventionSystem: 'database-based',
        hasNewData: duplicateCheckResult.totalNewRecords > 0,
        summary: {
          totalNewRecords: duplicateCheckResult.totalNewRecords,
          totalDuplicatesPrevenidos: duplicateCheckResult.totalDuplicates,
          tablesProcessed: duplicateCheckResult.processedTables.length,
          executionNumber: this.executionCount,
          persistedToDatabase: true
        },
        processedTables: duplicateCheckResult.processedTables.map((table: any) => ({
          tableName: table.tableName,
          originalCount: table.newRecords + table.duplicates,
          newRecords: table.newRecords,
          duplicatesPrevenidos: table.duplicates,
          data: table.processedData
        })),
        newDataOnly: duplicateCheckResult.processedTables
          .filter((table: any) => table.newRecords > 0)
          .map((table: any) => ({
            name: table.tableName,
            headers: table.processedData.length > 0 ? Object.keys(table.processedData[0]) : [],
            rows: table.processedData,
            isEmpty: false
          }))
      };
      
      const response = await axios.post(config.n8nWebhookUrl, payload, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Research-Agent-Urban-v3.0-DATABASE-VERIFIED'
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ [${timestamp}] Webhook enviado com sucesso (${duplicateCheckResult.totalNewRecords} novos registros)`);
      } else {
        console.log(`⚠️ [${timestamp}] Webhook respondeu com status ${response.status}`);
      }
      
    } catch (error: any) {
      console.error(`❌ [${timestamp}] Erro webhook verificado:`, error.message);
    }
  }
}

// Iniciar sistema
const scraper = new AutoScraper();
scraper.start();

// Graceful shutdown
const gracefulShutdown = () => {
  console.log('\n� Recebido sinal de parada...');
  scraper.stop();
  
  setTimeout(() => {
    console.log('🚪 Forçando encerramento...');
    process.exit(0);
  }, 5000);
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
process.on('SIGQUIT', gracefulShutdown);
