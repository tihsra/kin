let csrf: string | null = null;
export function setCsrf(value: string | null) {
  csrf = value;
}
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set('Content-Type', 'application/json');
  if (csrf) headers.set('X-CSRF-Token', csrf);
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      ...options,
      headers,
      cache: 'no-store',
      credentials: 'same-origin',
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError('We couldn’t reach the service. Check your connection and try again.', 0);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok)
    throw new ApiError(
      body?.error || 'The service is unavailable. Please try again shortly.',
      response.status,
    );
  return body;
}
export const post = <T = { message: string }>(path: string, data: unknown = {}) =>
  api<T>(path, { method: 'POST', body: JSON.stringify(data) });
