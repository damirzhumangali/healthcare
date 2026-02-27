import { useNavigate } from "react-router-dom";
import Card from "../components/Card";
import Button from "../components/Button";
import { getGoogleAuthUrl } from "../lib/apiAuth";

export default function Login() {
  const nav = useNavigate();

  return (
    <div className="center">
      <Card>
        <div className="stack">
          <h1 className="h1">Вход</h1>
          <p className="muted">
            Выберите способ входа. Для демо можно создать аккаунт через регистрацию.
          </p>

          <div className="row">
            <Button onClick={() => nav("/register")}>Регистрация</Button>
            <Button variant="ghost" onClick={() => nav("/scan/device-001")}>
              Назад к QR
            </Button>
          </div>

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
