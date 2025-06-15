export const config = {
    linkedInLoginEmail: process.env.LINKEDIN_EMAIL || '',
    linkedInLoginPassword: process.env.LINKEDIN_PASSWORD || '',
    n8nWebhookUrl: process.env.N8N_WEBHOOK_URL || '',
    defaultTimeout: parseInt(process.env.SCRAPER_TIMEOUT || '30000'),
    headlessMode: process.env.HEADLESS_MODE === 'true' || false
  };
  