import { getRouteApi } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { SettingsForm } from "./SettingsForm";
import "./Settings.css";

const Route = getRouteApi("/layout/settings");

function Settings() {
  const { t } = useTranslation();
  const { timezone, language } = Route.useLoaderData();

  return (
    <main className="settings">
      <h1>{t("settings.heading")}</h1>
      <SettingsForm savedTimezone={timezone} savedLanguage={language} />
    </main>
  );
}

export default Settings;
