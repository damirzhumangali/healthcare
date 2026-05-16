import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { exchangeGoogleCode } from "../lib/apiAuth";
import { consumePostLoginRedirect } from "../lib/authRedirect";
import { setSession } from "../lib/auth";
import { isAdminAccount, isDoctorAccount } from "../lib/adminAccess";
import { approveDevicePairingSession } from "../lib/devicePairing";
import { usePageSeo } from "../lib/seo";

export default function AuthCallback() {
  usePageSeo({
    title: "Авторизация Google — HealthAssist",
    description: "Служебный callback для входа через Google в HealthAssist.",
    path: "/auth/callback",
    locale: "ru",
    robots: "noindex, nofollow",
  });

  const nav = useNavigate();
  const [msg, setMsg] = useState("Авторизация через Google...");

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");

    if (err) {
      queueMicrotask(() => setMsg(`Google error: ${err}`));
      return;
    }

    if (!code) {
      queueMicrotask(() => setMsg("Нет параметра code. Попробуй войти снова."));
      return;
    }

    exchangeGoogleCode(code)
      .then(({ token, user }) => {
        setSession({ token, user, persistToken: true });

        const defaultDest = isAdminAccount(user) ? "/admin" : isDoctorAccount(user) ? "/doctor" : "/app";
        const dest = consumePostLoginRedirect(defaultDest);

        // If the stored redirect is a pairing URL, approve silently in the
        // background and send the patient straight to their cabinet.
        if (dest.startsWith("/pair?")) {
          const pairingToken = new URLSearchParams(dest.slice("/pair?".length)).get("token");
          if (pairingToken) {
            void approveDevicePairingSession(pairingToken, user).catch(() => {});
            nav("/app", { replace: true });
            return;
          }
        }

        nav(dest, { replace: true });
      })
      .catch(() => setMsg("Ошибка входа через Google. Попробуй снова."));
  }, [nav]);

  return (
    <div className="center">
      <Card>
        <div className="stack">
          <h1 className="h2">{msg}</h1>
          <p className="muted" style={{ margin: 0 }}>
            Если зависло — открой /login и попробуй ещё раз.
          </p>
        </div>
      </Card>
    </div>
  );
}
