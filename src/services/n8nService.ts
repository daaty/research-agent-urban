import axios from 'axios';
import { TableData } from '../types/tableTypes';

export interface N8nWebhookData {
  timestamp: string;
  sourceUrl: string;
  tables: TableData[];
  summary?: {
    websiteSummary?: string;
    linkedinSummary?: string;
  };
  metadata?: {
    totalTables: number;
    emptyTables: number;
    authenticationRequired: boolean;
  };
}

export class N8nService {
  private webhookUrl: string;

  constructor(webhookUrl: string) {
    this.webhookUrl = webhookUrl;
  }

  async sendData(data: N8nWebhookData): Promise<boolean> {
    try {
      const response = await axios.post(this.webhookUrl, data, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 segundos
      });

      console.log('✅ Dados enviados para n8n com sucesso:', response.status);
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao enviar dados para n8n:', error.message);
      if (error.response) {
        console.error('Status:', error.response.status);
        console.error('Response data:', error.response.data);
      }
      return false;
    }
  }

  async sendTableData(
    sourceUrl: string, 
    tables: TableData[], 
    includeMetadata: boolean = true
  ): Promise<boolean> {
    const webhookData: N8nWebhookData = {
      timestamp: new Date().toISOString(),
      sourceUrl,
      tables,
    };

    if (includeMetadata) {
      webhookData.metadata = {
        totalTables: tables.length,
        emptyTables: tables.filter(table => table.rows.length === 0).length,
        authenticationRequired: true,
      };
    }

    return await this.sendData(webhookData);
  }

  async sendSummarizedData(
    sourceUrl: string,
    tables: TableData[],
    summary: { websiteSummary?: string; linkedinSummary?: string }
  ): Promise<boolean> {
    const webhookData: N8nWebhookData = {
      timestamp: new Date().toISOString(),
      sourceUrl,
      tables,
      summary,
      metadata: {
        totalTables: tables.length,
        emptyTables: tables.filter(table => table.rows.length === 0).length,
        authenticationRequired: true,
      },
    };

    return await this.sendData(webhookData);
  }
}
