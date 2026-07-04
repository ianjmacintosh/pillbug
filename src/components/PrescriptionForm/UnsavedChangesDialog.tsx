import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
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
        <Button
          type="button"
          className="button-danger button-leading-icon"
          onClick={onLeave}
        >
          <Trash2 size={18} aria-hidden="true" />
          {t("prescriptionForm.leave")}
        </Button>
        <Button
          type="button"
          className="button-primary button-leading-icon"
          onClick={onStay}
        >
          <Pencil size={18} aria-hidden="true" />
          {t("prescriptionForm.stay")}
        </Button>
      </div>
    </Dialog>
  );
}
