import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Scroll, ChevronRight } from "lucide-react";
import { Button } from "../Button/Button";
import { buildScheduleSummary } from "../../utils/schedule";
import type { Schedule } from "../../../shared/schedule";

interface Prescription {
  id: string;
  drugName: string;
  schedule: Schedule;
}

interface PrescriptionListProps {
  prescriptions: Prescription[];
  selectedId: string | null;
}

export function PrescriptionList({
  prescriptions,
  selectedId,
}: PrescriptionListProps) {
  const { t, i18n } = useTranslation();
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
              className="prescription-item__link"
            >
              <span className="prescription-item__drug">{p.drugName}</span>
              <span className="prescription-item__schedule">
                {buildScheduleSummary(p.schedule, t, i18n.language)}
              </span>
              <ChevronRight
                size={16}
                aria-hidden="true"
                className="prescription-item__chevron"
              />
            </Link>
          </li>
        ))}
      </ul>
      <Button
        as="link"
        to="/prescriptions/new"
        className="button-primary button-leading-icon"
      >
        <Scroll size={18} aria-hidden="true" />
        {t("prescriptions.addPrescription")}
      </Button>
    </div>
  );
}
