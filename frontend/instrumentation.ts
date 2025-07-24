export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

export async function onRequestError(err: unknown, request: { url?: string; method?: string }) {
  const { captureRequestError } = await import('@sentry/nextjs');
  
  const requestInfo = {
    path: request.url || '',
    method: request.method || 'GET',
    headers: {},
    url: request.url,
  };
  
  captureRequestError(err, requestInfo, {
    routerKind: 'App Router',
    routePath: requestInfo.url || 'unknown',
    routeType: 'middleware'
  });
}