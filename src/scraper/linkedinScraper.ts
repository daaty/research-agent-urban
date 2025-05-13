import { chromium } from 'playwright'; // Already imported

export async function scrapeLinkedIn(linkedinUrl: string): Promise<string[]> {
  const browser = await chromium.launch({
    headless: false,  // <<==== MAKE IT FALSE to see browser
    slowMo: 50        // <<==== (optional) slow down actions so you can manually log in
  });
  const page = await browser.newPage();
  await page.goto(linkedinUrl, { waitUntil: 'load' });

  // ❗❗ WAIT here so you can manually login
  console.log("🛑 Waiting for you to login manually... please login into LinkedIn in the opened browser.");

  await page.waitForTimeout(60000); // wait 60 seconds for manual login

  // After login, continue scraping...
  const posts = await page.$$eval('div.feed-shared-update-v2', elements =>
    elements.map(el => el.textContent?.trim() || '')
  );

  await browser.close();
  return posts;
}
