import express from 'express';
import scrapeRouter from './api/scrapeController';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use('/api/scrape', scrapeRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
