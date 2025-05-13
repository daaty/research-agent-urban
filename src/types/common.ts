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
  