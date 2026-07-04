import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { Dialog } from "../Dialog/Dialog";

interface UnsavedChangesDialogProps {
  open: boolean;
  onLeave: () => void;
  onStay: () => void;
}

export function UnsavedChangesDialog({
  open,
  onLeave,
  onStay,
}: UnsavedChangesDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open={open}
      onClose={onStay}
      title={t("prescriptionForm.unsavedChangesHeading")}
      dismissible={false}
    >
      <p>{t("prescriptionForm.unsavedChangesWarning")}</p>
      <div className="dialog-actions">
        <Button type="button" className="button-secondary" onClick={onStay}>
          {t("prescriptionForm.stay")}
        </Button>
        <Button type="button" className="button-danger" onClick={onLeave}>
          {t("prescriptionForm.leave")}
        </Button>
      </div>
    </Dialog>
  );
}
