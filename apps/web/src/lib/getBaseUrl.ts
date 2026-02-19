/**
 * Returns the base URL for API calls.
 *
 * In the browser: returns empty string (relative URL)
 * On the server: returns WEB_BASE_URL environment variable
 *
 * @throws Error if WEB_BASE_URL is not set on the server
 */
export function getBaseUrl(): string {
  // Browser: use relative URL
  if (typeof window !== 'undefined') {
    return '';
  }

  // Server: require WEB_BASE_URL
  const baseUrl = process.env.WEB_BASE_URL;
  if (!baseUrl) {
    throw new Error(
      '[getBaseUrl] WEB_BASE_URL environment variable is not set. ' +
      'Set it in your deployment platform (Vercel, Fly.io, etc.) or .env.local for local development.'
    );
  }

  return baseUrl;
}
