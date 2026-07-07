import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { APP_LOCALES, type AppLocale } from "../lib/locale";

type LanguageSwitcherProps = {
  locale: AppLocale;
  onChange: (locale: AppLocale) => void;
  variant?: "segmented" | "compact";
  className?: string;
  ariaLabel?: string;
  title?: string;
};

function localeLabel(locale: AppLocale) {
  return locale === "kk" ? "KZ" : locale.toUpperCase();
}

export default function LanguageSwitcher({
  locale,
  onChange,
  variant = "segmented",
  className = "",
  ariaLabel = "Language switcher",
  title = "Language switcher",
}: LanguageSwitcherProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (variant !== "compact") return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      if (!target || !ref.current || ref.current.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
    };
  }, [variant]);

  const rootClassName = useMemo(() => {
    const base =
      variant === "compact"
        ? "language-switcher language-switcher--compact"
        : "language-switcher language-switcher--topbar";
    return `${base}${className ? ` ${className}` : ""}`;
  }, [className, variant]);

  if (variant === "compact") {
    return (
      <div className={rootClassName} ref={ref}>
        <button
          type="button"
          className="language-switcher__trigger"
          aria-label={ariaLabel}
          title={title}
          onClick={() => setOpen((current) => !current)}
        >
          <span>{localeLabel(locale)}</span>
          <ChevronDown size={14} className="language-switcher__chevron" />
        </button>
        {open ? (
          <div className="language-switcher__menu">
            {APP_LOCALES.map((item) => (
              <button
                key={item}
                type="button"
                className={`language-switcher__menu-item ${
                  locale === item ? "language-switcher__menu-item--active" : ""
                }`}
                onClick={() => {
                  onChange(item);
                  setOpen(false);
                }}
              >
                {localeLabel(item)}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className={rootClassName} aria-label={ariaLabel}>
      {APP_LOCALES.map((item) => (
        <button
          key={item}
          type="button"
          className={`language-switcher__item ${
            locale === item ? "language-switcher__item--active" : ""
          }`}
          onClick={() => onChange(item)}
        >
          {localeLabel(item)}
        </button>
      ))}
    </div>
  );
}
