import { useTranslation } from "react-i18next";
import { Dialog } from "../Dialog/Dialog";
import { OrganizerIllustration } from "./OrganizerIllustration";
import { ORGANIZER_OPTIONS } from "./organizerOptions";
import "./OrganizerTypeDialog.css";

interface OrganizerTypeDialogProps {
  value: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

export function OrganizerTypeDialog({
  value,
  onSelect,
  onClose,
}: OrganizerTypeDialogProps) {
  const { t } = useTranslation();

  return (
    <Dialog
      open
      onClose={onClose}
      title={t("fillSessionWizard.pillOrganizer.changeDialogHeading")}
    >
      <div
        className="organizer-type-dialog-options"
        role="radiogroup"
        aria-label={t("fillSession.pillOrganizerLabel")}
      >
        {ORGANIZER_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={opt.value === value}
            className={`organizer-type-option${
              opt.value === value ? " organizer-type-option--selected" : ""
            }`}
            onClick={() => {
              onSelect(opt.value);
              onClose();
            }}
          >
            <OrganizerIllustration compartments={opt.compartments} />
            <span className="organizer-type-option-label">
              {t(opt.labelKey)}
            </span>
          </button>
        ))}
      </div>
    </Dialog>
  );
}
