import { Fragment, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronLeft } from "lucide-react";
import { WEEKDAYS } from "../../utils/constants";
import { formatMonthDay } from "../../utils/dates";
import { Button } from "../Button/Button";
import type { FillSessionSnapshot } from "./FillSession";
import "./DoubleCheck.css";

interface DoubleCheckProps {
  snapshot: FillSessionSnapshot;
  onBack: () => void;
  onConfirm: () => void;
}

export function DoubleCheck({ snapshot, onBack, onConfirm }: DoubleCheckProps) {
  const { t, i18n } = useTranslation();
  const { cards, compartments, columnDates, excludedMedicines = [] } = snapshot;
  const [expandedCell, setExpandedCell] = useState<string | null>(null);

  // Build compartment grid: for each compartment and day, sum all medicines
  const getCompartmentTotal = (
    compartmentLabel: string,
    dayName: string,
  ): number => {
    return cards.reduce((sum, card) => {
      const slot = card.slots.find(
        (s) => s.compartmentLabel === compartmentLabel,
      );
      return sum + (slot?.quantities[dayName] ?? 0);
    }, 0);
  };

  // Get medicines in a specific compartment/day for the detail view
  const getCompartmentMedicines = (
    compartmentLabel: string,
    dayName: string,
  ) => {
    return cards
      .map((card) => {
        const slot = card.slots.find(
          (s) => s.compartmentLabel === compartmentLabel,
        );
        const qty = slot?.quantities[dayName] ?? 0;
        return qty > 0
          ? { drugName: card.drugName, dosage: card.dosage, qty }
          : null;
      })
      .filter(
        (x): x is { drugName: string; dosage: string; qty: number } =>
          x !== null,
      );
  };

  const cellKey = (compartmentLabel: string, dayName: string) =>
    `${compartmentLabel}-${dayName}`;

  // Parse the expanded cell key to get compartment and day
  const getExpandedDetails = () => {
    if (!expandedCell) return null;
    const [compartmentLabel, dayName] = expandedCell.split("-");
    const medicines = getCompartmentMedicines(compartmentLabel, dayName);
    const total = getCompartmentTotal(compartmentLabel, dayName);
    const { date } = columnDates[dayName];
    const compartment = compartments.find((c) => c.label === compartmentLabel);
    return { compartmentLabel, dayName, medicines, total, date, compartment };
  };

  const expandedDetails = getExpandedDetails();

  return (
    <section className="fill-session-wizard-step">
      <h1>{t("fillSessionWizard.doubleCheck.heading")}</h1>
      <p>{t("fillSessionWizard.doubleCheck.intro")}</p>

      {excludedMedicines.length > 0 && (
        <div className="double-check-excluded">
          <h2 className="double-check-excluded-heading">
            {t("fillSessionWizard.doubleCheck.excludedHeading")}
          </h2>
          <ul className="double-check-excluded-list">
            {excludedMedicines.map((med) => (
              <li key={`${med.drugName}-${med.dosage}`}>
                {med.drugName} {med.dosage}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="double-check-grid-container">
        <div
          className="double-check-grid"
          style={
            {
              "--day-count": WEEKDAYS.length,
              "--comp-count": compartments.length,
            } as React.CSSProperties
          }
        >
          {/* Corner */}
          <div className="double-check-corner" />

          {/* Day headers */}
          {WEEKDAYS.map((day, dayIdx) => {
            const { date } = columnDates[day];
            return (
              <div
                key={day}
                className="double-check-day-header"
                style={{ "--day-idx": dayIdx } as React.CSSProperties}
              >
                <span className="double-check-day-abbr">
                  {t(`days.abbr.${day}`)}
                </span>
                <span className="double-check-day-date">
                  {formatMonthDay(date, i18n.language)}
                </span>
              </div>
            );
          })}

          {/* Compartment rows */}
          {compartments.map((comp, compIdx) => (
            <Fragment key={comp.label}>
              {/* Compartment label */}
              <div
                className="double-check-comp-label"
                style={{ "--comp-idx": compIdx } as React.CSSProperties}
              >
                <span className="double-check-comp-name">{comp.label}</span>
                <span className="double-check-comp-time">
                  {comp.startTime}–{comp.endTime}
                </span>
              </div>

              {/* Cells for each day */}
              {WEEKDAYS.map((day, dayIdx) => {
                const total = getCompartmentTotal(comp.label, day);
                const key = cellKey(comp.label, day);
                const isExpanded = expandedCell === key;

                return (
                  <Button
                    key={day}
                    type="button"
                    className={`double-check-cell${total === 0 ? " double-check-cell--empty" : ""}${isExpanded ? " double-check-cell--expanded" : ""}`}
                    style={
                      {
                        "--day-idx": dayIdx,
                        "--comp-idx": compIdx,
                      } as React.CSSProperties
                    }
                    onClick={() => setExpandedCell(isExpanded ? null : key)}
                    aria-expanded={isExpanded}
                    aria-label={`${comp.label} ${t(`days.abbr.${day}`)}: ${t("doseForm.pill", { count: total })}`}
                  >
                    <span className="double-check-cell-count">{total}</span>
                  </Button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Expanded detail section */}
      {expandedDetails && (
        <div className="double-check-detail-panel">
          <h3 className="double-check-detail-heading">
            {expandedDetails.compartment?.label} –{" "}
            {t(`days.abbr.${expandedDetails.dayName}`)}
          </h3>
          <p className="double-check-detail-date">
            {formatMonthDay(expandedDetails.date, i18n.language)}
          </p>
          <p className="double-check-detail-count">
            {t("doseForm.pill", { count: expandedDetails.total })}
          </p>
          {expandedDetails.medicines.length > 0 ? (
            <div className="double-check-detail-medicines">
              {expandedDetails.medicines.map((med) => (
                <div
                  key={`${med.drugName}-${med.dosage}`}
                  className="double-check-detail-item"
                >
                  <span className="double-check-detail-drug">
                    {med.drugName}
                  </span>
                  <span className="double-check-detail-dosage">
                    {med.dosage}
                  </span>
                  <span className="double-check-detail-qty">×{med.qty}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="double-check-detail-empty">
              {t("fillSessionWizard.doubleCheck.noMedicines")}
            </p>
          )}
        </div>
      )}

      <div className="fill-session-wizard-buttons">
        <Button
          type="button"
          className="button-secondary button-leading-icon"
          onClick={onBack}
        >
          <ChevronLeft size={18} aria-hidden="true" />
          {t("fillSessionWizard.doubleCheck.backButton")}
        </Button>
        <Button
          type="button"
          className="button-primary button-leading-icon"
          onClick={onConfirm}
        >
          <Check size={18} aria-hidden="true" />
          {t("fillSessionWizard.doubleCheck.confirmButton")}
        </Button>
      </div>
    </section>
  );
}
