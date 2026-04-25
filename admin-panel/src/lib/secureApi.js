import { auth } from './firebase';

function normalizeApiBaseUrl(value) {
  const trimmed = String(value || '').trim();
  const sanitized = trimmed.replace(/\\r\\n|\\n|\\r/g, '');

  if (!sanitized) {
    return '';
  }

  try {
    const url = new URL(sanitized);
    const normalizedPath = url.pathname
      .replace(/\/+$/, '')
      .replace(/\/r$/, '');

    return `${url.origin}${normalizedPath}`.replace(/\/$/, '');
  } catch {
    return sanitized
      .replace(/\/+$/, '')
      .replace(/\/r$/, '');
  }
}

function normalizeEndpoint(endpoint) {
  const trimmed = String(endpoint || '').trim();

  if (!trimmed.startsWith('/')) {
    throw new Error(`API endpoint must start with "/": ${endpoint}`);
  }

  return trimmed.replace(/^\/r(?=\/|$)/, '');
}

const API_BASE_URL = normalizeApiBaseUrl(
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  '',
);

const buildUrl = (endpoint) => {
  const normalizedEndpoint = normalizeEndpoint(endpoint);

  return API_BASE_URL
    ? `${API_BASE_URL}${normalizedEndpoint}`
    : normalizedEndpoint;
};

const getAuthToken = async () => {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('Not authenticated');
  }

  return user.getIdToken();
};

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
};

export const securePost = async (endpoint, data = {}) => {
  const token = await getAuthToken();
  const response = await fetch(buildUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(payload?.error || `API error: ${response.status}`);
  }

  return payload;
};
