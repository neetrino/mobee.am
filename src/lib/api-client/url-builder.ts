import type { RequestOptions } from "./types";

/**
 * Build URL from endpoint and params
 */
export function buildUrl(
  baseUrl: string,
  endpoint: string,
  params?: Record<string, string>
): string {
  // Ensure endpoint starts with /
  const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  // If baseUrl is empty (relative paths for Next.js API routes)
  if (!baseUrl || baseUrl.trim() === '') {
    // Check if we're on the server (Node.js environment)
    const isServer = typeof window === 'undefined';
    
    // On server, we need an absolute URL
    if (isServer) {
      // Try to get the base URL from environment variable or construct it
      let serverUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!serverUrl) {
        if (process.env.VERCEL_URL) {
          serverUrl = `https://${process.env.VERCEL_URL}`;
        } else {
          serverUrl = 'http://localhost:3000';
        }
      }
      
      let url = `${serverUrl}${normalizedEndpoint}`;
      if (params && Object.keys(params).length > 0) {
        const searchParams = Object.entries(params)
          .filter(([_, value]) => value !== undefined && value !== null)
          .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
          .join('&');
        url = `${url}${url.includes('?') ? '&' : '?'}${searchParams}`;
      }
      return url;
    }
    
    // On client, use relative URL
    let url = normalizedEndpoint;
    if (params && Object.keys(params).length > 0) {
      const searchParams = Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      url = `${url}${url.includes('?') ? '&' : '?'}${searchParams}`;
    }
    return url;
  }
  
  // Build base URL for absolute URLs
  let normalizedBaseUrl = baseUrl;
  if (!normalizedBaseUrl.endsWith('/')) {
    normalizedBaseUrl = normalizedBaseUrl.replace(/\/+$/, '');
  }
  
  // Combine base URL and endpoint
  const fullUrl = `${normalizedBaseUrl}${normalizedEndpoint}`;
  
  // Use URL constructor for proper URL handling
  try {
    const url = new URL(fullUrl);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    
    return url.toString();
  } catch (error) {
    // Fallback: manual URL construction if URL constructor fails
    console.error('❌ [API CLIENT] URL construction error:', error, { baseUrl, endpoint, fullUrl });
    
    let url = fullUrl;
    if (params && Object.keys(params).length > 0) {
      const searchParams = Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&');
      url = `${url}${url.includes('?') ? '&' : '?'}${searchParams}`;
    }
    
    return url;
  }
}




