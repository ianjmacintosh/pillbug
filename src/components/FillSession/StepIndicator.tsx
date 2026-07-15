import { useTranslation } from "react-i18next";
import "./StepIndicator.css";

interface StepIndicatorProps {
  step: number;
  totalSteps: number;
}

export function StepIndicator({ step, totalSteps }: StepIndicatorProps) {
  const { t } = useTranslation();
  return (
    <p className="fill-session-wizard-step-indicator">
      {t("fillSessionWizard.stepIndicator", { step, totalSteps })}
    </p>
  );
}
