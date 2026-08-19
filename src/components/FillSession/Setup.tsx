import { useTranslation } from "react-i18next";
import { ChevronRight } from "lucide-react";
import { Button } from "../Button/Button";

interface SetupProps {
  onReady: () => void;
}

export function Setup({ onReady }: SetupProps) {
  const { t } = useTranslation();

  return (
    <section className="fill-session-wizard-step">
      <h1>{t("fillSessionWizard.setup.heading")}</h1>
      <ul>
        <li>{t("fillSessionWizard.setup.collectMedicines")}</li>
        <li>{t("fillSessionWizard.setup.washHands")}</li>
        <li>{t("fillSessionWizard.setup.emptyOrganizer")}</li>
      </ul>
      <Button
        type="button"
        onClick={onReady}
        variant="primary"
        iconPosition="trailing"
      >
        {t("fillSessionWizard.setup.readyButton")}
        <ChevronRight size={18} aria-hidden="true" />
      </Button>
    </section>
  );
}
