import * as cron from 'node-cron';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { scrapeAllRidesDataPersistent } from '../scraper/ridesPersistentScraper';

interface RideData {
  id: string;
  driver: string;
  passenger: string;
  status: string;
  date: string;
  time: string;
  route: string;
  price?: string;
  [key: string]: any;
}

interface MonitoringResult {
  timestamp: string;
  totalRecords: number;
  newRecords: RideData[];
  updatedRecords: RideData[];
  cancelledRecords: RideData[];
  completedRecords: RideData[];
  summary: {
    newCount: number;
    updatedCount: number;
    cancelledCount: number;
    completedCount: number;
  };
}

class MonitoringService {
  private previousData: RideData[] = [];
  private dataFilePath: string;
  private isRunning: boolean = false;
  private cronTasks: any[] = [];

  constructor() {
    this.dataFilePath = path.join(__dirname, '../../data/previous-rides-data.json');
    this.loadPreviousData();
  }

  private loadPreviousData(): void {
    try {
      if (fs.existsSync(this.dataFilePath)) {
        const data = fs.readFileSync(this.dataFilePath, 'utf-8');
        this.previousData = JSON.parse(data);
        console.log(`✅ Dados anteriores carregados: ${this.previousData.length} registros`);
      } else {
        console.log('📁 Nenhum dado anterior encontrado. Iniciando do zero.');
        // Criar diretório se não existir
        const dir = path.dirname(this.dataFilePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados anteriores:', error);
      this.previousData = [];
    }
  }

  private savePreviousData(data: RideData[]): void {
    try {
      fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2));
      console.log(`💾 Dados salvos: ${data.length} registros`);
    } catch (error) {
      console.error('❌ Erro ao salvar dados:', error);
    }
  }

  private generateRideId(ride: any): string {
    // Gera um ID único baseado nos dados da corrida
    const key = `${ride.driver || ''}_${ride.passenger || ''}_${ride.date || ''}_${ride.time || ''}_${ride.route || ''}`;
    return Buffer.from(key).toString('base64').substring(0, 16);
  }

  private normalizeRideData(rawData: any[]): RideData[] {
    return rawData.map(ride => ({
      id: this.generateRideId(ride),
      driver: ride.driver || ride.motorista || '',
      passenger: ride.passenger || ride.passageiro || '',
      status: ride.status || ride.situacao || '',
      date: ride.date || ride.data || '',
      time: ride.time || ride.hora || '',
      route: ride.route || ride.rota || ride.origem_destino || '',
      price: ride.price || ride.preco || ride.valor || '',
      ...ride
    }));
  }

  private detectChanges(currentData: RideData[], previousData: RideData[]): MonitoringResult {
    const timestamp = new Date().toISOString();
    const newRecords: RideData[] = [];
    const updatedRecords: RideData[] = [];
    const cancelledRecords: RideData[] = [];
    const completedRecords: RideData[] = [];

    // Mapear dados anteriores por ID
    const previousMap = new Map(previousData.map(ride => [ride.id, ride]));

    // Verificar registros atuais
    for (const currentRide of currentData) {
      const previousRide = previousMap.get(currentRide.id);

      if (!previousRide) {
        // Novo registro
        newRecords.push(currentRide);
      } else if (previousRide.status !== currentRide.status) {
        // Status mudou
        updatedRecords.push(currentRide);
        
        // Verificar se foi cancelado ou concluído
        if (currentRide.status.toLowerCase().includes('cancel')) {
          cancelledRecords.push(currentRide);
        } else if (currentRide.status.toLowerCase().includes('concluí') || 
                   currentRide.status.toLowerCase().includes('finaliz')) {
          completedRecords.push(currentRide);
        }
      }
    }

    return {
      timestamp,
      totalRecords: currentData.length,
      newRecords,
      updatedRecords,
      cancelledRecords,
      completedRecords,
      summary: {
        newCount: newRecords.length,
        updatedCount: updatedRecords.length,
        cancelledCount: cancelledRecords.length,
        completedCount: completedRecords.length
      }
    };
  }
  private async sendToN8n(result: MonitoringResult): Promise<void> {
    try {
      const webhookUrl = process.env.N8N_WEBHOOK_URL;
      if (!webhookUrl) {
        console.log('⚠️ N8N_WEBHOOK_URL não configurado no .env');
        return;
      }

      const payload = {
        ...result,
        hasChanges: result.summary.newCount > 0 || 
                   result.summary.updatedCount > 0 || 
                   result.summary.cancelledCount > 0 || 
                   result.summary.completedCount > 0,
        metadata: {
          scraperVersion: '1.0.0',
          source: 'rides-dashboard',
          environment: process.env.NODE_ENV || 'development'
        }
      };

      // Só enviar se há dados ou mudanças (para evitar spam de requests vazios)
      if (result.totalRecords === 0 && !payload.hasChanges) {
        console.log('⏭️ Pulando envio para n8n (sem dados e sem mudanças)');
        return;
      }

      console.log(`🚀 Enviando para n8n: ${JSON.stringify(result.summary)}`);
      
      const response = await axios.post(webhookUrl, payload, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Rides-Scraper-Bot/1.0'
        },
        timeout: 30000
      });

