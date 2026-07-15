import { useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ClipboardList, CalendarCheck, Settings } from "lucide-react";
import "./BottomNav.css";

function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const path = location.pathname;
  const isPrescriptionsActive =
    path === "/prescriptions" || path.startsWith("/prescriptions/");
  const isFillSessionActive =
    path === "/fill-session" || path.startsWith("/fill-session/");

  return (
    <nav className="bottom-nav" aria-label="Main navigation">
      <a
        href="/prescriptions"
        className={`bottom-nav-tab${isPrescriptionsActive ? " bottom-nav-tab--active" : ""}`}
        aria-current={isPrescriptionsActive ? "page" : undefined}
      >
        <span className="bottom-nav-tab-icon">
          <ClipboardList size={22} aria-hidden="true" />
        </span>
        <span>{t("header.nav.prescriptions")}</span>
      </a>
      <a
        href="/fill-session"
        className={`bottom-nav-tab${isFillSessionActive ? " bottom-nav-tab--active" : ""}`}
        aria-current={isFillSessionActive ? "page" : undefined}
      >
        <span className="bottom-nav-tab-icon">
          <CalendarCheck size={22} aria-hidden="true" />
        </span>
        <span>{t("header.nav.fillSession")}</span>
      </a>
      <a
        href="/settings"
        className={`bottom-nav-tab${path === "/settings" ? " bottom-nav-tab--active" : ""}`}
        aria-current={path === "/settings" ? "page" : undefined}
      >
        <span className="bottom-nav-tab-icon">
          <Settings size={22} aria-hidden="true" />
        </span>
        <span>{t("header.nav.settings")}</span>
      </a>
    </nav>
  );
}

export default BottomNav;
