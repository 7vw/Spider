export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/** Design-preview builds (VITE_PREVIEW=1) run without the system agent, e.g. as a hosted page. */
export const PREVIEW = import.meta.env.VITE_PREVIEW === '1';

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  if (PREVIEW) throw new ApiError(0, 'agent-unreachable');
  let res: Response;
  try {
    res = await fetch(path, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new ApiError(0, 'agent-unreachable');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, (data as { error?: string }).error ?? res.statusText, data);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body ?? {}),
};

export const mediaUrl = (id: string) => `/api/media/stream/${id}`;
export const thumbUrl = (id: string) => `/api/media/thumb/${id}`;
