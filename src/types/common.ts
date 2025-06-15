export interface ScrapeResult {
    websiteContent: string;
    linkedinPosts: string[];
    summary: {
      topics: string[];
      news: string;
      clientNews: string;
      blogPosts: string;
    };
  }

// Novos tipos para Rides Dashboard
export interface RidesTableData {
  tableName: string;
  headers: string[];
  rows: string[][];
  isEmpty: boolean;
}

export interface RidesScrapingResult {
  success: boolean;
  message: string;
  tables: RidesTableData[];
  scrapedAt: string;
}

export interface N8nWebhookPayload {
  source: 'rides-dashboard' | 'linkedin-scraper' | 'website-scraper';
  data: any;
  timestamp: string;
  success: boolean;
  message?: string;
}
