export const AUTH_TOKEN_KEY = 'yb_auth_token';
const AUTH_USER_KEY = 'yb_auth_user';

export interface AuthUser { id: string; name: string; email: string; created_at: string; updated_at: string; }
export interface AuthSession { token: string; user: AuthUser; }

function isBrowser() { return typeof window !== 'undefined'; }
export function getAuthToken() { return isBrowser() ? window.localStorage.getItem(AUTH_TOKEN_KEY) : null; }
export function getStoredUser(): AuthUser | null {
  if (!isBrowser()) return null;
  const value = window.localStorage.getItem(AUTH_USER_KEY);
  if (!value) return null;
  try { return JSON.parse(value) as AuthUser; } catch { return null; }
}
export function setSession(session: AuthSession) {
  if (!isBrowser()) return;
  window.localStorage.setItem(AUTH_TOKEN_KEY, session.token);
  window.localStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.user));
}
export function clearSession() { if (isBrowser()) { window.localStorage.removeItem(AUTH_TOKEN_KEY); window.localStorage.removeItem(AUTH_USER_KEY); } }
function tokenIsExpired(token: string) {
  try { const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number }; return typeof payload.exp === 'number' && payload.exp * 1000 <= Date.now(); } catch { return false; }
}
export function getSession(): AuthSession | null {
  const token = getAuthToken();
  if (!token) return null;
  if (tokenIsExpired(token)) { clearSession(); return null; }
  const user = getStoredUser() || { id: '', name: 'Yellowbird user', email: '', created_at: '', updated_at: '' };
  return { token, user };
}
export function hasAuthToken() { return Boolean(getSession()); }
export function notifyAuthExpired() { clearSession(); if (isBrowser()) window.dispatchEvent(new CustomEvent('yb:auth-expired')); }
