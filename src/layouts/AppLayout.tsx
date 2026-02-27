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
          <span className="brand__dot" />
          <div>
            <div className="brand__title">HealthAssist</div>
            <div className="brand__sub">
              {user ? `Пациент: ${user.email}` : "Кабинет пациента"}
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
