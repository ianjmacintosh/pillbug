import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "../Button/Button";

interface Prescription {
  id: string;
  drugName: string;
}

interface PrescriptionListProps {
  prescriptions: Prescription[];
  selectedId: string | null;
}

export function PrescriptionList({
  prescriptions,
  selectedId,
}: PrescriptionListProps) {
  const { t } = useTranslation();
  return (
    <div className="prescriptions-list-panel">
      <h1>{t("prescriptions.heading", { count: prescriptions.length })}</h1>
      <ul className="prescription-list">
        {prescriptions.map((p) => (
          <li
            key={p.id}
            className={`prescription-item${selectedId === p.id ? " prescription-item--selected" : ""}`}
          >
            <Link
              to="/prescriptions/$id"
              params={{ id: p.id }}
              className="prescription-item__name"
            >
              {p.drugName}
            </Link>
          </li>
        ))}
      </ul>
      <Button as="link" to="/prescriptions/new" className="button-primary">
        {t("prescriptions.addPrescription")}
      </Button>
    </div>
  );
}
