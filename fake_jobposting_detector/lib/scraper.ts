import * as cheerio from 'cheerio';

export async function scrapeJobUrl(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5'
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove script and style tags to clean up the text
    $('script, style, noscript, iframe, img, svg').remove();

    // Extract text and collapse whitespace
    const text = $('body').text().replace(/\s+/g, ' ').trim();
    
    // Take the first 5000 characters to avoid huge payloads and save tokens
    return text.substring(0, 5000);
  } catch (error) {
    console.error("Scraping error:", error);
    throw new Error("Could not scrape the provided URL. It might be blocking automated access or is invalid.");
  }
}

export function extractDomain(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}
