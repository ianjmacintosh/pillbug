import { useTranslation } from "react-i18next";
import { Link } from "@tanstack/react-router";
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
        <Button type="button" className="button-secondary" onClick={onClose}>
          {t("prescriptionDetail.noThanks")}
        </Button>
        <Link
          to="/prescriptions/new"
          className="button button-primary button-leading-icon"
        >
          <Scroll size={18} aria-hidden="true" />
          {t("prescriptionDetail.addAnother")}
        </Link>
      </div>
    </Dialog>
  );
}
