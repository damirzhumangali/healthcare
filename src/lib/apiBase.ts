function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

const envApiBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const legacyEnvApiBase = import.meta.env.VITE_API_BASE as string | undefined;
const envBmoSettingsUrl = import.meta.env.VITE_BMO_SETTINGS_URL as string | undefined;

const resolvedApiBase = envApiBaseUrl?.trim()
  ? envApiBaseUrl
  : legacyEnvApiBase;

export const API_URL = resolvedApiBase?.trim()
  ? normalizeBaseUrl(resolvedApiBase)
  : import.meta.env.PROD
    ? ""
    : "http://localhost:4015";

export const BMO_SETTINGS_URL = envBmoSettingsUrl?.trim()
  ? normalizeBaseUrl(envBmoSettingsUrl)
  : "";
