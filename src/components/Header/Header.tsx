import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import "./Header.css";

const LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "pt-BR", label: "Português (Brasil)" },
];

async function handleLogout() {
  await fetch("/api/v1/logout", { method: "POST" });
  window.location.replace("/register");
}

function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { t, i18n } = useTranslation();

  return (
    <header className="header">
      <div className="header-inner">
        <a href="/prescriptions" className="header-brand">
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
            <a href="/prescriptions">{t("header.nav.prescriptions")}</a>
            <a href="/fill-session">{t("header.nav.fillSession")}</a>
            <a href="/settings">{t("header.nav.settings")}</a>
            <Button
              type="button"
              onClick={handleLogout}
              className="header-logout"
            >
              {t("header.nav.logOut")}
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}

export default Header;
