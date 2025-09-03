export default defineEventHandler(async (event) => {
  const symbolOrName = event.context.params?.searchString ?? '';

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
  const resolvedSymbol = data.quotes?.[0]?.symbol;

  return resolvedSymbol;
})
