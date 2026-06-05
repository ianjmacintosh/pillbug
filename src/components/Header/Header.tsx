import { useTranslation } from "react-i18next";
import "./Header.css";

const LANGUAGE_OPTIONS = [{ value: "en-US", label: "English (US)" }];

async function handleLogout() {
  await fetch("/api/v1/logout", { method: "POST" });
  window.location.replace("/register");
}

function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { t, i18n } = useTranslation();

  return (
    <header className="header">
      <a href="/" className="header-brand">
        {t("header.brand")}
      </a>
      {!isAuthenticated && (
        <label className="header-language">
          <span className="visually-hidden">{t("header.language")}</span>
          <select
            value={i18n.language}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
          >
            {LANGUAGE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      {isAuthenticated && (
        <nav className="header-nav">
          <a href="/">{t("header.nav.home")}</a>
          <a href="/prescriptions">{t("header.nav.prescriptions")}</a>
          <a href="/fill-session">{t("header.nav.fillSession")}</a>
          <a href="/settings">{t("header.nav.settings")}</a>
          <button
            type="button"
            onClick={handleLogout}
            className="header-logout"
          >
            {t("header.nav.logOut")}
          </button>
        </nav>
      )}
    </header>
  );
}

export default Header;
