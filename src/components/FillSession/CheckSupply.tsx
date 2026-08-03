import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronRight, TriangleAlert } from "lucide-react";
import { addDays, formatMonthDay } from "../../utils/dates";
import { Button } from "../Button/Button";
import { Checkbox } from "../Checkbox/Checkbox";
import {
  groupByMedicine,
  medicineCardKey,
  type Compartment,
  type Schedule,
} from "../../../shared/fill-session";
import "./CheckSupply.css";

interface Prescription {
  drugName: string;
  dosage: string;
  schedule: Schedule;
}

export interface SupplyAnswer {
  drugName: string;
  dosage: string;
  hasEnough: boolean;
}

interface CheckSupplyProps {
  compartments: Compartment[];
  startDate: string;
  excludedMedicines: { drugName: string; dosage: string }[];
  onContinue: (answers: SupplyAnswer[]) => void;
}

export function CheckSupply({
  compartments,
  startDate,
  excludedMedicines,
  onContinue,
}: CheckSupplyProps) {
  const { t, i18n } = useTranslation();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch("/api/v1/prescriptions?status=active")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Prescription[]) => setPrescriptions(data))
      .catch(() => {});
  }, []);

  const cards = groupByMedicine(prescriptions, compartments);

  const excludedKeys = new Set(
    excludedMedicines.map((m) => medicineCardKey(m.drugName, m.dosage)),
  );
  const isCardChecked = (key: string) =>
    key in checked ? checked[key] : !excludedKeys.has(key);

  const handleContinue = () => {
    onContinue(
      cards.map((card) => ({
        drugName: card.drugName,
        dosage: card.dosage,
        hasEnough: isCardChecked(medicineCardKey(card.drugName, card.dosage)),
      })),
    );
  };

  const endDate = addDays(startDate, 6);
  const startDateFmt = formatMonthDay(startDate, i18n.language);
  const endDateFmt = formatMonthDay(endDate, i18n.language);

  return (
    <section className="fill-session-wizard-step">
      <h1>{t("fillSessionWizard.checkSupply.heading")}</h1>
      <p>
        {t("fillSessionWizard.checkSupply.descriptionPrefix")}{" "}
        <strong>
          {startDateFmt} – {endDateFmt}
        </strong>{" "}
        {t("fillSessionWizard.checkSupply.descriptionSuffix")}
      </p>
      <ul className="check-supply-list">
        {cards.map((card) => {
          const key = medicineCardKey(card.drugName, card.dosage);
          const isChecked = isCardChecked(key);
          return (
            <li
              key={key}
              className={`check-supply-row${isChecked ? "" : " check-supply-row--excluded"}`}
            >
              <Checkbox
                className="check-supply-checkbox"
                checked={isChecked}
                onChange={(e) =>
                  setChecked((prev) => ({ ...prev, [key]: e.target.checked }))
                }
              >
                <span className="check-supply-row-text">
                  <span className="check-supply-row-drug">
                    <span className="check-supply-row-drug-name">
                      {card.drugName}
                    </span>{" "}
                    <span className="check-supply-row-drug-dosage">
                      {card.dosage}
                    </span>
                  </span>
                  <span className="check-supply-row-count">
                    {t("doseForm.pill", { count: card.weeklyTotal })}
                  </span>
                  {!isChecked && (
                    <span
                      className="check-supply-row-excluded-note"
                      role="status"
                    >
                      <TriangleAlert size={14} aria-hidden="true" />
                      {t("fillSessionWizard.checkSupply.excludedNote")}
                    </span>
                  )}
                </span>
              </Checkbox>
            </li>
          );
        })}
      </ul>
      <Button
        type="button"
        onClick={handleContinue}
        className="button-primary button-trailing-icon"
      >
        {t("fillSessionWizard.continueButton")}
        <ChevronRight size={18} aria-hidden="true" />
      </Button>
    </section>
  );
}
