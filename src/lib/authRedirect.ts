const POST_LOGIN_REDIRECT_KEY = "healthassist_post_login_redirect";

function sanitizeRedirectPath(value?: string | null) {
  const next = (value || "").trim();

  if (!next.startsWith("/") || next.startsWith("//")) {
    return null;
  }

  return next;
}

export function resolvePostLoginRedirect(value?: string | null, fallback = "/app") {
  return sanitizeRedirectPath(value) || fallback;
}

export function storePostLoginRedirect(value?: string | null) {
  const next = sanitizeRedirectPath(value);

  if (!next) {
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    return;
  }

  sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, next);
}

export function consumePostLoginRedirect(fallback = "/app") {
  const next = sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY);
  sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  return resolvePostLoginRedirect(next, fallback);
}
