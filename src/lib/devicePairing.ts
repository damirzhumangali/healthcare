import { API_URL } from "./apiBase";
import { authHeaders, type SessionUser } from "./auth";
import { buildPublicAppUrl } from "./publicAppUrl";

export type DevicePairingStatus = "pending" | "approved" | "expired" | "closed";

export type DevicePairingSession = {
  id?: string;
  token: string;
  pairingToken: string;
  deviceId: string;
  patientId?: string | null;
  status: DevicePairingStatus;
  createdAt: string;
  updatedAt?: string | null;
  expiresAt: string;
  claimedAt?: string | null;
  approvedAt?: string | null;
  pollSecret?: string | null;
  sessionToken?: string | null;
  sessionExpiresAt?: string | null;
  pairingUrl?: string | null;
  sessionTtlSeconds?: number | null;
  patient?: SessionUser | null;
  user?: SessionUser | null;
};

export type DeviceMeasurement = {
  id: string;
  userId?: string | null;
  deviceId: string;
  createdAt: string;
  systolic?: number | null;
  diastolic?: number | null;
  tempC?: number | null;
  hr?: number | null;
  spo2?: number | null;
  note?: string;
};

export type DeviceSessionState = {
  session: {
    sessionToken: string;
    deviceId: string;
    patientId: string;
    status: string;
    createdAt: string;
    claimedAt?: string | null;
    sessionExpiresAt?: string | null;
  };
  patient: SessionUser | null;
  measurements: DeviceMeasurement[];
};

const LOCAL_PAIRING_ENABLED =
  !import.meta.env.PROD || import.meta.env.VITE_LOCAL_PAIRING === "1";
const PAIRING_TTL_MS = 2 * 60 * 1000;
const SESSION_TTL_MS = 10 * 60 * 1000;
const STORAGE_PREFIX = "healthassist_device_pairing:";
const DEVICE_INDEX_PREFIX = "healthassist_device_pairing_device:";
const DEVICE_SESSION_PREFIX = "healthassist_device_session:";

function createHttpError(message: string, status: number) {
  const error = new Error(message) as Error & { status?: number };
  error.status = status;
  return error;
}

function pairingEndpoint(path = "") {
  return `${API_URL}/api/device-pairings${path}`;
}

function deviceEndpoint(path = "") {
  return `${API_URL}/api/device${path}`;
}

function storageKey(pairingToken: string) {
  return `${STORAGE_PREFIX}${pairingToken}`;
}

function deviceKey(deviceId: string) {
  return `${DEVICE_INDEX_PREFIX}${deviceId}`;
}

function deviceSessionKey(deviceId: string) {
  return `${DEVICE_SESSION_PREFIX}${deviceId}`;
}

function createSecret(bytes = 18) {
  if (crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, bytes * 2);
  }

  return `${Date.now()}${Math.random().toString(16).slice(2)}`;
}

function sanitizeUser(user?: SessionUser | null): SessionUser | null {
  if (!user) return null;

  return {
    id: user.id ? String(user.id) : undefined,
    email: user.email ? String(user.email) : undefined,
    name: user.name ? String(user.name) : undefined,
    role: user.role ? String(user.role) : undefined,
    picture: user.picture ?? null,
  };
}

function normalizeStatus(value: unknown): DevicePairingStatus {
  if (value === "approved" || value === "expired" || value === "closed") {
    return value;
  }

  return "pending";
}

function normalizePairingUrl(value: unknown, token: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) {
    return buildPublicAppUrl(`/pair?token=${encodeURIComponent(token)}`);
  }

  if (raw.startsWith("http://") || raw.startsWith("https://")) {
    return raw;
  }

  if (raw.startsWith("/")) {
    return buildPublicAppUrl(raw);
  }

  return buildPublicAppUrl(`/pair?token=${encodeURIComponent(token)}`);
}

function normalizeNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function rememberDeviceSessionToken(deviceId: string, sessionToken?: string | null) {
  if (!deviceId) return;

  if (sessionToken) {
    localStorage.setItem(deviceSessionKey(deviceId), sessionToken);
    return;
  }

  localStorage.removeItem(deviceSessionKey(deviceId));
}

export function readStoredDeviceSessionToken(deviceId: string) {
  return localStorage.getItem(deviceSessionKey(deviceId));
}

