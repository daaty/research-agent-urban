import 'dotenv/config';
import express from 'express';
import scrapeRouter from './api/scrapeController';
import tableScrapingRouter from './api/tableScrapingController';
import ridesRouter from './api/ridesController';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/scrape', scrapeRouter);
app.use('/api/scrape-tables', tableScrapingRouter);
app.use('/api/rides', ridesRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Endpoints disponíveis:`);
  console.log(`- POST /api/scrape (scraping original com LinkedIn)`);
  console.log(`- POST /api/scrape-tables (scraping genérico de tabelas)`);
  console.log(`- POST /api/rides (scraping do Rides Dashboard)`);
  console.log(`- POST /api/rides/test-login (testar login)`);
  console.log(`- POST /api/rides/preview (preview das tabelas)`);
});
