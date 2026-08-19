import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";

interface WeekNavProps {
  onPrevious: () => void;
  onNext: () => void;
  previousDisabled: boolean;
  nextDisabled: boolean;
}

export function WeekNav({
  onPrevious,
  onNext,
  previousDisabled,
  nextDisabled,
}: WeekNavProps) {
  const { t } = useTranslation();
  return (
    <div className="week-nav">
      <Button
        type="button"
        onClick={onPrevious}
        disabled={previousDisabled}
        variant="secondary"
      >
        {t("app.previousWeek")}
      </Button>
      <Button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        variant="secondary"
      >
        {t("app.nextWeek")}
      </Button>
    </div>
  );
}
