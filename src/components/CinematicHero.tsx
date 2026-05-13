import "./CinematicHero.css";
import { Link } from "react-router-dom";

type CinematicHeroProps = {
  kicker: string;
  lines: [string, string, string];
  subtitle: string;
  labels: string[];
  ctaLabel?: string;
  ctaTo?: string;
  theme?: "dark" | "light";
};

const HERO_IMAGES = {
  dark: "/images/doctor-hero.jpg",
  light: "/images/doctor-hero-light.jpg"
};

export default function CinematicHero({
  kicker,
  lines,
  subtitle,
  labels,
  ctaLabel,
  ctaTo,
  theme = "dark",
}: CinematicHeroProps) {
  const heroImage = HERO_IMAGES[theme];

  return (
    <section className="cinematic-hero" data-theme={theme} aria-labelledby="cinematic-hero-title">
      <div className="cinematic-hero__ambient" aria-hidden="true">
        <div className="cinematic-hero__glow" />
        <div className="cinematic-hero__vignette" />
      </div>

      <div className="cinematic-hero__inner">
        <figure className="cinematic-hero__media">
          <div className="cinematic-hero__media-frame">
            <img
              className="cinematic-hero__image"
              src={heroImage}
              alt="Doctor under dramatic studio lighting"
              fetchPriority="high"
              loading="eager"
              decoding="async"
            />
          </div>
        </figure>

        <div className="cinematic-hero__content">
          <p className="cinematic-hero__kicker">{kicker}</p>

          <h1 className="cinematic-hero__title" id="cinematic-hero-title">
            <span>{lines[0]}</span>
            <strong>{lines[1]}</strong>
            <span>{lines[2]}</span>
          </h1>

          <p className="cinematic-hero__subtitle">{subtitle}</p>

          <ul className="cinematic-hero__labels" aria-label="Platform focus">
            {labels.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>

          {ctaLabel && ctaTo ? (
            <Link className="cinematic-hero__cta" to={ctaTo}>
              {ctaLabel}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
