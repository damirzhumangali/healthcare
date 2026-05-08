function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

const envApiBase = import.meta.env.VITE_API_BASE as string | undefined;
const envBmoSettingsUrl = import.meta.env.VITE_BMO_SETTINGS_URL as string | undefined;

export const API_URL = envApiBase?.trim()
  ? normalizeBaseUrl(envApiBase)
  : import.meta.env.PROD
    ? ""
    : "http://localhost:4000";

export const BMO_SETTINGS_URL = envBmoSettingsUrl?.trim()
  ? normalizeBaseUrl(envBmoSettingsUrl)
  : "";
