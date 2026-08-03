import { useTranslation } from "react-i18next";
import type {
  Compartment,
  MedicineCard as MedicineCardData,
} from "../../../shared/fill-session";
import { PillOrganizerTable } from "./PillOrganizerTable";

interface MedicineCardProps {
  card: MedicineCardData;
  compartments: Compartment[];
  columnDates: Record<string, { date: string; wrapped: boolean }>;
  isCurrent: boolean;
}

export function MedicineCard({
  card,
  compartments,
  columnDates,
  isCurrent,
}: MedicineCardProps) {
  const { t } = useTranslation();

  return (
    <section
      className={`fill-session-card${isCurrent ? "" : " fill-session-card--hidden"}`}
      aria-label={card.drugName}
      aria-current={isCurrent ? "true" : undefined}
    >
      <div className="fill-session-card-header">
        <span className="fill-session-card-drug-name">{card.drugName}</span>
        <span className="fill-session-card-drug-dosage">{card.dosage}</span>
        <span className="fill-session-card-drug-total">
          {t("doseForm.pill", { count: card.weeklyTotal })}
        </span>
      </div>

      <PillOrganizerTable
        compartments={compartments}
        columnDates={columnDates}
        showWrapIndicator
        cellClassName={({ compartment, day }) => {
          const slot = card.slots.find(
            (s) => s.compartmentLabel === compartment.label,
          )!;
          const qty = slot.quantities[day] ?? 0;
          return qty === 0 ? "pill-organizer-table-cell--empty" : undefined;
        }}
        renderCell={({ compartment, day }) => {
          const slot = card.slots.find(
            (s) => s.compartmentLabel === compartment.label,
          )!;
          const qty = slot.quantities[day] ?? 0;
          return qty > 0 ? (
            <span className="pill-organizer-table-cell-count">{qty}</span>
          ) : null;
        }}
      />
    </section>
  );
}
