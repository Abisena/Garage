// Simple storage tanpa enkripsi untuk user data

export const saveUser = (userData) => {
  try {
    localStorage.setItem('user', JSON.stringify(userData));
    console.log('✅ User saved to localStorage');
    return true;
  } catch (error) {
    console.error('❌ Failed to save user:', error);
    return false;
  }
};

export const getUser = () => {
  try {
    const data = localStorage.getItem('user');
    if (data) {
      console.log('✅ User loaded from localStorage');
      return JSON.parse(data);
    }
    console.log('ℹ️ No user found in localStorage');
    return null;
  } catch (error) {
    console.error('❌ Failed to get user:', error);
    return null;
  }
};

export const clearUser = () => {
  try {
    localStorage.removeItem('user');
    console.log('✅ User cleared from localStorage');
  } catch (error) {
    console.error('❌ Failed to clear user:', error);
  }
};

// Alias untuk compatibility dengan kode yang ada
export const persistCurrentUser = saveUser;
export const loadStoredUser = getUser;
export const clearStoredUser = clearUser;
export const restoreCurrentUser = getUser; // Tambahan ini!
