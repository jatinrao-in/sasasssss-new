import { auth } from './firebase';

// Always call the Vercel API directly — CORS is handled server-side
const API_BASE = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') || 'https://sasasssss-one.vercel.app';

const getAuthToken = async () => {
  return new Promise((resolve, reject) => {
    // Wait for auth to be ready
    const unsubscribe = auth
      .onAuthStateChanged(async (user) => {
        unsubscribe();
        if (!user) {
          reject(new Error('Not authenticated'));
          return;
        }
        try {
          const token = 
            await user.getIdToken(true);
          resolve(token);
        } catch (err) {
          reject(err);
        }
      });
  });
};

export const securePost = async (
  endpoint, data
) => {
  try {
    // Remove any leading slash issues
    const cleanEndpoint = endpoint
      .startsWith('/') 
      ? endpoint 
      : `/${endpoint}`;
    
    // Build full URL
    const url = 
      `${API_BASE}${cleanEndpoint}`;
    
    (function(){})('API call to:', url);
    
    // Get auth token
    const token = await getAuthToken();
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response
        .json().catch(() => ({}));
      throw new Error(
        errorData.error || 
        `API error: ${response.status}`
      );
    }
    
    return await response.json();
    
  } catch (error) {
    // Better error messages
    if (error.message.includes(
      'ERR_CONNECTION_REFUSED')) {
      throw new Error(
        'Cannot connect to API server. ' +
        'Check VITE_API_BASE_URL setting.'
      );
    }
    if (error.message.includes('Failed to fetch')) {
      throw new Error(
        'Network error. Check internet ' +
        'connection and API URL.'
      );
    }
    throw error;
  }
};

export const secureGet = async (endpoint) => {
  try {
    const cleanEndpoint = endpoint
      .startsWith('/') 
      ? endpoint 
      : `/${endpoint}`;
    
    const url = `${API_BASE}${cleanEndpoint}`;
    const token = await getAuthToken();
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (!response.ok) {
      throw new Error(
        `API error: ${response.status}`
      );
    }
    
    return await response.json();
    
  } catch (error) {
    throw error;
  }
};
