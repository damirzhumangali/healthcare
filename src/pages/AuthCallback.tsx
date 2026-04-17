import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { exchangeGoogleCode } from "../lib/apiAuth";
import { setToken } from "../lib/auth";

const ADMIN_EMAILS = ["damirzhumangali125@gmail.com"];

export default function AuthCallback() {
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
        setToken(token);
        localStorage.setItem("healthassist_current_user", JSON.stringify(user));
        const email = String(user?.email || "").toLowerCase();
        const isAdmin = user?.role === "admin" || ADMIN_EMAILS.includes(email);
        nav(isAdmin ? "/admin" : "/app");
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
