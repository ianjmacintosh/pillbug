import { useTranslation } from "react-i18next";
import "./Header.css";

async function handleLogout() {
  await fetch("/api/v1/logout", { method: "POST" });
  window.location.replace("/register");
}

function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { t } = useTranslation();

  return (
    <header className="header">
      <a href="/" className="header-brand">
        {t("header.brand")}
      </a>
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
