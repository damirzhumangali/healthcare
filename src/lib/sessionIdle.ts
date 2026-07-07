export const SESSION_IDLE_SUPPRESSION_EVENT = "healthassist:session-idle-suppression";

const SUPPRESSION_UNTIL_KEY = "healthassist_session_idle_suppressed_until";
const DEFAULT_CALL_SUPPRESSION_MS = 2 * 60 * 60 * 1000;

function canUseSessionStorage() {
  return typeof window !== "undefined" && typeof window.sessionStorage !== "undefined";
}

function readSuppressedUntil() {
  if (!canUseSessionStorage()) return 0;
  const raw = window.sessionStorage.getItem(SUPPRESSION_UNTIL_KEY);
  const value = Number(raw || 0);
  return Number.isFinite(value) ? value : 0;
}

function writeSuppressedUntil(value: number) {
  if (!canUseSessionStorage()) return;
  if (value > Date.now()) {
    window.sessionStorage.setItem(SUPPRESSION_UNTIL_KEY, String(value));
  } else {
    window.sessionStorage.removeItem(SUPPRESSION_UNTIL_KEY);
  }
}

export function isSessionIdleSuppressed() {
  const until = readSuppressedUntil();
  if (!until) return false;
  if (until <= Date.now()) {
    writeSuppressedUntil(0);
    return false;
  }
  return true;
}

export function setSessionIdleSuppressed(active: boolean, durationMs = DEFAULT_CALL_SUPPRESSION_MS) {
  const until = active ? Date.now() + durationMs : 0;
  writeSuppressedUntil(until);
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SESSION_IDLE_SUPPRESSION_EVENT, {
        detail: { active, until },
      }),
    );
  }
}

export function extendSessionIdleSuppression(durationMs = DEFAULT_CALL_SUPPRESSION_MS) {
  setSessionIdleSuppressed(true, durationMs);
}

