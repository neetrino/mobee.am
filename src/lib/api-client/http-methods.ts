import { ApiError } from "./types";
import type { RequestOptions } from "./types";
import { buildUrl } from "./url-builder";

/** App-only fields must not be passed to native `fetch` (invalid RequestInit). */
function fetchInitWithoutCustomOptions(options?: RequestOptions): RequestInit {
  if (!options) return {};
  const { skipAuth: _skipAuth, params: _params, ...init } = options;
  return init;
}
import { getHeaders } from "./headers";
import { handleUnauthorized } from "./auth-utils";
import { shouldLogError, shouldLogWarning, parseErrorResponse, createApiError } from "./error-handler";

/**
 * Handle network errors
 */
function handleNetworkError(error: unknown, baseUrl: string, url: string): never {
  const networkError = error as { message?: string; name?: string };
  
  // Check if it's a timeout error
  if (networkError.message?.includes('timeout') || networkError.message?.includes('Request timeout')) {
    console.error('⏱️ [API CLIENT] Request timeout:', networkError.message);
    throw networkError;
  }
  
  console.error('❌ [API CLIENT] Network error during fetch:', networkError);
  
  // Check if it's a connection refused error
  const isConnectionRefused = 
    networkError.message?.includes('Failed to fetch') || 
    networkError.message?.includes('ERR_CONNECTION_REFUSED') ||
    networkError.message?.includes('NetworkError') ||
    networkError.message?.includes('Network request failed');
  
  if (isConnectionRefused) {
    const errorMessage = baseUrl 
      ? `⚠️ API սերվերը հասանելի չէ!\n\n` +
        `Չհաջողվեց միանալ ${baseUrl}\n\n` +
        `Լուծում:\n` +
        `1. Համոզվեք, որ API սերվերը գործարկված է\n` +
        `2. Ստուգեք, որ ${baseUrl.split(':').pop() || 'port'} պորտը զբաղված չէ այլ գործընթացով\n\n` +
        `Հարցման URL: ${url}`
      : `⚠️ API route-ը հասանելի չէ!\n\n` +
        `Չհաջողվեց միանալ Next.js API route-ին: ${url}\n\n` +
        `Լուծում:\n` +
        `1. Համոզվեք, որ Next.js dev server-ը գործարկված է (npm run dev)\n` +
        `2. Ստուգեք, որ API route-ը գոյություն ունի: ${url}\n\n`;
    
    console.error('❌ [API CLIENT]', errorMessage);
    throw new Error(errorMessage);
  }
  
  throw new Error(`Ցանցային սխալ: Չհաջողվեց միանալ API-ին ${url}. ${networkError.message || 'Խնդրում ենք ստուգել, արդյոք Next.js server-ը գործարկված է:'}`);
}

/**
 * Handle error response
 */
async function handleErrorResponse(
  response: Response,
  url: string,
  _baseUrl: string
): Promise<never> {
  const isUnauthorized = response.status === 401;
  const isNotFound = response.status === 404;
  
  // Log 404 as warning (expected situation - resource doesn't exist)
  if (shouldLogWarning(response.status)) {
    console.warn(`⚠️ [API CLIENT] Not Found (404): ${url}`);
  }
  // Log other errors (except 401 which is expected)
  else if (shouldLogError(response.status)) {
    console.error(`❌ [API CLIENT] Error: ${response.status} ${response.statusText}`, {
      url,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });
  }
  
  // Handle 401 Unauthorized - clear token and redirect
  if (isUnauthorized) {
    handleUnauthorized();
  }
  
  const { errorText, errorData } = await parseErrorResponse(response);
  
  // Log error details
  if (isNotFound) {
    console.warn('⚠️ [API CLIENT] Not Found response:', errorData || errorText);
  } else if (!isUnauthorized && shouldLogError(response.status)) {
    console.error('❌ [API CLIENT] Error response:', errorData || errorText);
  }
  
  throw createApiError(response, errorText, errorData);
}

/**
 * GET request
 */
export async function getRequest<T>(
  baseUrl: string,
  endpoint: string,
  options?: RequestOptions,
  retryCount = 0
): Promise<T> {
  const url = buildUrl(baseUrl, endpoint, options?.params);
  const maxRetries = 3;
  const retryDelay = 1000; // 1 second
  const timeout = 30000; // 30 seconds timeout
  
  console.log('🌐 [API CLIENT] GET request:', { url, endpoint, baseUrl });
  
  let response: Response;
  try {
    // Create timeout controller
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      response = await fetch(url, {
        method: 'GET',
        headers: getHeaders(options),
        cache: 'no-store', // Disable caching for server components
        signal: controller.signal,
        ...fetchInitWithoutCustomOptions(options),
      });
      clearTimeout(timeoutId);
    } catch (fetchError: unknown) {
      clearTimeout(timeoutId);
      const error = fetchError as { name?: string };
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout: API server did not respond within ${timeout / 1000} seconds. URL: ${url}`);
      }
      throw fetchError;
    }
    
    // Log response status safely
    try {
      console.log('🌐 [API CLIENT] GET response status:', response.status, response.statusText || '');
    } catch {
      console.warn('⚠️ [API CLIENT] Failed to log response status');
    }
  } catch (networkError: unknown) {
    handleNetworkError(networkError, baseUrl, url);
  }

  if (!response.ok) {
    // Retry on 429 (Too Many Requests) errors
    if (response.status === 429 && retryCount < maxRetries) {
      const delay = retryDelay * (retryCount + 1); // Exponential backoff
      console.warn(`⚠️ [API CLIENT] Rate limited, retrying in ${delay}ms... (attempt ${retryCount + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return getRequest<T>(baseUrl, endpoint, options, retryCount + 1);
    }

    await handleErrorResponse(response, url, baseUrl);
  }

  try {
    if (!response) {
      throw new Error('Response is undefined');
    }

    const contentType = response.headers?.get('content-type');
    console.log('🌐 [API CLIENT] Response content-type:', contentType);
    
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ [API CLIENT] GET Non-JSON response:', {
        contentType,
        status: response.status,
        text: text?.substring(0, 200) || '', // First 200 chars
      });
      throw new Error(`Expected JSON response but got ${contentType}. Status: ${response.status}`);
    }
    
    const jsonData = await response.json();
    console.log('✅ [API CLIENT] GET Response parsed successfully');
    
    if (!jsonData) {
      console.warn('⚠️ [API CLIENT] Response data is null or undefined');
      return null as T;
    }
    
    return jsonData;
  } catch (parseError: unknown) {
    const error = parseError as { message?: string; stack?: string };
    console.error('❌ [API CLIENT] GET JSON parse error:', parseError);
    console.error('❌ [API CLIENT] Parse error stack:', error.stack);
    if (error.message && error.message.includes('Expected JSON')) {
      throw parseError;
    }
    throw new Error(`Failed to parse response as JSON: ${error.message || String(parseError)}`);
  }
}

