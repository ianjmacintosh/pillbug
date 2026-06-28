import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import "./Header.css";

async function handleLogout() {
  await fetch("/api/v1/logout", { method: "POST" });
  window.location.replace("/register");
}

function Header({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const { t } = useTranslation();

  return (
    <header className="header">
      <div className="header-inner">
        <h2 className="header-brand">
          <a href="/prescriptions">{t("header.brand")}</a>
        </h2>
        {!isAuthenticated && (
          <Button as="link" to="/login" className="button-primary header-login">
            {t("header.nav.logIn")}
          </Button>
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
