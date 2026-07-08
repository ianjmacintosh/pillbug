import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";

interface DisclaimerProps {
  onContinue: () => void;
}

export function Disclaimer({ onContinue }: DisclaimerProps) {
  const { t } = useTranslation();

  return (
    <section className="fill-session-wizard-step">
      <h1>{t("fillSessionWizard.disclaimer.heading")}</h1>
      <ul>
        <li>{t("fillSessionWizard.disclaimer.responsibility")}</li>
        <li>{t("fillSessionWizard.disclaimer.unsafeMeds")}</li>
        <li>{t("fillSessionWizard.disclaimer.keepReference")}</li>
        <li>{t("fillSessionWizard.disclaimer.oneBottleAtATime")}</li>
      </ul>
      <Button type="button" onClick={onContinue}>
        {t("fillSessionWizard.continueButton")}
      </Button>
    </section>
  );
}
