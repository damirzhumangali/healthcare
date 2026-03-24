const TOKEN_KEY = "healthassist_token";
const CURRENT_USER_KEY = "healthassist_current_user";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(CURRENT_USER_KEY);
}
