import defaultPatientAvatar from "../assets/avatars/default-patient.webp";

type AvatarLike = {
  id?: string | null;
  email?: string | null;
  name?: string | null;
  role?: string | null;
  picture?: string | null;
  avatar_url?: string | null;
  avatarUrl?: string | null;
};

export const DEFAULT_DOCTOR_AVATAR = "/images/doctor-default-avatar.webp";
export const DEFAULT_PATIENT_AVATAR = defaultPatientAvatar;
export const DEFAULT_DAMIR_AVATAR = "/images/damir-profile-avatar.webp";
const AVATAR_STORE_KEY = "healthassist_avatar_urls_v1";

function normalizeIdentity(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function resolvePinnedAvatarUrl(user?: AvatarLike | null) {
  if (user?.role === "patient") {
    return null;
  }
  const normalizedName = normalizeIdentity(user?.name);
  const normalizedEmail = normalizeIdentity(user?.email);

  if (
    normalizedName === "damir zhumangali" ||
    normalizedEmail === "damir zhumangali" ||
    normalizedEmail.includes("damir")
  ) {
    return DEFAULT_DAMIR_AVATAR;
  }

  return null;
}

function isPatientFallbackUrl(value?: string | null) {
  const normalized = String(value || "").trim().toLowerCase();
  return Boolean(normalized) && normalized.includes("default-patient");
}

export function getInitials(name?: string | null) {
  const trimmed = (name || "").trim();
  if (!trimmed) return "??";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function resolveAvatarUrl(user?: AvatarLike | null, options?: { doctorFallback?: boolean; patientFallback?: boolean }) {
  if (!user) {
    return null;
  }

  const explicit = user.avatar_url || user.avatarUrl;
  if (explicit && (user.role === "patient" || !isPatientFallbackUrl(explicit))) return explicit;
  const stored = readStoredAvatar(user);
  if (stored && (user.role === "patient" || !isPatientFallbackUrl(stored))) return stored;
  const pinned = resolvePinnedAvatarUrl(user);
  if (pinned) return pinned;
  if (user.picture && (user.role === "patient" || !isPatientFallbackUrl(user.picture))) return user.picture;
  if (options?.patientFallback || user.role === "patient") return DEFAULT_PATIENT_AVATAR;
  return null;
}

export function isAcceptedAvatarFile(file: File) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) {
    return {
      ok: false as const,
      error: "Разрешены только JPG, PNG или WEBP.",
    };
  }
  if (file.size > 5 * 1024 * 1024) {
    return {
      ok: false as const,
      error: "Размер изображения должен быть не больше 5 МБ.",
    };
  }
  return { ok: true as const };
}

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAvatarStore() {
  if (!canUseLocalStorage()) return {};
  try {
    const raw = localStorage.getItem(AVATAR_STORE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeAvatarStore(value: Record<string, string>) {
  if (!canUseLocalStorage()) return;
  localStorage.setItem(AVATAR_STORE_KEY, JSON.stringify(value));
}

function avatarKeys(user?: AvatarLike | null) {
  return [user?.id, user?.email]
    .map((item) => String(item || "").trim().toLowerCase())
    .filter(Boolean);
}

export function readStoredAvatar(user?: AvatarLike | null) {
  const store = readAvatarStore();
  for (const key of avatarKeys(user)) {
    if (store[key]) return store[key];
  }
  return null;
}

export function persistAvatar(user: AvatarLike | null | undefined, url: string | null) {
  const keys = avatarKeys(user);
  if (keys.length === 0) return;
  const store = readAvatarStore();
  for (const key of keys) {
    if (url) {
      store[key] = url;
    } else {
      delete store[key];
    }
  }
  writeAvatarStore(store);
}
