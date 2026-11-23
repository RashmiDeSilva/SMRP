import { API_URLS, API_URLS_DEV } from './apiConfig';

const BACKEND_URLS = [API_URLS.auth, API_URLS_DEV.auth];

/**
 * Creates an account through the authenticated backend service.
 */
export async function signUpApi(userData) {
  let lastError = 'Could not reach the account service. Please try again.';
  for (const url of BACKEND_URLS) {
    try {
      console.log(`Attempting Signup on: ${url}/signup`);
      const response = await fetch(`${url}/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });
      
      const data = await response.json();
      if (response.ok) {
        return { success: true, user: data.user, token: data.token, source: 'database' };
      } else {
        return { success: false, message: data.message || 'Signup failed on server' };
      }
    } catch (error) {
      lastError = 'Could not reach the account service. Please try again.';
      console.log(`Backend server at ${url} not available, trying next...`);
    }
  }

  return { success: false, message: lastError };
}

/**
 * Authenticates against the backend and returns a signed session token.
 */
export async function loginApi(email, password) {
  for (const url of BACKEND_URLS) {
    try {
      console.log(`Attempting Login on: ${url}/login`);
      const response = await fetch(`${url}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (response.ok) {
        return { success: true, user: data.user, token: data.token, source: 'database' };
      } else {
        return { success: false, message: data.message || 'Invalid credentials' };
      }
    } catch (error) {
      console.log(`Backend server at ${url} not available, trying next...`);
    }
  }

  return { success: false, message: 'Could not reach the account service. Please try again.' };
}

/**
 * Persists saving/toggling a boarding ID in the database
 */
export async function toggleSavedBoardingApi(boardingId, token) {
  for (const url of BACKEND_URLS) {
    try {
      console.log(`Attempting to toggle saved boarding on: ${url}/saved`);
      const response = await fetch(`${url}/saved`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ boardingId }),
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, savedBoardingIds: data.savedBoardingIds };
      } else {
        const err = await response.json().catch(() => ({}));
        console.log(`toggleSavedBoardingApi error ${response.status}:`, err.message);
        return { success: false, message: err.message };
      }
    } catch (error) {
      console.log(`Backend server at ${url} not available for saved toggle:`, error.message);
    }
  }
  return { success: false };
}

/**
 * Fetches the persistent saved boarding IDs list
 */
export async function getSavedBoardingsApi(token) {
  for (const url of BACKEND_URLS) {
    try {
      console.log(`Attempting to fetch saved boardings from: ${url}/saved`);
      const response = await fetch(`${url}/saved`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });

      if (response.ok) {
        const data = await response.json();
        return { success: true, savedBoardingIds: data.savedBoardingIds };
      } else {
        const err = await response.json().catch(() => ({}));
        console.log(`getSavedBoardingsApi error ${response.status}:`, err.message);
        return { success: false, message: err.message };
      }
    } catch (error) {
      console.log(`Backend server at ${url} not available for fetching saveds:`, error.message);
    }
  }
  return { success: false };
}

/**
 * Updates profile details, contact, and preferences
 */
export async function updateProfileApi(profileData, token) {
  for (const url of BACKEND_URLS) {
    try {
      console.log(`Attempting updateProfile on: ${url}/profile`);
      const response = await fetch(`${url}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(profileData),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, user: data.user };
      } else {
        return { success: false, message: data.message || 'Profile update failed' };
      }
    } catch (error) {
      console.log(`Backend server at ${url} not available for profile update:`, error.message);
    }
  }

  return { success: false, message: 'Could not reach the account service. Please try again.' };
}
