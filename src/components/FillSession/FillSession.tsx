import { Fragment, useEffect, useState } from "react";
import {
  ONE_COMPARTMENT,
  TWO_COMPARTMENTS,
  THREE_COMPARTMENTS,
  FOUR_COMPARTMENTS,
  groupByMedicine,
  type Compartment,
  type Schedule,
} from "../../lib/fill-session";
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
  label: string;
  compartments: Compartment[];
}[] = [
  { value: "1", label: "Simple 7-day", compartments: ONE_COMPARTMENT },
  { value: "2", label: "7-day AM/PM", compartments: TWO_COMPARTMENTS },
  {
    value: "3",
    label: "7-day Morn/Noon/Night",
    compartments: THREE_COMPARTMENTS,
  },
  {
    value: "4",
    label: "7-day Morn/Noon/Eve/Bed",
    compartments: FOUR_COMPARTMENTS,
  },
];

const DAYS_OF_WEEK = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

const DAY_LABELS: Record<string, string> = {
  sunday: "Sunday",
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
};

function FillSession() {
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
      <h1>Fill Session</h1>

      <div className="fill-session-controls">
        <label>
          Pill organizer
          <select
            value={organizerType}
            onChange={(e) => setOrganizerType(e.target.value)}
          >
            {ORGANIZER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {prescriptions.length === 0 ? (
        <p>No active prescriptions.</p>
      ) : (
        <>
          <div className="fill-session-cards">
            {cards.map((card) => {
              const cardKey = `${card.drugName}-${card.dosage}`;
              const isOpen = openCardKey === cardKey;
              return (
                <div key={cardKey} className="fill-session-card">
                  <button
                    type="button"
                    className={`fill-session-card-header${isOpen ? " fill-session-card-header--open" : ""}`}
                    onClick={() => toggleCard(cardKey)}
                    aria-expanded={isOpen}
                  >
                    <span className="fill-session-card-drug-name">
                      {card.drugName}
                    </span>
                    <span className="fill-session-card-drug-dosage">
                      {card.dosage}
                    </span>
                    <span className="fill-session-card-drug-total">
                      {card.weeklyTotal} pill
                      {card.weeklyTotal !== 1 ? "s" : ""}
                    </span>
                    <span
                      className="fill-session-card-caret"
                      aria-hidden="true"
                    >
                      ▾
                    </span>
                  </button>

                  {isOpen && (
                    <div
                      className="fill-session-card-grid"
                      style={
                        {
                          "--day-count": DAYS_OF_WEEK.length,
                          "--comp-count": compartments.length,
                        } as React.CSSProperties
                      }
                    >
                      <div className="fill-session-card-corner" />

                      {DAYS_OF_WEEK.map((day, dayIdx) => (
                        <div
                          key={day}
                          className="fill-session-card-day-header"
                          style={{ "--day-idx": dayIdx } as React.CSSProperties}
                        >
                          {DAY_LABELS[day].slice(0, 3)}
                        </div>
                      ))}

                      {compartments.map((comp, compIdx) => {
                        const slot = card.slots.find(
                          (s) => s.compartmentLabel === comp.label,
                        )!;
                        return (
                          <Fragment key={comp.label}>
                            <div
                              className="fill-session-card-slot-label"
                              style={
                                {
                                  "--comp-idx": compIdx,
                                } as React.CSSProperties
                              }
                            >
                              <span className="fill-session-card-slot-name">
                                {comp.label}
                              </span>
                              <span className="fill-session-card-slot-time">
                                {comp.startTime}–{comp.endTime}
                              </span>
                            </div>
                            {DAYS_OF_WEEK.map((day, dayIdx) => {
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
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </main>
  );
}

export default FillSession;
