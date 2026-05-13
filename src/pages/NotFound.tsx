import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="notfound">
      {/* Doctor background — right side */}
      <div className="notfound__bg" />

      <div className="notfound__content">
        {/* Robot illustration */}
        <div className="notfound__robot-wrap">
          <img
            src="/images/robot-404.png"
            alt=""
            aria-hidden="true"
            className="notfound__robot"
          />
        </div>

        <div className="notfound__copy">
          <div className="kicker">HealthAssist</div>
          <h1 className="notfound__code">404</h1>
          <h2 className="notfound__title">Страница не найдена</h2>
          <p className="notfound__desc">
            Похоже, робот заблудился. Такой страницы не существует
            или она была перемещена.
          </p>
          <div className="notfound__actions">
            <Link to="/" className="notfound__btn notfound__btn--primary">
              На главную
            </Link>
            <Link to="/app" className="notfound__btn notfound__btn--ghost">
              Мой кабинет
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