export function clearStoredDeviceSessionToken(deviceId: string) {
  localStorage.removeItem(deviceSessionKey(deviceId));
}

function coercePairingSession(value: unknown, patientInput?: unknown): DevicePairingSession | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const token = String(input.token ?? input.pairingToken ?? "").trim();
  const deviceId = String(input.deviceId ?? "").trim();

  if (!token || !deviceId) {
    return null;
  }

  const patient = sanitizeUser(
    (patientInput as SessionUser | null | undefined) ??
      (input.patient as SessionUser | null | undefined) ??
      (input.user as SessionUser | null | undefined)
  );

  const session: DevicePairingSession = {
    id: input.id ? String(input.id) : undefined,
    token,
    pairingToken: token,
    deviceId,
    patientId:
      input.patientId == null || input.patientId === ""
        ? null
        : String(input.patientId),
    status: normalizeStatus(input.status),
    createdAt: String(input.createdAt ?? new Date().toISOString()),
    updatedAt: input.updatedAt ? String(input.updatedAt) : null,
    expiresAt: String(input.expiresAt ?? new Date(Date.now() + PAIRING_TTL_MS).toISOString()),
    claimedAt: input.claimedAt ? String(input.claimedAt) : null,
    approvedAt: input.approvedAt
      ? String(input.approvedAt)
      : input.claimedAt
        ? String(input.claimedAt)
        : null,
    pollSecret:
      input.pollSecret == null || input.pollSecret === ""
        ? null
        : String(input.pollSecret),
    sessionToken:
      input.sessionToken == null || input.sessionToken === ""
        ? null
        : String(input.sessionToken),
    sessionExpiresAt: input.sessionExpiresAt ? String(input.sessionExpiresAt) : null,
    pairingUrl: normalizePairingUrl(input.pairingUrl, token),
    sessionTtlSeconds:
      normalizeNumber(input.sessionTtlSeconds) == null
        ? null
        : Number(normalizeNumber(input.sessionTtlSeconds)),
    patient,
    user: patient,
  };

  if (session.sessionToken) {
    rememberDeviceSessionToken(deviceId, session.sessionToken);
  }

  return session;
}

function coercePairingEnvelope(value: unknown) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  return coercePairingSession(input.pairing ?? value, input.patient);
}

function coerceMeasurement(value: unknown): DeviceMeasurement | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const id = String(input.id ?? "").trim();
  const deviceId = String(input.deviceId ?? "").trim();

  if (!id || !deviceId) {
    return null;
  }

  return {
    id,
    userId:
      input.userId == null || input.userId === ""
        ? null
        : String(input.userId),
    deviceId,
    createdAt: String(input.createdAt ?? new Date().toISOString()),
    systolic: normalizeNumber(input.systolic),
    diastolic: normalizeNumber(input.diastolic),
    tempC: normalizeNumber(input.tempC),
    hr: normalizeNumber(input.hr),
    spo2: normalizeNumber(input.spo2),
    note: input.note == null ? "" : String(input.note),
  };
}

function coerceDeviceSessionState(value: unknown, fallbackSessionToken?: string | null) {
  if (!value || typeof value !== "object") {
    return null;
  }

  const input = value as Record<string, unknown>;
  const session = input.session as Record<string, unknown> | undefined;

  if (!session || typeof session !== "object") {
    return null;
  }

  const sessionToken = String(session.sessionToken ?? fallbackSessionToken ?? "").trim();
  const deviceId = String(session.deviceId ?? "").trim();
  const patientId = String(session.patientId ?? "").trim();

  if (!sessionToken || !deviceId || !patientId) {
    return null;
  }

  rememberDeviceSessionToken(deviceId, sessionToken);

  return {
    session: {
      sessionToken,
      deviceId,
      patientId,
      status: String(session.status ?? "approved"),
      createdAt: String(session.createdAt ?? new Date().toISOString()),
      claimedAt: session.claimedAt ? String(session.claimedAt) : null,
      sessionExpiresAt: session.sessionExpiresAt ? String(session.sessionExpiresAt) : null,
    },
    patient: sanitizeUser(input.patient as SessionUser | null | undefined),
    measurements: Array.isArray(input.measurements)
      ? input.measurements
          .map(coerceMeasurement)
          .filter((item): item is DeviceMeasurement => Boolean(item))
      : [],
  } satisfies DeviceSessionState;
}

