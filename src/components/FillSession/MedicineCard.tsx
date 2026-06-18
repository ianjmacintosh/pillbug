import { Fragment } from "react";
import { useTranslation } from "react-i18next";
import { WEEKDAYS } from "../../lib/days";
import { formatMonthDay } from "../../lib/dates";
import type {
  Compartment,
  MedicineCard as MedicineCardData,
} from "../../../shared/fill-session";

interface MedicineCardProps {
  card: MedicineCardData;
  compartments: Compartment[];
  columnDates: Record<string, { date: string; wrapped: boolean }>;
  isOpen: boolean;
  onToggle: () => void;
}

export function MedicineCard({
  card,
  compartments,
  columnDates,
  isOpen,
  onToggle,
}: MedicineCardProps) {
  const { t, i18n } = useTranslation();

  return (
    <section className="fill-session-card" aria-label={card.drugName}>
      <button
        type="button"
        className={`fill-session-card-header${isOpen ? " fill-session-card-header--open" : ""}`}
        onClick={onToggle}
        aria-expanded={isOpen}
      >
        <span className="fill-session-card-drug-name">{card.drugName}</span>
        <span className="fill-session-card-drug-dosage">{card.dosage}</span>
        <span className="fill-session-card-drug-total">
          {t("doseForm.pill", { count: card.weeklyTotal })}
        </span>
        <span className="fill-session-card-caret" aria-hidden="true">
          ▾
        </span>
      </button>

      <div
        className={`fill-session-card-grid${isOpen ? "" : " fill-session-card-grid--hidden"}`}
        style={
          {
            "--day-count": WEEKDAYS.length,
            "--comp-count": compartments.length,
          } as React.CSSProperties
        }
      >
        <div className="fill-session-card-corner" />

        {WEEKDAYS.map((day, dayIdx) => {
          const { date, wrapped } = columnDates[day];
          return (
            <div
              key={day}
              className={`fill-session-card-day-header${wrapped ? " fill-session-card-day-header--wrapped" : ""}`}
              style={{ "--day-idx": dayIdx } as React.CSSProperties}
            >
              {wrapped && (
                <span
                  className="fill-session-card-wrap-icon"
                  title={t("fillSession.wrapColumnTooltip")}
                  aria-label={t("fillSession.wrapColumnTooltip")}
                >
                  ⚠
                </span>
              )}
              <span>{t(`days.abbr.${day}`)}</span>
              <span className="fill-session-card-day-date">
                {formatMonthDay(date, i18n.language)}
              </span>
            </div>
          );
        })}

        {compartments.map((comp, compIdx) => {
          const slot = card.slots.find(
            (s) => s.compartmentLabel === comp.label,
          )!;
          return (
            <Fragment key={comp.label}>
              <div
                className="fill-session-card-slot-label"
                style={{ "--comp-idx": compIdx } as React.CSSProperties}
              >
                <span className="fill-session-card-slot-name">
                  {comp.label}
                </span>
                <span className="fill-session-card-slot-time">
                  {comp.startTime}–{comp.endTime}
                </span>
              </div>
              {WEEKDAYS.map((day, dayIdx) => {
                const qty = slot.quantities[day] ?? 0;
                return (
                  <div
                    key={day}
                    className={`fill-session-card-cell${qty === 0 ? " fill-session-card-cell--empty" : ""}`}
                    style={
                      {
                        "--day-idx": dayIdx,
                        "--comp-idx": compIdx,
                      } as React.CSSProperties
                    }
                  >
                    {qty > 0 && (
                      <span className="fill-session-card-cell-count">
                        {qty}
                      </span>
                    )}
                  </div>
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </section>
  );
}
