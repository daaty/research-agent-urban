import dotenv from 'dotenv';
dotenv.config();
import { scrapeAllRidesDataPersistent } from './scraper/ridesPersistentScraper';
import { config } from './config';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

interface CachedData {
  timestamp: string;
  data: any[];
  hash: string;
  recordCount: number;
}

class AutoScraper {
  private intervalId: NodeJS.Timeout | null = null;
  private cacheFilePath: string;
    constructor() {
    this.cacheFilePath = path.join(process.cwd(), 'data', 'previous-rides-data.json');
  }
  async start() {
    console.log('🤖 INICIANDO SISTEMA AUTOMÁTICO DE SCRAPING COM CACHE');
    console.log('⏰ Executará a cada 2,5 minutos');
    console.log('🔄 Só enviará dados quando houver MUDANÇAS');
    console.log(`📡 Webhook: ${config.n8nWebhookUrl ? 'Configurado ✅' : 'Não configurado ❌'}`);
    console.log(`💾 Cache: ${this.cacheFilePath}`);
    console.log('='.repeat(60));
    
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
    console.log(`\n🔄 [${now}] Iniciando scraping...`);
    
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
        
        // Verificar se houve mudanças
        const hasChanges = await this.checkForChanges(result.data, now);
        
        if (hasChanges) {
          console.log(`🆕 [${now}] MUDANÇAS DETECTADAS! Enviando para webhook...`);
          
          // Enviar para webhook se houver dados e webhook configurado
          if (totalRecords > 0 && this.hasWebhook()) {
            await this.sendWebhook(result.data, now);
          } else if (totalRecords === 0) {
            console.log(`📊 [${now}] Nenhum dado - webhook não enviado`);
          }
          
          // Salvar dados atuais como cache
          await this.saveCache(result.data, now);
          
        } else {
          console.log(`🔄 [${now}] NENHUMA MUDANÇA detectada - webhook não enviado`);
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
    if (this.intervalId) {
      clearInterval(this.intervalId);
      console.log('⏹️ Sistema automático parado');
    }
  }
}

// Iniciar
const scraper = new AutoScraper();
scraper.start();

// Parar com Ctrl+C
process.on('SIGINT', () => {
  console.log('\n🔄 Parando sistema...');
  scraper.stop();
  process.exit(0);
});
