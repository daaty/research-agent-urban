import express from 'express';
import { scrapeWebsite } from '../scraper/websiteScraper';
import { scrapeLinkedIn } from '../scraper/linkedinScraper';
// import { summarizeContent } from '../summarizer/summarizer';

import { summarizeContentWithOllama } from '../summarizer/llamaSummarizer';

const router = express.Router();

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

export default router;
