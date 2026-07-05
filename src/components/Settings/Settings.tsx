import { getRouteApi, Link, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { LogOut } from "lucide-react";
import { Button } from "../Button/Button";
import { SettingsForm } from "./SettingsForm";
import "./Settings.css";

const Route = getRouteApi("/layout/settings");

function Settings() {
  const { t } = useTranslation();
  const { timezone, language } = Route.useLoaderData();
  const navigate = useNavigate();

  async function handleLogout() {
    await fetch("/api/v1/logout", { method: "POST" });
    await navigate({ to: "/register" });
  }

  return (
    <main className="settings">
      <h1>{t("settings.heading")}</h1>
      <SettingsForm savedTimezone={timezone} savedLanguage={language} />
      <nav className="settings-legal" aria-label="Legal">
        <span className="settings-legal-eyebrow">{t("settings.legal")}</span>
        <Link to="/terms">{t("settings.termsOfService")}</Link>
        <Link to="/privacy">{t("settings.privacyPolicy")}</Link>
      </nav>
      <Button
        type="button"
        onClick={handleLogout}
        className="button-secondary button-leading-icon button-full settings-logout"
      >
        <LogOut size={18} aria-hidden="true" />
        {t("header.nav.logOut")}
      </Button>
    </main>
  );
}

export default Settings;
