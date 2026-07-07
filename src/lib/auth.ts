import { API_URL } from "./apiBase";

const TOKEN_KEY = "healthassist_token";
const CURRENT_USER_KEY = "healthassist_current_user";
const IS_PRODUCTION = import.meta.env.PROD;
export const SESSION_USER_UPDATED_EVENT = "healthassist:session-user-updated";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export type SessionUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
  picture?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
  avatar_backend_ready?: boolean;
};

function normalizeSessionUser(user: SessionUser | null | undefined): SessionUser | null {
  if (!user) return null;

  const avatar = user.avatar_url ?? user.avatarUrl ?? null;
  return {
    ...user,
    avatar_url: avatar,
    avatarUrl: avatar,
    avatar_backend_ready: user.avatar_backend_ready === true,
  };
}

export function getToken(): string | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (!canUseLocalStorage()) {
    return;
  }

  localStorage.removeItem(TOKEN_KEY);
}

export function getCurrentUser(): SessionUser | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY);
    return raw ? normalizeSessionUser(JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function setCurrentUser(user: SessionUser) {
  if (!canUseLocalStorage()) {
    return;
  }

  const normalized = normalizeSessionUser(user) ?? user;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(normalized));
  window.dispatchEvent(new CustomEvent(SESSION_USER_UPDATED_EVENT, { detail: normalized }));
}

export function updateCurrentUser(patch: Partial<SessionUser>) {
  const current = getCurrentUser() ?? {};
  const next = { ...current, ...patch } satisfies SessionUser;
  setCurrentUser(next);
  return next;
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
  } else if (canUseLocalStorage()) {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

export function clearStoredSession() {
  clearToken();
  if (canUseLocalStorage()) {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
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
  const rawUser = (data?.user as SessionUser | undefined) ?? null;
  if (!rawUser) return null;

  const avatarBackendReady =
    Object.prototype.hasOwnProperty.call(rawUser, "avatar_url") ||
    Object.prototype.hasOwnProperty.call(rawUser, "avatarUrl");

  return normalizeSessionUser({
    ...rawUser,
    avatar_backend_ready: avatarBackendReady,
  });
}

export async function saveProfileAvatar(input: {
  avatarUrl?: string | null;
  remove?: boolean;
}): Promise<SessionUser> {
  const current = getCurrentUser();
  if (current?.avatar_backend_ready !== true) {
    throw new Error("avatar_route_missing");
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/me/avatar`, {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify(
        input.remove
          ? { remove: true }
          : {
              avatar_url: input.avatarUrl ?? null,
            },
      ),
    });
  } catch {
    throw new Error("avatar_network_failed");
  }

  if (!res.ok) {
    let errorCode = res.status === 404 ? "avatar_route_missing" : "avatar_save_failed";
    try {
      const data = await res.json();
      errorCode = String(data?.error || errorCode);
    } catch {
      // Keep generic code when the server did not return JSON.
    }
    throw new Error(errorCode);
  }

  const data = await res.json();
  const user = normalizeSessionUser((data?.user as SessionUser | undefined) ?? null);

  if (!user) {
    throw new Error("avatar_save_failed");
  }

  setCurrentUser(user);
  return user;
}

export async function saveProfileDetails(input: {
  name: string;
}): Promise<SessionUser> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/me/profile`, {
      method: "PUT",
      headers: {
        ...authHeaders(),
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        name: input.name,
      }),
    });
  } catch {
    throw new Error("profile_network_failed");
  }

  if (!res.ok) {
    let errorCode = "profile_save_failed";
    try {
      const data = await res.json();
      errorCode = String(data?.error || errorCode);
    } catch {
      // Keep generic code when the server did not return JSON.
    }
    throw new Error(errorCode);
  }

  const data = await res.json();
  const user = normalizeSessionUser((data?.user as SessionUser | undefined) ?? null);

  if (!user) {
    throw new Error("profile_save_failed");
  }

  setCurrentUser(user);
  return user;
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
