import { useTranslation } from "react-i18next";
import { Scroll } from "lucide-react";
import { Button } from "../Button/Button";
import { Dialog } from "../Dialog/Dialog";

interface AddAnotherDialogProps {
  onClose: () => void;
}

export function AddAnotherDialog({ onClose }: AddAnotherDialogProps) {
  const { t } = useTranslation();
  return (
    <Dialog
      open
      onClose={onClose}
      title={t("prescriptionDetail.addAnotherHeading")}
      dismissible
    >
      <p>{t("prescriptionDetail.addAnotherBody")}</p>
      <div className="dialog-actions">
        <Button
          as="link"
          to="/prescriptions/new"
          variant="primary"
          iconPosition="leading"
        >
          <Scroll size={18} aria-hidden="true" />
          {t("prescriptionDetail.addAnother")}
        </Button>
        <Button type="button" variant="secondary" onClick={onClose}>
          {t("prescriptionDetail.noThanks")}
        </Button>
      </div>
    </Dialog>
  );
}
