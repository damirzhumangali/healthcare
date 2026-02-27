import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { exchangeGoogleCode } from "../lib/apiAuth";
import { setToken } from "../lib/auth";

export default function AuthCallback() {
  const nav = useNavigate();
  const [msg, setMsg] = useState("Авторизация через Google...");

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const err = url.searchParams.get("error");

    if (err) {
      setMsg(`Google error: ${err}`);
      return;
    }

    if (!code) {
      setMsg("Нет параметра code. Попробуй войти снова.");
      return;
    }

    exchangeGoogleCode(code)
      .then(({ token, user }) => {
        setToken(token);
        localStorage.setItem("healthassist_current_user", JSON.stringify(user));
        nav("/app");
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