/**
 * POST request
 */
export async function postRequest<T>(
  baseUrl: string,
  endpoint: string,
  data?: unknown,
  options?: RequestOptions
): Promise<T> {
  try {
    const url = buildUrl(baseUrl, endpoint, options?.params);
    
    console.log('📤 [API CLIENT] POST request:', { url, data: data ? 'provided' : 'none' });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: getHeaders(options),
      body: data ? JSON.stringify(data) : undefined,
      ...fetchInitWithoutCustomOptions(options),
    });

    console.log('📥 [API CLIENT] Response status:', response.status, response.statusText);

    if (!response.ok) {
      const isUnauthorized = response.status === 401;
      
      // Handle 401 Unauthorized - clear token and redirect
      if (isUnauthorized) {
        handleUnauthorized();
      }
      
      await handleErrorResponse(response, url, baseUrl);
    }

    try {
      const jsonData = await response.json();
      console.log('✅ [API CLIENT] Response parsed successfully');
      return jsonData;
    } catch (parseError: unknown) {
      console.error('❌ [API CLIENT] JSON parse error:', parseError);
      throw new Error(`Failed to parse response: ${String(parseError)}`);
    }
  } catch (error: unknown) {
    // Handle network errors, URL construction errors, etc.
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ [API CLIENT] Network error:', error);
      const errorMsg = baseUrl
        ? `Network error: Unable to connect to API. Please check if the API server is running at ${baseUrl}`
        : `Network error: Unable to connect to Next.js API routes. Please check if the Next.js server is running.`;
      throw new Error(errorMsg);
    }
    
    // Re-throw if it's already our custom ApiError
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Re-throw if it's a parse error
    const errorObj = error as { message?: string };
    if (errorObj.message && errorObj.message.includes('Failed to parse')) {
      throw error;
    }
    
    // Otherwise wrap in a generic error
    console.error('❌ [API CLIENT] POST request failed:', error);
    throw new Error(`API request failed: ${errorObj.message || String(error)}`);
  }
}

/**
 * PUT request
 */
export async function putRequest<T>(
  baseUrl: string,
  endpoint: string,
  data?: unknown,
  options?: RequestOptions
): Promise<T> {
  const url = buildUrl(baseUrl, endpoint, options?.params);
  
  console.log('📤 [API CLIENT] PUT request:', { url, endpoint, hasData: !!data });
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: getHeaders(options),
    body: data ? JSON.stringify(data) : undefined,
    ...fetchInitWithoutCustomOptions(options),
  });

  console.log('📥 [API CLIENT] PUT response status:', response.status, response.statusText);

  if (!response.ok) {
    await handleErrorResponse(response, url, baseUrl);
  }

  try {
    const jsonData = await response.json();
    console.log('✅ [API CLIENT] PUT Response parsed successfully');
    return jsonData;
  } catch (parseError: unknown) {
    console.error('❌ [API CLIENT] PUT JSON parse error:', {
      url,
      status: response.status,
      error: parseError,
    });
    throw new Error(`Failed to parse response: ${String(parseError)}`);
  }
}

/**
 * PATCH request
 */
export async function patchRequest<T>(
  baseUrl: string,
  endpoint: string,
  data?: unknown,
  options?: RequestOptions
): Promise<T> {
  const url = buildUrl(baseUrl, endpoint, options?.params);
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: getHeaders(options),
    body: data ? JSON.stringify(data) : undefined,
    ...fetchInitWithoutCustomOptions(options),
  });

  if (!response.ok) {
    await handleErrorResponse(response, url, baseUrl);
  }

  try {
    return await response.json();
  } catch (parseError: unknown) {
    console.error('❌ [API CLIENT] PATCH JSON parse error:', parseError);
    throw new Error(`Failed to parse response: ${String(parseError)}`);
  }
}

/**
 * DELETE request
 */
export async function deleteRequest<T>(
  baseUrl: string,
  endpoint: string,
  options?: RequestOptions
): Promise<T> {
  const url = buildUrl(baseUrl, endpoint, options?.params);
  
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(options),
    ...fetchInitWithoutCustomOptions(options),
  });

  if (!response.ok) {
    await handleErrorResponse(response, url, baseUrl);
  }

  // DELETE requests might not return a body
  try {
    const text = await response.text();
    if (text) {
      return JSON.parse(text);
    }
    return null as T;
  } catch {
    // If there's no body or parse fails, return null for DELETE
    return null as T;
  }
}




