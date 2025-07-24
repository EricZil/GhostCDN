import * as Sentry from '@sentry/nextjs';

/**
 * Utility functions for Sentry error tracking and performance monitoring
 */

/**
 * Capture an exception with additional context
 */
export function captureException(error: Error, context?: Record<string, unknown>) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value as Sentry.Context);
      });
      Sentry.captureException(error);
    });
  } else {
    Sentry.captureException(error);
  }
}

/**
 * Capture a message with optional level and context
 */
export function captureMessage(
  message: string,
  level: 'debug' | 'info' | 'warning' | 'error' | 'fatal' = 'info',
  context?: Record<string, unknown>
) {
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, value]) => {
        scope.setContext(key, value as Sentry.Context);
      });
      Sentry.captureMessage(message, level);
    });
  } else {
    Sentry.captureMessage(message, level);
  }
}

/**
 * Set user information for error tracking
 */
export function setUser(user: {
  id?: string;
  email?: string;
  username?: string;
  [key: string]: unknown;
}) {
  Sentry.setUser(user);
}

/**
 * Add a breadcrumb for debugging
 */
export function addBreadcrumb(message: string, category?: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({
    message,
    category: category || 'custom',
    level: 'info',
    data,
  });
}

/**
 * Set a tag for filtering errors
 */
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

/**
 * Start a performance span (replaces deprecated startTransaction)
 */
export function startSpan<T>(name: string, op: string = 'navigation', callback: () => T): T {
  return Sentry.startSpan({ name, op }, callback);
}

/**
 * Wrap a function with performance monitoring
 */
export function withPerformanceMonitoring<T extends (...args: unknown[]) => unknown>(
  fn: T,
  name: string,
  op: string = 'function'
): T {
  return ((...args: unknown[]) => {
    return startSpan(name, op, () => {
      try {
        const result = fn(...args);
        if (result instanceof Promise) {
          return result.catch((error) => {
            Sentry.captureException(error);
            throw error;
          });
        }
        return result;
      } catch (error) {
        Sentry.captureException(error);
        throw error;
      }
    });
  }) as T;
}

/**
 * Start an inactive span for manual control
 */
export function startInactiveSpan(name: string, op: string = 'navigation') {
  return Sentry.startInactiveSpan({ name, op });
}

/**
 * Wrap an async function with performance monitoring
 */
export async function withPerformance<T>(
  name: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  return await Sentry.startSpan(
    {
      name,
      op: operation,
    },
    fn
  );
}

/**
 * Example usage for API calls
 */
export async function trackApiCall<T>(
  endpoint: string,
  method: string,
  fn: () => Promise<T>
): Promise<T> {
  return await withPerformance(`API ${method}`, `http.${method.toLowerCase()}`, async () => {
    addBreadcrumb(`API call to ${endpoint}`, 'http', { endpoint, method });
    try {
      const result = await fn();
      addBreadcrumb(`API call successful`, 'http', { endpoint, method, status: 'success' });
      return result;
    } catch (error) {
      addBreadcrumb(`API call failed`, 'http', { endpoint, method, status: 'error' });
      captureException(error as Error, { endpoint, method });
      throw error;
    }
  });
}