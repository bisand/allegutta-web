export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 5,
  baseDelay = 500 // milliseconds
): Promise<Response> {
  let attempt = 0;

  while (attempt <= maxRetries) {
    const response = await fetch(url, options);

    if (response.status !== 429) {
      return response; // success or other error (not rate limit)
    }

    // Hit rate limit, wait with exponential backoff + jitter
    const delay = baseDelay * Math.pow(2, attempt) + Math.floor(Math.random() * 200);
    console.warn(`429 Too Many Requests — retrying in ${delay} ms (attempt ${attempt + 1})`);
    await new Promise(resolve => setTimeout(resolve, delay));

    attempt++;
  }

  throw new Error(`Failed to fetch ${url} after ${maxRetries} retries`);
}
