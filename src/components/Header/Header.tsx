import { useState } from "react";
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
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

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
        <>
          <button
            type="button"
            className="header-hamburger"
            aria-expanded={isMobileNavOpen}
            aria-label={
              isMobileNavOpen
                ? t("header.nav.closeMenu")
                : t("header.nav.openMenu")
            }
            onClick={() => setIsMobileNavOpen((open) => !open)}
          >
            {isMobileNavOpen ? (
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="4" y1="4" x2="16" y2="16" />
                <line x1="16" y1="4" x2="4" y2="16" />
              </svg>
            ) : (
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                aria-hidden="true"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <line x1="3" y1="6" x2="17" y2="6" />
                <line x1="3" y1="10" x2="17" y2="10" />
                <line x1="3" y1="14" x2="17" y2="14" />
              </svg>
            )}
          </button>
          <nav className="header-nav">
            <a href="/">{t("header.nav.home")}</a>
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
        </>
      )}
    </header>
  );
}

export default Header;
