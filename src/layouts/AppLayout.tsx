import { Outlet, useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { getCurrentUser, logout } from "../lib/authStore";

export default function AppLayout() {
  const nav = useNavigate();
  const user = getCurrentUser();

  return (
    <div>
      <header className="topbar">
        <div className="brand">
          <img src="/icon-192.png" alt="HealthAssist" className="brand__logo" />
          <div>
            <div className="brand__title">HealthAssist</div>
            <div className="brand__sub">
              {user ? `Аккаунт: ${user.name || user.email}` : "Кабинет пациента"}
            </div>
          </div>
        </div>

        <div className="actions">
          <Button
            variant="ghost"
            onClick={() => {
              logout();
              nav("/login");
            }}
          >
            Выйти
          </Button>
        </div>
      </header>

      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}
