import { useTranslation } from "react-i18next";
import { LogIn } from "lucide-react";
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
        <a
          href={isAuthenticated ? "/prescriptions" : "/register"}
          className="header-brand"
        >
          {t("header.brand")}
        </a>
        {!isAuthenticated && (
          <Button
            as="link"
            to="/login"
            variant="primary"
            iconPosition="leading"
            className="header-login"
          >
            <LogIn size={18} aria-hidden="true" />
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
              variant="none"
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
