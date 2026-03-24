import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { getGoogleAuthUrl } from "../lib/apiAuth";
import { login } from "../lib/authStore";

export default function Login() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      login(email, password);
      nav("/app");
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка входа");
    }
  }

  return (
    <div className="center">
      <Card>
        <div className="stack">
          <h1 className="h1">Вход</h1>
          <p className="muted">
            Войдите по email/паролю или через Google. Если аккаунта нет - зарегистрируйтесь.
          </p>

          <form className="stack" onSubmit={onSubmit}>
            <Input
              label="Email"
              placeholder="patient@healthassist.kz"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <Input
              label="Пароль"
              type="password"
              placeholder="Введите пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            {err ? <div className="alert">{err}</div> : null}

            <div className="row">
              <Button>Войти</Button>
              <Button type="button" variant="ghost" onClick={() => nav("/register")}>
                Регистрация
              </Button>
              <Button type="button" variant="ghost" onClick={() => nav("/")}>
                На главную
              </Button>
            </div>
          </form>

          <div className="divider" />

          <Button
            variant="ghost"
            onClick={async () => {
              const url = await getGoogleAuthUrl();
              window.location.href = url;
            }}
          >
            Войти через Google
          </Button>
        </div>
      </Card>
    </div>
  );
}
