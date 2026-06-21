const CREDENTIALS = { email: 'gamer', password: '1a2a3a' };
const AUTH_KEY = 'gp_auth_user';
const REMEMBER_KEY = 'gp_remember';

export function login(email, password, remember = false) {
  if (email === CREDENTIALS.email && password === CREDENTIALS.password) {
    const user = {
      id: 'user_1',
      email,
      name: 'GameMaster',
      avatar: null,
      joinedAt: Date.now(),
      xp: 0,
      level: 1,
    };
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(user));
    if (remember) localStorage.setItem(REMEMBER_KEY, JSON.stringify(user));
    return { success: true, user };
  }
  return { success: false, error: 'Invalid email or password.' };
}

export function logout() {
  sessionStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(REMEMBER_KEY);
}

export function getAuthUser() {
  if (typeof window === 'undefined') return null;
  const s = sessionStorage.getItem(AUTH_KEY);
  if (s) return JSON.parse(s);
  const r = localStorage.getItem(REMEMBER_KEY);
  if (r) {
    const user = JSON.parse(r);
    sessionStorage.setItem(AUTH_KEY, r);
    return user;
  }
  return null;
}

export function updateUser(updates) {
  const user = getAuthUser();
  if (!user) return null;
  const updated = { ...user, ...updates };
  sessionStorage.setItem(AUTH_KEY, JSON.stringify(updated));
  const r = localStorage.getItem(REMEMBER_KEY);
  if (r) localStorage.setItem(REMEMBER_KEY, JSON.stringify(updated));
  return updated;
}
