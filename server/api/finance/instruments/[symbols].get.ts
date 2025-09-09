// server/api/finance/manual/[symbol].get.ts
import { defineEventHandler } from 'h3';
import { fetchWithRetry } from '~~/server/utils/fetchWithRetry';

let cached = { cookie: '', crumb: '', ts: 0 };

async function getCookieAndCrumb() {
  // Cache for 10 minutes
  if (Date.now() - cached.ts < 600_000 && cached.cookie && cached.crumb) {
    return cached;
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Connection': 'keep-alive',
  };

  // Step 1: Get cookie
  const r1 = await fetchWithRetry('https://fc.yahoo.com/', {
    redirect: 'manual',
    headers
  });
  const setCookie = r1.headers.get('set-cookie');
  const cookie = setCookie ? setCookie.split(',')[0] : '';

  // Step 2: Get crumb
  const r2 = await fetchWithRetry('https://query2.finance.yahoo.com/v1/test/getcrumb', {
    headers: { ...headers, Cookie: cookie }
  });
  const crumb = (await r2.text()).trim();

  cached = { cookie, crumb, ts: Date.now() };
  return cached;
}

export default defineEventHandler(async (event) => {
  const id = event.context.params?.symbols;
  if (!id) return { error: 'Missing symbols parameter' };

  const symbols = id.split(',');

  if (!symbols.length) return { error: 'Missing symbols' };

  try {
    const { cookie, crumb } = await getCookieAndCrumb();

    const fields = [
      'longName',
      'regularMarketChange',
      'regularMarketChangePercent',
      'regularMarketDayHigh',
      'regularMarketDayLow',
      'regularMarketDayRange',
      'regularMarketPreviousClose',
      'regularMarketPrice',
      'regularMarketTime',
      'regularMarketVolume',
      'shortName',
      'contractSymbol',
      'currency',
      'exchange',
    ];

    const params = new URLSearchParams({
      fields: fields.join(','),
      formatted: 'false',
      imgHeights: '50',
      imgLabels: 'logoUrl',
      imgWidths: '50',
      symbols: symbols.join(','),
      enablePrivateCompany: 'true',
      overnightPrice: 'true',
      lang: 'nb-NO',
      region: 'NO',
      crumb
    });

    const response = await fetchWithRetry(
      `https://query1.finance.yahoo.com/v7/finance/quote?${params}`,
      { headers: { Cookie: cookie } }
    );

    if (!response.ok) {
      throw new Error(`Yahoo returned ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
});
