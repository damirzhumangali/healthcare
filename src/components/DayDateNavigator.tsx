import { ChevronLeft, ChevronRight } from "lucide-react";

type DayDateNavigatorProps = {
  date: string;
  onChange: (next: string) => void;
  todayLabel?: string;
  prevTitle?: string;
  nextTitle?: string;
  todayTitle?: string;
  className?: string;
  inputClassName?: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function formatLocalDateInput(value: Date) {
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

export function getTodayDateInput() {
  return formatLocalDateInput(new Date());
}

export function shiftDateInput(value: string, deltaDays: number) {
  const [year, month, day] = value.split("-").map((part) => Number.parseInt(part, 10));
  if ([year, month, day].some(Number.isNaN)) return value;
  const next = new Date(year, month - 1, day, 12, 0, 0, 0);
  next.setDate(next.getDate() + deltaDays);
  return formatLocalDateInput(next);
}

export default function DayDateNavigator({
  date,
  onChange,
  todayLabel = "Сегодня",
  prevTitle = "Предыдущий день",
  nextTitle = "Следующий день",
  todayTitle = "Перейти к сегодня",
  className,
  inputClassName,
}: DayDateNavigatorProps) {
  const today = getTodayDateInput();
  const isToday = date === today;

  return (
    <div className={`day-date-nav${className ? ` ${className}` : ""}`}>
      <button
        type="button"
        className="day-date-nav__step"
        title={prevTitle}
        aria-label={prevTitle}
        onClick={() => onChange(shiftDateInput(date, -1))}
      >
        <ChevronLeft size={16} />
      </button>
      <input
        className={`day-date-nav__input${inputClassName ? ` ${inputClassName}` : ""}`}
        type="date"
        value={date}
        onChange={(event) => onChange(event.target.value)}
        aria-label="Дата"
      />
      <button
        type="button"
        className="day-date-nav__step"
        title={nextTitle}
        aria-label={nextTitle}
        onClick={() => onChange(shiftDateInput(date, 1))}
      >
        <ChevronRight size={16} />
      </button>
      <button
        type="button"
        className={`day-date-nav__today${isToday ? " day-date-nav__today--active" : ""}`}
        title={todayTitle}
        aria-label={todayTitle}
        onClick={() => onChange(today)}
      >
        {todayLabel}
      </button>
    </div>
  );
}
