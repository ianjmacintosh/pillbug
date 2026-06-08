import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";

interface DeleteDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDialog({ onConfirm, onCancel }: DeleteDialogProps) {
  const { t } = useTranslation();
  return (
    <dialog open>
      <p>{t("prescriptionDetail.deleteWarning")}</p>
      <Button type="button" onClick={onCancel}>
        {t("prescriptionDetail.cancel")}
      </Button>
      <Button type="button" onClick={onConfirm}>
        {t("prescriptionDetail.confirmDelete")}
      </Button>
    </dialog>
  );
}
