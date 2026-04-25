import { auth } from './firebase';

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  ''
).trim();

const buildUrl = (endpoint) => {
  if (!endpoint.startsWith('/')) {
    throw new Error(`API endpoint must start with "/": ${endpoint}`);
  }

  return API_BASE_URL
    ? `${API_BASE_URL.replace(/\/$/, '')}${endpoint}`
    : endpoint;
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
