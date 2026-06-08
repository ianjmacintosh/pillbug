import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Select } from "../Select/Select";
import {
  ONE_COMPARTMENT,
  TWO_COMPARTMENTS,
  THREE_COMPARTMENTS,
  FOUR_COMPARTMENTS,
  groupByMedicine,
  type Compartment,
  type Schedule,
} from "../../lib/fill-session";
import { MedicineCard } from "./MedicineCard";
import "./FillSession.css";

interface Prescription {
  id: string;
  drugName: string;
  dosage: string;
  doseForm: string;
  schedule: Schedule;
  status: string;
}

const ORGANIZER_OPTIONS: {
  value: string;
  labelKey: string;
  compartments: Compartment[];
}[] = [
  {
    value: "1",
    labelKey: "fillSession.organizerOption.simple7day",
    compartments: ONE_COMPARTMENT,
  },
  {
    value: "2",
    labelKey: "fillSession.organizerOption.amPm",
    compartments: TWO_COMPARTMENTS,
  },
  {
    value: "3",
    labelKey: "fillSession.organizerOption.mornNoonNight",
    compartments: THREE_COMPARTMENTS,
  },
  {
    value: "4",
    labelKey: "fillSession.organizerOption.mornNoonEveNight",
    compartments: FOUR_COMPARTMENTS,
  },
];

function FillSession() {
  const { t } = useTranslation();
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [organizerType, setOrganizerType] = useState("1");
  const [openCardKey, setOpenCardKey] = useState<string | null>(null);

  const compartments =
    ORGANIZER_OPTIONS.find((o) => o.value === organizerType)?.compartments ??
    ONE_COMPARTMENT;

  useEffect(() => {
    fetch("/api/v1/prescriptions?status=active")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Prescription[]) => {
        setPrescriptions(data);
        const initialCards = groupByMedicine(data, ONE_COMPARTMENT);
        if (initialCards.length > 0) {
          setOpenCardKey(
            `${initialCards[0].drugName}-${initialCards[0].dosage}`,
          );
        }
      })
      .catch(() => {});
  }, []);

  const cards = groupByMedicine(prescriptions, compartments);

  const toggleCard = (key: string) => {
    setOpenCardKey((prev) => (prev === key ? null : key));
  };

  return (
    <main className="fill-session">
      <h1>{t("fillSession.heading")}</h1>

      <div className="fill-session-controls">
        <Select
          label={t("fillSession.pillOrganizerLabel")}
          value={organizerType}
          onChange={(e) => setOrganizerType(e.target.value)}
        >
          {ORGANIZER_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.labelKey)}
            </option>
          ))}
        </Select>
      </div>

      {prescriptions.length === 0 ? (
        <p>{t("fillSession.noPrescriptions")}</p>
      ) : (
        <>
          <div className="fill-session-cards">
            {cards.map((card) => {
              const cardKey = `${card.drugName}-${card.dosage}`;
              return (
                <MedicineCard
                  key={cardKey}
                  card={card}
                  compartments={compartments}
                  isOpen={openCardKey === cardKey}
                  onToggle={() => toggleCard(cardKey)}
                />
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

export default FillSession;
