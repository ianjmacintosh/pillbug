import { useState, type SyntheticEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { Select } from "../Select/Select";

const LANGUAGE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "pt-BR", label: "Português (Brasil)" },
];

interface SettingsFormProps {
  savedTimezone: string | null;
  savedLanguage: string | null;
}

export function SettingsForm({
  savedTimezone,
  savedLanguage,
}: SettingsFormProps) {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [selectedLanguage, setSelectedLanguage] = useState(
    savedLanguage ?? i18n.language,
  );
  const [selectedTimezone, setSelectedTimezone] = useState(
    savedTimezone ?? browserTimezone,
  );
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
      body: JSON.stringify({
        timezone: selectedTimezone,
        language: selectedLanguage,
      }),
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
    <form onSubmit={handleSubmit}>
      <Select
        label={t("settings.languageLabel")}
        className="field"
        value={selectedLanguage}
        onChange={(e) => setSelectedLanguage(e.target.value)}
      >
        {LANGUAGE_OPTIONS.map(({ value, label }) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </Select>
      <Select
        label={t("settings.timezoneLabel")}
        className="field"
        value={selectedTimezone}
        onChange={(e) => setSelectedTimezone(e.target.value)}
      >
        {allZones.map((tz) => (
          <option key={tz} value={tz}>
            {tz}
          </option>
        ))}
      </Select>
      {status === "error" && <p role="alert">{t("settings.serverError")}</p>}
      <Button type="submit" disabled={submitting} className="button-primary">
        {submitting ? t("settings.submitting") : t("settings.submit")}
      </Button>
    </form>
  );
}
