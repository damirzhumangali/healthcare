import { API_URL } from "./apiBase";
import { authHeaders, type SessionUser } from "./auth";

export type DevicePairingStatus = "waiting" | "approved" | "expired";

export type DevicePairingSession = {
  pairingToken: string;
  deviceId: string;
  status: DevicePairingStatus;
  createdAt: string;
  expiresAt: string;
  approvedAt?: string | null;
  user?: SessionUser | null;
};

const LOCAL_PAIRING_ENABLED =
  !import.meta.env.PROD || import.meta.env.VITE_LOCAL_PAIRING === "1";
const PAIRING_TTL_MS = 10 * 60 * 1000;
const STORAGE_PREFIX = "healthassist_device_pairing:";
const DEVICE_INDEX_PREFIX = "healthassist_device_pairing_device:";

function endpoint(path = "") {
  return `${API_URL}/api/device-pairings${path}`;
}

function storageKey(pairingToken: string) {
  return `${STORAGE_PREFIX}${pairingToken}`;
}

function deviceKey(deviceId: string) {
  return `${DEVICE_INDEX_PREFIX}${deviceId}`;
}

function createPairingToken() {
  return crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, "")
    : `${Date.now()}${Math.random().toString(16).slice(2)}`;
}

function sanitizeUser(user?: SessionUser | null): SessionUser | null {
  if (!user) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    picture: user.picture ?? null,
  };
}

function coerceSession(value: unknown): DevicePairingSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const session = value as Partial<DevicePairingSession>;

  if (!session.pairingToken || !session.deviceId || !session.status) {
    return null;
  }

  return {
    pairingToken: String(session.pairingToken),
    deviceId: String(session.deviceId),
    status:
      session.status === "approved" || session.status === "expired"
        ? session.status
        : "waiting",
    createdAt: String(session.createdAt || new Date().toISOString()),
    expiresAt: String(session.expiresAt || new Date(Date.now() + PAIRING_TTL_MS).toISOString()),
    approvedAt: session.approvedAt ? String(session.approvedAt) : null,
    user: sanitizeUser(session.user),
  };
}

function persistLocalSession(session: DevicePairingSession) {
  localStorage.setItem(storageKey(session.pairingToken), JSON.stringify(session));
  localStorage.setItem(deviceKey(session.deviceId), session.pairingToken);
  return session;
}

function expireIfNeeded(session: DevicePairingSession) {
  if (session.status !== "waiting") {
    return session;
  }

  if (Date.now() <= Date.parse(session.expiresAt)) {
    return session;
  }

  return persistLocalSession({
    ...session,
    status: "expired",
  });
}

function readLocalSession(pairingToken: string) {
  const raw = localStorage.getItem(storageKey(pairingToken));
  if (!raw) return null;

  try {
    const parsed = coerceSession(JSON.parse(raw));
    if (!parsed) return null;
    return expireIfNeeded(parsed);
  } catch {
    return null;
  }
}

function readLocalSessionByDevice(deviceId: string) {
  const pairingToken = localStorage.getItem(deviceKey(deviceId));
  if (!pairingToken) {
    return null;
  }

  const session = readLocalSession(pairingToken);
  if (!session) {
    localStorage.removeItem(deviceKey(deviceId));
  }

  return session;
}

function createLocalSession(deviceId: string, forceNew = false) {
  const existing = forceNew ? null : readLocalSessionByDevice(deviceId);

  if (existing && existing.status === "waiting") {
    return existing;
  }

  return persistLocalSession({
    pairingToken: createPairingToken(),
    deviceId,
    status: "waiting",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + PAIRING_TTL_MS).toISOString(),
    approvedAt: null,
    user: null,
  });
}

function approveLocalSession(
  pairingToken: string,
  deviceId: string,
  user?: SessionUser | null
) {
  const session = readLocalSession(pairingToken);

  if (!session || session.deviceId !== deviceId) {
    throw new Error("device pairing session not found");
  }

  return persistLocalSession({
    ...session,
    status: "approved",
    approvedAt: new Date().toISOString(),
    user: sanitizeUser(user),
  });
}

async function readJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

async function createRemoteSession(deviceId: string, forceNew = false) {
  const res = await fetch(endpoint(""), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ deviceId, forceNew }),
  });

  if (!res.ok) {
    throw new Error(`create device pairing failed: ${res.status}`);
  }

  const parsed = coerceSession(await readJson<unknown>(res));
  if (!parsed) {
    throw new Error("invalid device pairing session");
  }

  return parsed;
}

async function fetchRemoteSession(pairingToken: string) {
  const res = await fetch(endpoint(`/${encodeURIComponent(pairingToken)}`), {
    headers: authHeaders(),
    credentials: "include",
  });

  if (!res.ok) {
    throw new Error(`fetch device pairing failed: ${res.status}`);
  }

  const parsed = coerceSession(await readJson<unknown>(res));
  if (!parsed) {
    throw new Error("invalid device pairing session");
  }

  return parsed;
}

async function approveRemoteSession(
  pairingToken: string,
  deviceId: string,
  user?: SessionUser | null
) {
  const res = await fetch(endpoint(`/${encodeURIComponent(pairingToken)}/approve`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ deviceId, user: sanitizeUser(user) }),
  });

  if (!res.ok) {
    throw new Error(`approve device pairing failed: ${res.status}`);
  }

  const parsed = coerceSession(await readJson<unknown>(res));
  if (!parsed) {
    throw new Error("invalid device pairing session");
  }

  return parsed;
}

export async function createDevicePairingSession(
  deviceId: string,
  options?: { forceNew?: boolean }
) {
  try {
    return await createRemoteSession(deviceId, Boolean(options?.forceNew));
  } catch (error) {
    if (!LOCAL_PAIRING_ENABLED) {
      throw error;
    }

    return createLocalSession(deviceId, Boolean(options?.forceNew));
  }
}

export async function fetchDevicePairingSession(pairingToken: string) {
  try {
    return await fetchRemoteSession(pairingToken);
  } catch (error) {
    if (!LOCAL_PAIRING_ENABLED) {
      throw error;
    }

    const session = readLocalSession(pairingToken);
    if (!session) {
      throw error;
    }

    return session;
  }
}

export async function approveDevicePairingSession(
  pairingToken: string,
  deviceId: string,
  user?: SessionUser | null
) {
  try {
    return await approveRemoteSession(pairingToken, deviceId, user);
  } catch (error) {
    if (!LOCAL_PAIRING_ENABLED) {
      throw error;
    }

    return approveLocalSession(pairingToken, deviceId, user);
  }
}
