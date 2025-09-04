export default defineEventHandler(async (event) => {
  const symbolOrName = event.context.params?.searchString ?? '';
  const query = getQuery(event)
  const full = query.full === 'true' || query.full === true || query.full === 1 || query.full === '1'

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
    quotesCount: '1',
    newsCount: '0',
    enableFuzzyQuery: 'false',
  });

  const res = await fetch(
    `https://query2.finance.yahoo.com/v1/finance/search?${params.toString()}`,
    { headers: { 'User-Agent': 'Mozilla/5.0...' } }
  );

  const data = await res.json();
  if (full) {
    return data.quotes?.[0] || null;
  }
  return data.quotes?.[0]?.symbol || null;
})
