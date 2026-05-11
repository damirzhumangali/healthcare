import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import { isAdminAccount } from "../lib/adminAccess";
import { consumePostLoginRedirect } from "../lib/authRedirect";
import { setSession } from "../lib/auth";
import { clearVkFlowState, createVkSession, exchangeVkCode } from "../lib/vkAuth";

export default function VkAuthCallback() {
  const nav = useNavigate();
  const [msg, setMsg] = useState("Авторизация через VK ID...");

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    const deviceId = url.searchParams.get("device_id");
    const err = url.searchParams.get("error");

    if (err) {
      clearVkFlowState();
      queueMicrotask(() => setMsg(`VK ID error: ${err}`));
      return;
    }

    if (!code || !deviceId) {
      clearVkFlowState();
      queueMicrotask(() => setMsg("Нет параметров code/device_id. Попробуй войти снова."));
      return;
    }

    exchangeVkCode({ code, deviceId })
      .then((tokens) => createVkSession(tokens.access_token))
      .then(({ token, user }) => {
        setSession({
          token,
          user,
          persistToken: true,
        });
        nav(consumePostLoginRedirect(isAdminAccount(user) ? "/admin" : "/app"), {
          replace: true,
        });
      })
      .catch(() => {
        clearVkFlowState();
        setMsg("Ошибка входа через VK ID. Попробуй снова.");
      });
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
