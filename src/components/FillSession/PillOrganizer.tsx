import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { Button } from "../Button/Button";
import { Select } from "../Select/Select";
import { ORGANIZER_OPTIONS } from "./organizerOptions";
import "./PillOrganizer.css";

interface PillOrganizerProps {
  value: string;
  onChange: (value: string) => void;
  onContinue: () => void;
}

export function PillOrganizer({
  value,
  onChange,
  onContinue,
}: PillOrganizerProps) {
  const { t } = useTranslation();

  return (
    <section className="fill-session-wizard-step">
      <h1>{t("fillSessionWizard.pillOrganizer.heading")}</h1>
      <p>{t("fillSessionWizard.pillOrganizer.description")}</p>
      <Select
        label={t("fillSession.pillOrganizerLabel")}
        className="pill-organizer-field"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {ORGANIZER_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {t(opt.labelKey)}
          </option>
        ))}
      </Select>
      <Button
        type="button"
        onClick={onContinue}
        className="button-primary button-trailing-icon"
      >
        {t("fillSessionWizard.continueButton")}
        <ChevronRight size={18} aria-hidden="true" />
      </Button>
    </section>
  );
}