function persistLocalSession(session: DevicePairingSession) {
  localStorage.setItem(storageKey(session.pairingToken), JSON.stringify(session));
  localStorage.setItem(deviceKey(session.deviceId), session.pairingToken);
  rememberDeviceSessionToken(session.deviceId, session.sessionToken);
  return session;
}

function expireIfNeeded(session: DevicePairingSession) {
  const now = Date.now();

  if (session.status === "pending" && now > Date.parse(session.expiresAt)) {
    return persistLocalSession({
      ...session,
      status: "expired",
    });
  }

  if (
    session.status === "approved" &&
    session.sessionExpiresAt &&
    now > Date.parse(session.sessionExpiresAt)
  ) {
    return persistLocalSession({
      ...session,
      status: "expired",
      sessionToken: null,
    });
  }

  return session;
}

function readLocalSession(pairingToken: string) {
  const raw = localStorage.getItem(storageKey(pairingToken));
  if (!raw) return null;

  try {
    const parsed = coercePairingSession(JSON.parse(raw));
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

  if (existing && existing.status === "pending") {
    return existing;
  }

  const token = createSecret(18);
  const session = persistLocalSession({
    token,
    pairingToken: token,
    deviceId,
    patientId: null,
    status: "pending",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + PAIRING_TTL_MS).toISOString(),
    claimedAt: null,
    approvedAt: null,
    pollSecret: createSecret(24),
    sessionToken: null,
    sessionExpiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    pairingUrl: buildPublicAppUrl(`/pair?token=${encodeURIComponent(token)}`),
    sessionTtlSeconds: Math.floor(SESSION_TTL_MS / 1000),
    patient: null,
    user: null,
  });

  clearStoredDeviceSessionToken(deviceId);
  return session;
}

function approveLocalSession(pairingToken: string, user?: SessionUser | null) {
  const session = readLocalSession(pairingToken);

  if (!session) {
    throw new Error("device pairing session not found");
  }

  if (session.status === "expired" || session.status === "closed") {
    throw new Error("device pairing session is not active");
  }

  if (session.status === "approved") {
    return session;
  }

  return persistLocalSession({
    ...session,
    patientId: user?.id ? String(user.id) : null,
    status: "approved",
    claimedAt: new Date().toISOString(),
    approvedAt: new Date().toISOString(),
    sessionToken: createSecret(30),
    sessionExpiresAt: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    patient: sanitizeUser(user),
    user: sanitizeUser(user),
  });
}

function localDeviceSessionFromPairing(session: DevicePairingSession): DeviceSessionState | null {
  if (session.status !== "approved" || !session.sessionToken || !session.patientId) {
    return null;
  }

  return {
    session: {
      sessionToken: session.sessionToken,
      deviceId: session.deviceId,
      patientId: session.patientId,
      status: session.status,
      createdAt: session.createdAt,
      claimedAt: session.claimedAt ?? session.approvedAt ?? null,
      sessionExpiresAt: session.sessionExpiresAt ?? null,
    },
    patient: session.patient ?? session.user ?? null,
    measurements: [],
  };
}

async function readJson<T>(res: Response): Promise<T> {
  if (res.status === 204) {
    return undefined as T;
  }

  return (await res.json()) as T;
}

async function createRemoteSession(deviceId: string) {
  const res = await fetch(pairingEndpoint(""), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({ deviceId }),
  });

  if (!res.ok) {
    throw createHttpError(`create device pairing failed: ${res.status}`, res.status);
  }

  const parsed = coercePairingEnvelope(await readJson<unknown>(res));
  if (!parsed) {
    throw new Error("invalid device pairing session");
  }

  return parsed;
}

async function fetchRemoteSession(pairingToken: string, pollSecret?: string | null) {
  const headers: Record<string, string> = {
    ...authHeaders(),
  };

  if (pollSecret) {
    headers["x-pairing-secret"] = pollSecret;
  }

  const res = await fetch(pairingEndpoint(`/${encodeURIComponent(pairingToken)}`), {
    headers,
    credentials: "include",
  });

  if (!res.ok) {
    throw createHttpError(`fetch device pairing failed: ${res.status}`, res.status);
  }

  const parsed = coercePairingEnvelope(await readJson<unknown>(res));
  if (!parsed) {
    throw new Error("invalid device pairing session");
  }

  return parsed;
}

