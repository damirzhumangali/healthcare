import { API_URL } from "./apiBase";

const TOKEN_KEY = "healthassist_token";
const CURRENT_USER_KEY = "healthassist_current_user";
const IS_PRODUCTION = import.meta.env.PROD;

export type SessionUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  picture?: string | null;
};

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getCurrentUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: SessionUser) {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

export function hasSession() {
  return Boolean(getToken() || getCurrentUser());
}

export function authHeaders() {
  const token = getToken();
  const headers: Record<string, string> = {};

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export function requiresServerSessionValidation() {
  return IS_PRODUCTION;
}

export function setSession(input: {
  token?: string | null;
  user?: SessionUser | null;
  persistToken?: boolean;
}) {
  if (input.persistToken && input.token) {
    setToken(input.token);
  } else {
    clearToken();
  }

  if (input.user) {
    setCurrentUser(input.user);
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function clearStoredSession() {
  clearToken();
  localStorage.removeItem(CURRENT_USER_KEY);
}

export async function fetchSessionUser(): Promise<SessionUser | null> {
  const res = await fetch(`${API_URL}/api/me`, {
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    return null;
  }

  const data = await res.json();
  return (data?.user as SessionUser | undefined) ?? null;
}

export async function syncSessionFromServer(): Promise<SessionUser | null> {
  const user = await fetchSessionUser();

  if (user) {
    setCurrentUser(user);
    return user;
  }

  clearStoredSession();
  return null;
}

export function logout() {
  clearStoredSession();

  void fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
    keepalive: true,
  }).catch(() => {});
}
