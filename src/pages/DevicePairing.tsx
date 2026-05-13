import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import Card from "../components/Card";
import { approveDevicePairingSession } from "../lib/devicePairing";
import { getCurrentUser, hasSession } from "../lib/auth";
import { storePostLoginRedirect } from "../lib/authRedirect";
import { usePageSeo } from "../lib/seo";

type Stage = "checking" | "redirecting" | "approving" | "success" | "error";

const copy = {
  ru: {
    checking: "Проверяем QR-сессию...",
    redirecting: "Перенаправляем на вход...",
    approving: "Подтверждаем вход на планшете...",
    success: "Вход подтвержден. Можно вернуться к планшету.",
    error: "Не получилось подтвердить вход на планшете. Попробуйте еще раз.",
  },
  kk: {
    checking: "QR сессиясын тексеріп жатырмыз...",
    redirecting: "Кіру бетіне жіберіп жатырмыз...",
    approving: "Планшеттегі кіруді растап жатырмыз...",
    success: "Кіру расталды. Енді планшетке оралуға болады.",
    error: "Планшеттегі кіруді растау мүмкін болмады. Қайта көріңіз.",
  },
  en: {
    checking: "Checking the QR session...",
    redirecting: "Redirecting to sign in...",
    approving: "Confirming sign-in on the tablet...",
    success: "Sign-in confirmed. You can return to the tablet.",
    error: "Could not confirm sign-in on the tablet. Please try again.",
  },
} as const;

export default function DevicePairing() {
  const nav = useNavigate();
  const location = useLocation();
  const params = useParams();
  const search = new URLSearchParams(location.search);

  const pairingToken = search.get("token") || params.pairingToken || "";
  const locale =
    (window.localStorage.getItem("ha_locale") as "ru" | "kk" | "en" | null) || "ru";
  const t = copy[locale] ?? copy.ru;

  const [stage, setStage] = useState<Stage>("checking");
  const [message, setMessage] = useState(t.checking);

  usePageSeo({
    title: "Подтверждение станции — HealthAssist",
    description: "Служебная страница подтверждения входа на планшете по QR-коду.",
    path: location.pathname,
    locale,
    robots: "noindex, nofollow",
  });

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!pairingToken) {
        nav("/app", { replace: true });
        return;
      }

      const redirectPath = `${location.pathname}${location.search}`;

      if (!hasSession()) {
        setStage("redirecting");
        setMessage(t.redirecting);
        storePostLoginRedirect(redirectPath);
        nav(`/login?next=${encodeURIComponent(redirectPath)}`, { replace: true });
        return;
      }

      setStage("approving");
      setMessage(t.approving);

      try {
        await approveDevicePairingSession(pairingToken, getCurrentUser());
        if (cancelled) return;

        setStage("success");
        setMessage(t.success);

        // Give the backend/tablet poll one moment to observe the approved state
        window.setTimeout(() => {
          if (!cancelled) {
            nav("/app", { replace: true });
          }
        }, 1200);
      } catch {
        if (cancelled) return;
        setStage("error");
        setMessage(t.error);
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, location.search, nav, pairingToken, t.approving, t.error, t.redirecting, t.success]);

  return (
    <div className="center min-h-screen">
      <Card>
        <div className="stack">
          <div className="kicker">QR → PHONE</div>
          <h1 className="h2" style={{ margin: 0 }}>
            {message}
          </h1>
          {stage === "success" ? (
            <p className="muted" style={{ margin: 0 }}>
              Планшет автоматически откроет экран температуры и пульса.
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
