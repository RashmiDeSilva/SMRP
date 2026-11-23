// Session persistence utility for web and mobile
export const saveUserSession = (user) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('nestora_session_user', JSON.stringify(user));
    }
  } catch (e) {
    console.log('Error saving session:', e);
  }
};

export const getUserSession = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem('nestora_session_user');
      return data ? JSON.parse(data) : null;
    }
  } catch (e) {
    console.log('Error getting session:', e);
  }
  return null;
};

export const clearUserSession = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('nestora_session_user');
    }
  } catch (e) {
    console.log('Error clearing session:', e);
  }
};

const getBookingPreferencesKey = (user) => {
  const identity = user?.email || user?._id || user?.id;
  if (!identity) return null;
  return `nestora_booking_view_${String(identity).trim().toLowerCase()}`;
};

export const getBookingViewPreferences = (user) => {
  const key = getBookingPreferencesKey(user);
  if (!key || typeof window === 'undefined' || !window.localStorage) {
    return { pinnedIds: [], clearedIds: [] };
  }
  try {
    const saved = window.localStorage.getItem(key);
    const preferences = saved ? JSON.parse(saved) : {};
    return {
      pinnedIds: Array.isArray(preferences.pinnedIds) ? preferences.pinnedIds.map(String) : [],
      clearedIds: Array.isArray(preferences.clearedIds) ? preferences.clearedIds.map(String) : [],
    };
  } catch (e) {
    console.log('Error reading booking view preferences:', e);
    return { pinnedIds: [], clearedIds: [] };
  }
};

export const saveBookingViewPreferences = (user, updates) => {
  const key = getBookingPreferencesKey(user);
  if (!key || typeof window === 'undefined' || !window.localStorage) return;
  try {
    const current = getBookingViewPreferences(user);
    window.localStorage.setItem(key, JSON.stringify({ ...current, ...updates }));
  } catch (e) {
    console.log('Error saving booking view preferences:', e);
  }
};

export const saveAppSettings = (settings) => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('nestora_app_settings', JSON.stringify(settings));
    }
    if (typeof document !== 'undefined') {
      if (document.body) {
        if (settings?.theme === 'Dark') {
          document.body.style.backgroundColor = '#0B0F19';
          document.body.classList.add('dark-theme');
        } else {
          document.body.style.backgroundColor = '#F8FAFC';
          document.body.classList.remove('dark-theme');
        }
      }
      if (document.documentElement) {
        const root = document.documentElement;
        if (settings?.fontSize === 'Small') {
          root.style.fontSize = '20px';
          if (document.body) document.body.style.zoom = '1.1';
        } else if (settings?.fontSize === 'Large') {
          root.style.fontSize = '24px';
          if (document.body) document.body.style.zoom = '1.22';
        } else {
          root.style.fontSize = '22px';
          if (document.body) document.body.style.zoom = '1.16';
        }
      }
    }
  } catch (e) {
    console.log('Error saving app settings:', e);
  }
};

export const getAppSettings = () => {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const data = window.localStorage.getItem('nestora_app_settings');
      const settings = data ? JSON.parse(data) : { theme: 'Light', fontSize: 'Medium' };
      if (typeof document !== 'undefined') {
        if (document.body) {
          if (settings?.theme === 'Dark') {
            document.body.style.backgroundColor = '#0B0F19';
            document.body.classList.add('dark-theme');
          } else {
            document.body.style.backgroundColor = '#F8FAFC';
            document.body.classList.remove('dark-theme');
          }
        }
        if (document.documentElement) {
          const root = document.documentElement;
          if (settings?.fontSize === 'Small') {
            root.style.fontSize = '20px';
            if (document.body) document.body.style.zoom = '1.1';
          } else if (settings?.fontSize === 'Large') {
            root.style.fontSize = '24px';
            if (document.body) document.body.style.zoom = '1.22';
          } else {
            root.style.fontSize = '22px';
            if (document.body) document.body.style.zoom = '1.16';
          }
        }
      }
      return settings;
    }
  } catch (e) {
    console.log('Error getting app settings:', e);
  }
  return { theme: 'Light', fontSize: 'Medium' };
};

