import { useAuthStore } from '../stores/authStore';

export class ApiError extends Error {
  constructor(
    public code: string,
    public title: string,
    public status: number,
    public data?: unknown,
  ) {
    super(title);
  }
}

async function request<T>(
  path: string,
  options: Parameters<typeof fetch>[1] = {}
): Promise<T> {
  const { token, serverUrl } = useAuthStore.getState();
  // Wenn serverUrl leer ist, werden relative URLs genutzt → Vite-Proxy leitet weiter
  const url = serverUrl ? `${serverUrl.replace(/\/$/, '')}${path}` : path;

  const isFormData = options.body instanceof FormData;

  const headers: Record<string, string> = {
    // Content-Type NICHT setzen wenn FormData (Browser setzt es mit Boundary)
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, { ...options, headers, credentials: 'include' });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    window.location.href = '/login';
    throw new ApiError('UNAUTHORIZED', 'Nicht autorisiert', 401);
  }

  if (!response.ok) {
    let errorBody: { code?: string; title?: string } = {};
    try {
      errorBody = await response.json();
    } catch { /* body ist nicht JSON-parseable */ }
    throw new ApiError(
      errorBody.code ?? 'UNKNOWN',
      errorBody.title ?? `Fehler ${response.status}`,
      response.status,
      errorBody,
    );
  }

  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T;
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return response.json();
  }

  return response.blob() as unknown as T;
}

export function get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
  const query = params
    ? '?' + Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
    : '';
  return request<T>(path + query);
}

export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function postForm<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    body: formData,
  });
}

export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function del<T>(path: string, body?: unknown): Promise<T> {
  return request<T>(path, {
    method: 'DELETE',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

export function putForm<T>(path: string, formData: FormData): Promise<T> {
  return request<T>(path, {
    method: 'PUT',
    body: formData,
  });
}

export function downloadBlob(path: string): Promise<Blob> {
  return get<Blob>(path);
}
