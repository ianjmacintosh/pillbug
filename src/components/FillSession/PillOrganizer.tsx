import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { Button } from "../Button/Button";
import { ORGANIZER_OPTIONS } from "./organizerOptions";
import { OrganizerIllustration } from "./OrganizerIllustration";
import { OrganizerTypeDialog } from "./OrganizerTypeDialog";
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
  const [dialogOpen, setDialogOpen] = useState(false);

  const selected =
    ORGANIZER_OPTIONS.find((opt) => opt.value === value) ??
    ORGANIZER_OPTIONS[0];

  return (
    <section className="fill-session-wizard-step">
      <h1>{t("fillSessionWizard.pillOrganizer.heading")}</h1>
      <p>{t("fillSessionWizard.pillOrganizer.description")}</p>

      <div className="pill-organizer-selected">
        <OrganizerIllustration compartments={selected.compartments} />
        <p className="pill-organizer-selected-label">{t(selected.labelKey)}</p>
      </div>

      <Button
        type="button"
        className="button-secondary pill-organizer-change-button"
        onClick={() => setDialogOpen(true)}
      >
        {t("fillSessionWizard.pillOrganizer.changeButton")}
      </Button>

      {dialogOpen && (
        <OrganizerTypeDialog
          value={value}
          onSelect={onChange}
          onClose={() => setDialogOpen(false)}
        />
      )}

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
