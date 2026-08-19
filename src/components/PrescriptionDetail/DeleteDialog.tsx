import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";
import { Dialog } from "../Dialog/Dialog";

interface DeleteDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDialog({ onConfirm, onCancel }: DeleteDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open
      onClose={onCancel}
      title={t("prescriptionDetail.deleteHeading")}
    >
      <p>{t("prescriptionDetail.deleteWarning")}</p>
      <div className="dialog-actions">
        <Button type="button" variant="secondary" onClick={onCancel}>
          {t("prescriptionDetail.cancel")}
        </Button>
        <Button type="button" variant="danger" onClick={onConfirm}>
          {t("prescriptionDetail.confirmDelete")}
        </Button>
      </div>
    </Dialog>
  );
}
