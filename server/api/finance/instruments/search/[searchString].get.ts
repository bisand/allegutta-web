export default defineEventHandler(async (event) => {
  const symbolOrName = event.context.params?.searchString ?? '';
  const query = getQuery(event)
  const full = query.full === 'true' || query.full === true || query.full === 1 || query.full === '1'
  const all = query.all === 'true' || query.all === true || query.all === 1 || query.all === '1'

  if (!symbolOrName) {
    return { error: 'Missing searchString parameter' };
  }
  if (symbolOrName.length < 2) {
    return { error: 'searchString must be at least 2 characters long' };
  }

  const params = new URLSearchParams({
    q: symbolOrName,
    region: 'NO',
    lang: 'en-US',
    quotesCount: all ? '100' : '10',
    newsCount: '0',
    enableFuzzyQuery: 'false',
  });

  const res = await fetch(
    `https://query2.finance.yahoo.com/v1/finance/search?${params.toString()}`,
    { headers: { 'User-Agent': 'Mozilla/5.0...' } }
  );

  const data = await res.json();
  
  // Helper function to prioritize Oslo Stock Exchange (OSL) results
  // This ensures Norwegian stocks are returned from OSL rather than foreign exchanges
  // Example: ISIN NO0010840515 returns ACR.OL (OSL) instead of NO0010840515.SG (Stuttgart)
  function prioritizeOSLExchange(quotes: Array<{ exchange?: string; [key: string]: unknown }>): Array<{ exchange?: string; [key: string]: unknown }> {
    if (!quotes || quotes.length === 0) return quotes;
    
    // Sort to put OSL exchange first, then others
    return quotes.sort((a, b) => {
      // OSL exchange gets highest priority
      if (a.exchange === 'OSL' && b.exchange !== 'OSL') return -1;
      if (b.exchange === 'OSL' && a.exchange !== 'OSL') return 1;
      
      // If both or neither are OSL, maintain original order
      return 0;
    });
  }
  
  if (full) {
    if (all) {
      // Return all results with OSL prioritized
      const quotes = data.quotes || [];
      return prioritizeOSLExchange(quotes);
    } else {
      // Return single best result (OSL preferred)
      const quotes = data.quotes || [];
      const prioritized = prioritizeOSLExchange(quotes);
      return prioritized[0] || null;
    }
  }
  
  // Default behavior - return symbol of best match (OSL preferred)
  const quotes = data.quotes || [];
  const prioritized = prioritizeOSLExchange(quotes);
  return prioritized[0]?.symbol || null;
})
