import React from 'react';

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
};

export async function resilientFetch<T>(
  url: string,
  options: RequestInit = {},
  retryConfig: Partial<RetryConfig> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === config.maxRetries) {
        break;
      }

      // No reintentar en ciertos errores
      if (error instanceof Error && (
        error.message.includes('401') || 
        error.message.includes('403') ||
        error.message.includes('404')
      )) {
        break;
      }

      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt),
        config.maxDelay
      );
      
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  console.error(`All ${config.maxRetries + 1} attempts failed:`, lastError);
  throw lastError || new Error('Unknown error occurred');
}

// Wrapper para fetch con timeout y retry
export async function safeFetch<T>(
  url: string,
  options: RequestInit = {},
  retryConfig?: Partial<RetryConfig>,
  fallbackData?: T
): Promise<T> {
  try {
    return await resilientFetch<T>(url, options, retryConfig);
  } catch (error) {
    console.error('Fetch failed, using fallback:', error);
    if (fallbackData !== undefined) {
      return fallbackData;
    }
    throw error;
  }
}

// Hook personalizado para fetch con reintentos
export function useResilientFetch<T>() {
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  const [data, setData] = React.useState<T | null>(null);

  const execute = React.useCallback(async (
    url: string,
    options: RequestInit = {},
    retryConfig?: Partial<RetryConfig>,
    fallbackData?: T
  ) => {
    setLoading(true);
    setError(null);

    try {
      const result = await safeFetch<T>(url, options, retryConfig, fallbackData);
      setData(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = React.useCallback(() => {
    setLoading(false);
    setError(null);
    setData(null);
  }, []);

  return { execute, loading, error, data, reset };
}