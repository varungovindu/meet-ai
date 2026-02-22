/**
 * Environment Configuration Helper
 * Automatically detects the correct base URL for different environments
 */

export function getBaseUrl() {
  // Browser - use relative URL
  if (typeof window !== 'undefined') {
    return '';
  }

  // Vercel deployment
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  // Local development
  return `http://localhost:${process.env.PORT || 3000}`;
}

export function getAuthUrl() {
  // Explicit BETTER_AUTH_URL takes precedence
  if (process.env.BETTER_AUTH_URL) {
    const authUrl = process.env.BETTER_AUTH_URL;
    const isLocalhost = authUrl.includes('localhost') || authUrl.includes('127.0.0.1');

    if (!(process.env.VERCEL && isLocalhost)) {
      return authUrl;
    }
  }

  // Auto-detect based on environment
  return getBaseUrl();
}
