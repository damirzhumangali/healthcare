import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  CalendarClock,
  ClipboardList,
  Cpu,
  LayoutDashboard,
  LayoutGrid,
  MoreHorizontal,
  MonitorSmartphone,
  Users,
} from "lucide-react";

export type AdminNavActiveItem =
  | "dashboard"
  | "schedule-page"
  | "ward-consults"
  | "aimar"
  | "more";

interface AdminMobileNavProps {
  activeItem: AdminNavActiveItem;
  wardBadge?: number;
  onDashboardClick?: () => void;
}

const MORE_ITEMS = [
  { id: "schedule", label: "Расписание", Icon: CalendarClock },
  { id: "appointments", label: "Записи", Icon: ClipboardList },
  { id: "patients", label: "Пациенты", Icon: Users },
  { id: "analytics", label: "Аналитика", Icon: BarChart3 },
] as const;

export default function AdminMobileNav({
  activeItem,
  wardBadge,
  onDashboardClick,
}: AdminMobileNavProps) {
  const nav = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    if (!sheetOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSheetOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sheetOpen]);

  function goToSection(id: string) {
    setSheetOpen(false);
    if (id === "analytics") {
      nav("/admin/analytics");
      return;
    }
    nav(`/admin#${id}`);
  }

  return (
    <>
      {sheetOpen && (
        <div
          className="admin-more-sheet__overlay"
          onClick={() => setSheetOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`admin-more-sheet${sheetOpen ? " admin-more-sheet--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Ещё разделы"
      >
        <div className="admin-more-sheet__handle" />
        <div className="admin-more-sheet__title">Разделы</div>
        {MORE_ITEMS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className="admin-more-sheet__item"
            onClick={() => goToSection(id)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </div>

      <nav className="doctor-admin__mobile-nav" aria-label="Admin mobile navigation">
        <button
          type="button"
          className={`doctor-admin__mobile-nav-item${activeItem === "dashboard" ? " doctor-admin__mobile-nav-item--active" : ""}`}
          onClick={() => (onDashboardClick ? onDashboardClick() : nav("/admin"))}
        >
          <LayoutDashboard size={18} />
          <span>Дашборд</span>
        </button>

        <button
          type="button"
          className={`doctor-admin__mobile-nav-item${activeItem === "schedule-page" ? " doctor-admin__mobile-nav-item--active" : ""}`}
          onClick={() => nav("/admin/doctor-schedule")}
        >
          <LayoutGrid size={18} />
          <span>График</span>
        </button>

        <button
          type="button"
          className={`doctor-admin__mobile-nav-item${activeItem === "ward-consults" ? " doctor-admin__mobile-nav-item--active" : ""}`}
          onClick={() => nav("/admin/ward-consults")}
        >
          <MonitorSmartphone size={18} />
          <span>Консультации</span>
          {wardBadge != null && wardBadge > 0 ? (
            <span className="doctor-admin__mobile-nav-badge">{wardBadge}</span>
          ) : null}
        </button>

        <button
          type="button"
          className={`doctor-admin__mobile-nav-item${activeItem === "aimar" ? " doctor-admin__mobile-nav-item--active" : ""}`}
          onClick={() => nav("/admin/aimar")}
        >
          <Cpu size={18} />
          <span>Aimar</span>
        </button>

        <button
          type="button"
          className={`doctor-admin__mobile-nav-item${activeItem === "more" ? " doctor-admin__mobile-nav-item--active" : ""}`}
          onClick={() => setSheetOpen((o) => !o)}
        >
          <MoreHorizontal size={18} />
          <span>Ещё</span>
        </button>
      </nav>
    </>
  );
}
