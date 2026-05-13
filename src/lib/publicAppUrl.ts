function normalizeBaseUrl(value: string) {
  return value.trim().replace(/\/+$/, "");
}

const envPublicAppUrl = import.meta.env.VITE_PUBLIC_APP_URL as string | undefined;

export function getPublicAppUrl() {
  if (envPublicAppUrl?.trim()) {
    return normalizeBaseUrl(envPublicAppUrl);
  }

  if (typeof window === "undefined") {
    return "http://localhost:4173";
  }

  return window.location.origin;
}

export function buildPublicAppUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicAppUrl()}${normalizedPath}`;
}

export function isLocalPublicAppUrl() {
  try {
    const host = new URL(getPublicAppUrl()).hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.endsWith(".local")
    );
  } catch {
    return false;
  }
}
