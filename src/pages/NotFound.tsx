import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="nf">
      {/* Right panel — doctor photo */}
      <div className="nf__photo-panel">
        <img src="/images/doctor-bg.jpg" alt="" aria-hidden="true" className="nf__photo" />
        <div className="nf__photo-overlay" />
      </div>

      {/* Left panel — content */}
      <div className="nf__left">
        <div className="nf__inner">
          <div className="kicker" style={{ marginBottom: 16 }}>HealthAssist</div>

          <div className="nf__robot-wrap">
            <img src="/images/robot-404.png" alt="" aria-hidden="true" className="nf__robot" />
          </div>

          <h1 className="nf__code">404</h1>
          <h2 className="nf__title">Страница не найдена</h2>
          <p className="nf__desc">
            Похоже, наш робот заблудился.<br />
            Такой страницы не существует или она была перемещена.
          </p>

          <div className="nf__actions">
            <Link to="/" className="nf__btn nf__btn--primary">На главную</Link>
            <Link to="/app" className="nf__btn nf__btn--ghost">Мой кабинет</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
