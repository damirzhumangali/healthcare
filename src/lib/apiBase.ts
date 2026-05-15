function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const legacyEnvApiBase = import.meta.env.VITE_API_BASE as string | undefined;
const envBmoSettingsUrl = import.meta.env.VITE_BMO_SETTINGS_URL as string | undefined;

const resolvedApiBase = envApiBaseUrl?.trim()
  ? envApiBaseUrl
  : legacyEnvApiBase;

function shouldUseSameOriginApi() {
  if (!import.meta.env.PROD) {
    return false;
  }

  if (typeof window === "undefined") {
    return true;
  }

  const host = window.location.hostname;
  return host !== "localhost" && host !== "127.0.0.1";
}

export const API_URL = resolvedApiBase?.trim()
  ? normalizeBaseUrl(resolvedApiBase)
  : shouldUseSameOriginApi()
    ? ""
    : "http://localhost:4015";

export const BMO_SETTINGS_URL = envBmoSettingsUrl?.trim()
  ? normalizeBaseUrl(envBmoSettingsUrl)
  : "";
