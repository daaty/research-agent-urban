import axios from 'axios';
import * as cheerio from 'cheerio';

export async function scrapeWebsite(url: string): Promise<string> {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);

  let textContent = '';
  $('p').each((_, elem) => {
    textContent += $(elem).text() + '\n';
  });

  return textContent.trim();
}
