import { getRouteApi, useNavigate } from "@tanstack/react-router";
import { useState, type SyntheticEvent } from "react";
import { useTranslation } from "react-i18next";
import "./Settings.css";

const Route = getRouteApi("/layout/settings");

const LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "pt-BR", label: "Português (Brasil)" },
];

function Settings() {
  const { t, i18n } = useTranslation();
  const { timezone: savedTimezone, language: savedLanguage } =
    Route.useLoaderData();
  const [selectedLanguage, setSelectedLanguage] = useState(
    savedLanguage ?? i18n.language,
  );
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selected, setSelected] = useState(savedTimezone ?? browserTimezone);
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const allZones = Intl.supportedValuesOf("timeZone");

  async function handleSubmit(e: SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setStatus("idle");
    const res = await fetch("/api/v1/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ timezone: selected, language: selectedLanguage }),
    });
    setSubmitting(false);
    if (res.ok) {
      await i18n.changeLanguage(selectedLanguage);
      await navigate({ to: "/" });
    } else {
      setStatus("error");
    }
  }

  return (
    <main className="settings">
      <h1>{t("settings.heading")}</h1>
      <form onSubmit={handleSubmit}>
        <div className="field">
          <label htmlFor="language">{t("settings.languageLabel")}</label>
          <select
            id="language"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            {LANGUAGE_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="timezone">{t("settings.timezoneLabel")}</label>
          <select
            id="timezone"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {allZones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        {status === "error" && <p role="alert">{t("settings.serverError")}</p>}
        <button type="submit" disabled={submitting} className="button-primary">
          {submitting ? t("settings.submitting") : t("settings.submit")}
        </button>
      </form>
    </main>
  );
}

export default Settings;
