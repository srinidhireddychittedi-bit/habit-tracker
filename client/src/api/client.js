/**
 * AURA API Client
 * 
 * Fetch wrapper with:
 * - JWT auto-attach from in-memory token
 * - Automatic 401 → refresh token → retry logic
 * - Clean error handling
 */

let accessToken = null;
let refreshPromise = null;
let onAuthFailure = null;

export function setAccessToken(token) {
  accessToken = token;
}

export function getAccessToken() {
  return accessToken;
}

export function setOnAuthFailure(callback) {
  onAuthFailure = callback;
}

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem('aura_refresh_token');
  if (!refreshToken) {
    throw new ApiError('No refresh token', 401);
  }

  const response = await fetch('/api/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    localStorage.removeItem('aura_refresh_token');
    throw new ApiError('Refresh failed', response.status);
  }

  const data = await response.json();
  accessToken = data.accessToken;

  if (data.refreshToken) {
    localStorage.setItem('aura_refresh_token', data.refreshToken);
  }

  return accessToken;
}

async function request(url, options = {}) {
  const { body, headers: customHeaders, ...rest } = options;

  // ── Proactive refresh ─────────────────────────────────────
  // If we have no access token but there IS a refresh token stored,
  // refresh first so the caller never sees a spurious 401.
  const skipRefreshUrls = ['/api/auth/refresh', '/api/auth/login', '/api/auth/register'];
  const needsProactiveRefresh =
    !accessToken &&
    localStorage.getItem('aura_refresh_token') &&
    !skipRefreshUrls.some(u => url.includes(u));

  if (needsProactiveRefresh) {
    try {
      if (!refreshPromise) refreshPromise = refreshAccessToken();
      await refreshPromise;
      refreshPromise = null;
    } catch {
      refreshPromise = null;
      // Continue — the 401 handler below will catch it if still needed
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const config = { ...rest, headers };

  if (body !== undefined) {
    config.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  let response = await fetch(url, config);

  // Reactive refresh: on 401, attempt token refresh exactly once
  if (response.status === 401 && localStorage.getItem('aura_refresh_token')) {
    try {
      if (!refreshPromise) refreshPromise = refreshAccessToken();
      await refreshPromise;
      refreshPromise = null;

      // Retry original request with new token
      headers['Authorization'] = `Bearer ${accessToken}`;
      response = await fetch(url, { ...config, headers });
    } catch {
      refreshPromise = null;
      if (onAuthFailure) onAuthFailure();
      throw new ApiError('Session expired — please log in again', 401);
    }
  }

  if (!response.ok) {
    let errorData = {};
    try { errorData = await response.json(); } catch { /* not JSON */ }
    throw new ApiError(
      errorData.error || errorData.message || `Request failed (${response.status})`,
      response.status,
      errorData
    );
  }

  if (response.status === 204) return null;

  return response.json();
}


// Convenience methods
export const api = {
  get: (url) => request(url, { method: 'GET' }),
  post: (url, body) => request(url, { method: 'POST', body }),
  put: (url, body) => request(url, { method: 'PUT', body }),
  patch: (url, body) => request(url, { method: 'PATCH', body }),
  delete: (url) => request(url, { method: 'DELETE' }),
};

export default api;
