// All server access goes through here, so swapping the backend data source never touches pages.
const TOKEN_KEY = 'tcaps_token';

export const token = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
  constructor(public status: number, message: string, public errors: Record<string, string> = {}) {
    super(message);
  }
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const t = token.get();
  const isForm = init.body instanceof FormData;
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      ...(isForm || !init.body ? {} : { 'Content-Type': 'application/json' }),
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...init.headers,
    },
  });
  if (res.ok) return res;
  const body = await res.json().catch(() => ({}));
  const message = Array.isArray(body.message) ? body.message.join(', ') : body.message ?? res.statusText;
  // Session expired / account disabled: back to the login page.
  if (res.status === 401 && t && !path.startsWith('/auth/login')) {
    token.clear();
    window.location.assign('/login');
  }
  // Forced password change: only the profile page is allowed.
  if (res.status === 403 && message === 'PASSWORD_CHANGE_REQUIRED' && !window.location.pathname.startsWith('/app/profile')) {
    window.location.assign('/app/profile');
  }
  throw new ApiError(res.status, message, body.errors ?? {});
}

export const api = async <T,>(path: string, init: RequestInit = {}): Promise<T> => (await request(path, init)).json();
export const get = <T,>(path: string) => api<T>(path);
export const post = <T,>(path: string, body?: unknown) => api<T>(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body ?? {}) });
export const put = <T,>(path: string, body?: unknown) => api<T>(path, { method: 'PUT', body: JSON.stringify(body ?? {}) });
export const patch = <T,>(path: string, body?: unknown) => api<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) });
export const del = <T,>(path: string) => api<T>(path, { method: 'DELETE' });

// Authenticated file download (CSV exports, uploaded documents/receipts).
export async function download(path: string, fallbackName = 'download') {
  const res = await request(path);
  const cd = res.headers.get('Content-Disposition') ?? '';
  const name = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd)?.[1] ?? fallbackName;
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: decodeURIComponent(name) });
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