async function approveRemoteSession(pairingToken: string) {
  const res = await fetch(pairingEndpoint(`/${encodeURIComponent(pairingToken)}/approve`), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    credentials: "include",
    body: JSON.stringify({}),
  });

  if (!res.ok) {
    throw createHttpError(`approve device pairing failed: ${res.status}`, res.status);
  }

  const parsed = coercePairingEnvelope(await readJson<unknown>(res));
  if (!parsed) {
    throw new Error("invalid device pairing session");
  }

  return parsed;
}

async function fetchRemoteDeviceSession(deviceId: string) {
  const sessionToken = readStoredDeviceSessionToken(deviceId);
  if (!sessionToken) {
    return null;
  }

  const res = await fetch(deviceEndpoint("/session"), {
    headers: {
      ...authHeaders(),
      "x-device-session": sessionToken,
    },
    credentials: "include",
  });

  if (res.status === 401) {
    clearStoredDeviceSessionToken(deviceId);
    return null;
  }

  if (!res.ok) {
    throw createHttpError(`fetch device session failed: ${res.status}`, res.status);
  }

  const parsed = coerceDeviceSessionState(await readJson<unknown>(res), sessionToken);
  if (!parsed) {
    throw new Error("invalid device session");
  }

  return parsed;
}

async function closeRemoteDeviceSession(deviceId: string) {
  const sessionToken = readStoredDeviceSessionToken(deviceId);
  if (!sessionToken) {
    return;
  }

  const res = await fetch(deviceEndpoint("/session"), {
    method: "DELETE",
    headers: {
      ...authHeaders(),
      "x-device-session": sessionToken,
    },
    credentials: "include",
  });

  if (res.status !== 204 && res.status !== 401) {
    throw createHttpError(`close device session failed: ${res.status}`, res.status);
  }

  clearStoredDeviceSessionToken(deviceId);
}

export async function createDevicePairingSession(
  deviceId: string,
  options?: { forceNew?: boolean }
) {
  try {
    if (options?.forceNew) {
      clearStoredDeviceSessionToken(deviceId);
    }

    return await createRemoteSession(deviceId);
  } catch (error) {
    if (!LOCAL_PAIRING_ENABLED) {
      throw error;
    }

    return createLocalSession(deviceId, Boolean(options?.forceNew));
  }
}

export async function fetchDevicePairingSession(
  pairingToken: string,
  options?: { pollSecret?: string | null }
) {
  try {
    return await fetchRemoteSession(pairingToken, options?.pollSecret);
  } catch (error) {
    if (!LOCAL_PAIRING_ENABLED) {
      throw error;
    }

    const session = readLocalSession(pairingToken);
    if (!session) {
      throw error;
    }

    if (options?.pollSecret && session.pollSecret !== options.pollSecret) {
      throw error;
    }

    return session;
  }
}

export async function approveDevicePairingSession(pairingToken: string, user?: SessionUser | null) {
  try {
    return await approveRemoteSession(pairingToken);
  } catch (error) {
    if (!LOCAL_PAIRING_ENABLED) {
      throw error;
    }

    return approveLocalSession(pairingToken, user);
  }
}

export async function fetchDeviceSession(deviceId: string) {
  try {
    return await fetchRemoteDeviceSession(deviceId);
  } catch (error) {
    if (!LOCAL_PAIRING_ENABLED) {
      throw error;
    }

    const sessionToken = readStoredDeviceSessionToken(deviceId);
    if (!sessionToken) {
      return null;
    }

    const pairing = readLocalSessionByDevice(deviceId);
    if (!pairing || pairing.sessionToken !== sessionToken) {
      clearStoredDeviceSessionToken(deviceId);
      return null;
    }

    return localDeviceSessionFromPairing(pairing);
  }
}

export async function closeDeviceSession(deviceId: string) {
  try {
    await closeRemoteDeviceSession(deviceId);
  } catch (error) {
    if (!LOCAL_PAIRING_ENABLED) {
      throw error;
    }

    const pairing = readLocalSessionByDevice(deviceId);
    if (pairing && pairing.status === "approved") {
      persistLocalSession({
        ...pairing,
        status: "closed",
        sessionToken: null,
      });
    }
  } finally {
    clearStoredDeviceSessionToken(deviceId);
  }
}
