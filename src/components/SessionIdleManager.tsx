import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Clock3, ShieldAlert } from "lucide-react";
import {
  getCurrentUser,
  logout,
  SESSION_USER_UPDATED_EVENT,
  type SessionUser,
} from "../lib/auth";
import {
  isSessionIdleSuppressed,
  SESSION_IDLE_SUPPRESSION_EVENT,
} from "../lib/sessionIdle";

const WARNING_MS = 60_000;
const PATIENT_TIMEOUT_MS = 15 * 60 * 1000;
const STAFF_TIMEOUT_MS = 10 * 60 * 1000;

function readCurrentUser() {
  return getCurrentUser();
}

function sessionTimeoutMs(user: SessionUser | null) {
  return user?.role === "doctor" || user?.role === "admin" ? STAFF_TIMEOUT_MS : PATIENT_TIMEOUT_MS;
}

function protectedArea(pathname: string) {
  return (
    pathname.startsWith("/app") ||
    pathname.startsWith("/doctor") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/appointments/new")
  );
}

function formatRemaining(totalSeconds: number) {
  const safe = Math.max(totalSeconds, 0);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export default function SessionIdleManager() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(() => readCurrentUser());
  const [lastActivityAt, setLastActivityAt] = useState(() => Date.now());
  const [warningOpen, setWarningOpen] = useState(false);
  const [remainingMs, setRemainingMs] = useState(0);
  const [suppressed, setSuppressed] = useState(() => isSessionIdleSuppressed());
  const lastMouseMoveAt = useRef(0);

  const timeoutMs = useMemo(() => sessionTimeoutMs(user), [user]);
  const enabled = Boolean(user) && protectedArea(location.pathname);

  useEffect(() => {
    const syncUser = (event: Event) => {
      const detail = (event as CustomEvent<SessionUser | null>).detail;
      setUser(detail ?? readCurrentUser());
      setLastActivityAt(Date.now());
      setWarningOpen(false);
    };
    window.addEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
    return () => window.removeEventListener(SESSION_USER_UPDATED_EVENT, syncUser);
  }, []);

  useEffect(() => {
    const syncSuppression = () => {
      const active = isSessionIdleSuppressed();
      setSuppressed(active);
      if (active) {
        setWarningOpen(false);
      }
    };
    window.addEventListener(SESSION_IDLE_SUPPRESSION_EVENT, syncSuppression);
    return () => window.removeEventListener(SESSION_IDLE_SUPPRESSION_EVENT, syncSuppression);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    setLastActivityAt(Date.now());
    setWarningOpen(false);
  }, [enabled, location.pathname]);

  useEffect(() => {
    if (!enabled) return;

    const markActivity = () => {
      setLastActivityAt(Date.now());
      setWarningOpen(false);
    };

    const handleMouseMove = () => {
      const now = Date.now();
      if (now - lastMouseMoveAt.current < 10_000) return;
      lastMouseMoveAt.current = now;
      markActivity();
    };

    const opts: AddEventListenerOptions = { passive: true };
    window.addEventListener("pointerdown", markActivity, opts);
    window.addEventListener("keydown", markActivity);
    window.addEventListener("wheel", markActivity, opts);
    window.addEventListener("touchstart", markActivity, opts);
    window.addEventListener("scroll", markActivity, opts);
    window.addEventListener("mousemove", handleMouseMove, opts);

    return () => {
      window.removeEventListener("pointerdown", markActivity);
      window.removeEventListener("keydown", markActivity);
      window.removeEventListener("wheel", markActivity);
      window.removeEventListener("touchstart", markActivity);
      window.removeEventListener("scroll", markActivity);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setWarningOpen(false);
      setRemainingMs(0);
      return;
    }

    const tick = () => {
      const suppressionActive = isSessionIdleSuppressed();
      setSuppressed(suppressionActive);
      if (suppressionActive) {
        setRemainingMs(timeoutMs);
        setWarningOpen(false);
        return;
      }

      const nextRemaining = timeoutMs - (Date.now() - lastActivityAt);
      setRemainingMs(nextRemaining);

      if (nextRemaining <= 0) {
        logout();
        setWarningOpen(false);
        navigate("/login", { replace: true, state: { from: location.pathname } });
        return;
      }

      if (nextRemaining <= WARNING_MS) {
        setWarningOpen(true);
      } else {
        setWarningOpen(false);
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [enabled, lastActivityAt, location.pathname, navigate, timeoutMs]);

  if (!enabled || !warningOpen || suppressed) return null;

  const roleLabel =
    user?.role === "doctor"
      ? "врача"
      : user?.role === "admin"
        ? "администратора"
        : "пациента";

  return (
    <div className="session-idle-modal" role="dialog" aria-modal="true" aria-label="Скорый автовыход">
      <div className="session-idle-modal__backdrop" />
      <div className="session-idle-modal__card">
        <div className="session-idle-modal__icon">
          <ShieldAlert size={22} />
        </div>
        <div className="session-idle-modal__content">
          <strong>Сеанс скоро завершится</strong>
          <p>
            Из соображений безопасности кабинет {roleLabel} будет закрыт из-за неактивности.
          </p>
          <div className="session-idle-modal__countdown">
            <Clock3 size={16} />
            Осталось {formatRemaining(Math.ceil(remainingMs / 1000))}
          </div>
        </div>
        <div className="session-idle-modal__actions">
          <button
            type="button"
            className="session-idle-modal__btn session-idle-modal__btn--ghost"
            onClick={() => {
              logout();
              navigate("/login", { replace: true, state: { from: location.pathname } });
            }}
          >
            Выйти сейчас
          </button>
          <button
            type="button"
            className="session-idle-modal__btn session-idle-modal__btn--primary"
            onClick={() => {
              setLastActivityAt(Date.now());
              setWarningOpen(false);
            }}
          >
            Остаться
          </button>
        </div>
      </div>
    </div>
  );
}

