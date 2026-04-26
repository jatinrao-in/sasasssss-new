import { onAuthStateChanged } from 'firebase/auth';
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
  (import.meta.env.DEV 
    ? 'http://localhost:3000'
    : 'https://sasasssss.vercel.app')
);

const buildUrl = (endpoint) => {
  const normalizedEndpoint = normalizeEndpoint(endpoint);

  return API_BASE_URL
    ? `${API_BASE_URL}${normalizedEndpoint}`
    : normalizedEndpoint;
};

const waitForAuthenticatedUser = async () => {
  if (auth.currentUser) {
    return auth.currentUser;
  }

  if (typeof auth.authStateReady === 'function') {
    await auth.authStateReady();

    if (auth.currentUser) {
      return auth.currentUser;
    }
  }

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      unsubscribe();
      reject(new Error('Not authenticated'));
    }, 5000);

    const unsubscribe = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          return;
        }

        clearTimeout(timeoutId);
        unsubscribe();
        resolve(user);
      },
      (error) => {
        clearTimeout(timeoutId);
        unsubscribe();
        reject(error);
      },
    );
  });
};

const getAuthToken = async ({ forceRefresh = false } = {}) => {
  const user = await waitForAuthenticatedUser();

  if (!user) {
    throw new Error('Not authenticated');
  }

  return user.getIdToken(forceRefresh);
};

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json();
  }

  const text = await response.text();
  return text ? { message: text } : null;
};

const authorizedPost = async (endpoint, data = {}, options = {}) => {
  const token = await getAuthToken(options);

  return fetch(buildUrl(endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
};

export const securePost = async (endpoint, data = {}) => {
  let response = await authorizedPost(endpoint, data);

  if (response.status === 401) {
    response = await authorizedPost(endpoint, data, { forceRefresh: true });
  }

  const payload = await parseResponse(response);

  if (!response.ok) {
    throw new Error(payload?.error || `API error: ${response.status}`);
  }

  return payload;
};
