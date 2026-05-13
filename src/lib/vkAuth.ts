import { API_URL } from "./apiBase";

const VK_APP_ID = Number(import.meta.env.VITE_VK_APP_ID || 0);
const VK_SCOPE = (import.meta.env.VITE_VK_SCOPE as string | undefined)?.trim() || "email";

const STATE_KEY = "healthassist_vk_state";
const CODE_VERIFIER_KEY = "healthassist_vk_code_verifier";

type Locale = "ru" | "kk" | "en";
type Theme = "dark" | "light";

function getVkRedirectUrl() {
  const configured = (import.meta.env.VITE_VK_REDIRECT_URL as string | undefined)?.trim();
  if (configured) return configured;
  if (typeof window === "undefined") return "http://localhost:4173/auth/vk/callback";
  return `${window.location.origin}/auth/vk/callback`;
}

function randomToken(size = 48) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, size);
}

function saveFlowState(state: string, codeVerifier: string) {
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(CODE_VERIFIER_KEY, codeVerifier);
}

function readFlowState() {
  return {
    state: sessionStorage.getItem(STATE_KEY) || "",
    codeVerifier: sessionStorage.getItem(CODE_VERIFIER_KEY) || "",
  };
}

export function clearVkFlowState() {
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(CODE_VERIFIER_KEY);
}

function mapLocale(locale: Locale, VKID: typeof import("@vkid/sdk")) {
  if (locale === "kk") return VKID.Languages.KAZ;
  if (locale === "en") return VKID.Languages.ENG;
  return VKID.Languages.RUS;
}

function mapTheme(theme: Theme, VKID: typeof import("@vkid/sdk")) {
  return theme === "light" ? VKID.Scheme.LIGHT : VKID.Scheme.DARK;
}

function initVkConfig(
  VKID: typeof import("@vkid/sdk"),
  input?: { state?: string; codeVerifier?: string }
) {
  const state = input?.state || randomToken();
  const codeVerifier = input?.codeVerifier || randomToken(64);

  VKID.Config.init({
    app: VK_APP_ID,
    redirectUrl: getVkRedirectUrl(),
    state,
    codeVerifier,
    scope: VK_SCOPE,
    mode: VKID.ConfigAuthMode.Redirect,
    responseMode: VKID.ConfigResponseMode.Redirect,
  });

  return { state, codeVerifier };
}

export function isVkAuthEnabled() {
  return Number.isFinite(VK_APP_ID) && VK_APP_ID > 0;
}

export async function startVkLogin(input: { locale: Locale; theme: Theme }) {
  if (!isVkAuthEnabled()) {
    throw new Error("VK ID is not configured");
  }

  const VKID = await import("@vkid/sdk");
  const { state, codeVerifier } = initVkConfig(VKID);
  saveFlowState(state, codeVerifier);

  await VKID.Auth.login({
    lang: mapLocale(input.locale, VKID),
    scheme: mapTheme(input.theme, VKID),
  });
}

export async function exchangeVkCode(input: { code: string; deviceId: string }) {
  if (!isVkAuthEnabled()) {
    throw new Error("VK ID is not configured");
  }

  const VKID = await import("@vkid/sdk");
  const saved = readFlowState();
  initVkConfig(VKID, saved);

  const tokens = await VKID.Auth.exchangeCode(input.code, input.deviceId, saved.codeVerifier);
  clearVkFlowState();
  return tokens;
}

export async function createVkSession(accessToken: string): Promise<{ token?: string | null; user: any }> {
  const res = await fetch(`${API_URL}/auth/vk/session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ access_token: accessToken }),
  });

  if (!res.ok) {
    throw new Error("VK auth failed");
  }

  return res.json();
}