      console.log(`✅ Dados enviados para n8n: ${response.status}`);    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        console.log('⚠️ n8n webhook não encontrado (404) - Verifique se o workflow está ativo');
      } else {
        console.error('❌ Erro ao enviar para n8n:', error instanceof Error ? error.message : error);
      }
    }
  }

  private async performScraping(): Promise<void> {
    if (this.isRunning) {
      console.log('⚠️ Scraping já em execução, pulando...');
      return;
    }

    this.isRunning = true;
    console.log(`🕐 [${new Date().toLocaleString()}] Iniciando scraping...`);    try {      // Executar scraping
      const scrapingResult = await scrapeAllRidesDataPersistent();
      
      if (!scrapingResult.success || !scrapingResult.data || scrapingResult.data.length === 0) {
        console.log('⚠️ Nenhum dado extraído:', scrapingResult.message);
        return;
      }

      // Converter dados de tabelas para array plano
      const rawData: any[] = [];
      scrapingResult.data.forEach((table: any) => {
        if (!table.isEmpty && table.rows.length > 0) {
          table.rows.forEach((row: any) => {
            const rowData: any = {};
            table.headers.forEach((header: any, index: number) => {
              rowData[header.toLowerCase().replace(/\s+/g, '_')] = row[index] || '';
            });
            rowData.table_name = table.name;
            rawData.push(rowData);
          });
        }
      });

      // Normalizar dados
      const currentData = this.normalizeRideData(rawData);
      console.log(`📊 Dados extraídos: ${currentData.length} registros`);

      // Detectar mudanças
      const changes = this.detectChanges(currentData, this.previousData);
      
      // Log das mudanças
      if (changes.summary.newCount > 0) {
        console.log(`🆕 Novos registros: ${changes.summary.newCount}`);
      }
      if (changes.summary.updatedCount > 0) {
        console.log(`🔄 Registros atualizados: ${changes.summary.updatedCount}`);
      }
      if (changes.summary.cancelledCount > 0) {
        console.log(`❌ Registros cancelados: ${changes.summary.cancelledCount}`);
      }
      if (changes.summary.completedCount > 0) {
        console.log(`✅ Registros concluídos: ${changes.summary.completedCount}`);
      }

      // Enviar para n8n (sempre, mesmo sem mudanças para heartbeat)
      await this.sendToN8n(changes);

      // Salvar dados atuais
      this.savePreviousData(currentData);
      this.previousData = currentData;

      console.log(`✅ [${new Date().toLocaleString()}] Scraping concluído`);
    } catch (error) {
      console.error('❌ Erro durante scraping:', error);
    } finally {
      this.isRunning = false;
    }
  }

  public startMonitoring(): void {
    console.log('🚀 Iniciando monitoramento automático...');
    console.log('⏰ Frequência: A cada 2,5 minutos');
    console.log(`🌐 Webhook n8n: ${process.env.N8N_WEBHOOK_URL}`);
    console.log(`👀 Modo headless: ${process.env.HEADLESS_MODE}`);

    // Executar uma vez imediatamente
    setTimeout(() => {
      this.performScraping();
    }, 5000); // 5 segundos de delay inicial    // Agendar execução a cada 2,5 minutos
    const task1 = cron.schedule('*/2 * * * *', () => {
      this.performScraping();
    });

    // Também executar no meio do intervalo (1,25 minutos depois)
    const task2 = cron.schedule('1-59/2 * * * *', () => {
      setTimeout(() => {
        this.performScraping();
      }, 30000); // 30 segundos depois do minuto ímpar
    });

    this.cronTasks = [task1, task2];

    console.log('✅ Monitoramento iniciado!');
  }
  public stopMonitoring(): void {
    console.log('🛑 Parando monitoramento...');
    this.cronTasks.forEach(task => {
      if (task && task.stop) {
        task.stop();
      }
    });
    this.cronTasks = [];
  }

  public async runOnce(): Promise<void> {
    console.log('🔄 Executando scraping único...');
    await this.performScraping();
  }
}

export { MonitoringService, RideData, MonitoringResult };
