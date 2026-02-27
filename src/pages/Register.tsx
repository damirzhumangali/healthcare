import type { FormEvent } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import Input from "../components/Input";
import { register } from "../lib/authStore";

export default function Register() {
  const nav = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [err, setErr] = useState<string | null>(null);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    try {
      if (password !== password2) throw new Error("Пароли не совпадают");
      register(email, password);
      nav("/app");
    } catch (e: any) {
      setErr(e?.message ?? "Ошибка регистрации");
    }
  }

  return (
    <div className="center">
      <Card>
        <div className="stack">
          <h1 className="h1">Регистрация</h1>

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
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />

            <Input
              label="Повтор пароля"
              type="password"
              placeholder="Ещё раз"
              value={password2}
              onChange={(e) => setPassword2(e.target.value)}
              autoComplete="new-password"
            />

            {err ? <div className="alert">{err}</div> : null}

            <div className="row">
              <Button>Создать аккаунт</Button>
              <Button type="button" variant="ghost" onClick={() => nav("/login")}>
                Уже есть аккаунт
              </Button>
            </div>

            <Button type="button" variant="ghost" onClick={() => nav("/scan/device-001")}>
              Назад к QR
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
