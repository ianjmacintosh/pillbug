import { useEffect, useState } from "react";
import {
  ONE_COMPARTMENT,
  TWO_COMPARTMENTS,
  FOUR_COMPARTMENTS,
  pillsNeeded,
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

const COMPARTMENT_CONFIGS: Record<string, Compartment[]> = {
  "1": ONE_COMPARTMENT,
  "2": TWO_COMPARTMENTS,
  "4": FOUR_COMPARTMENTS,
};

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
  const [spanDays, setSpanDays] = useState(7);
  const [compartmentsPerDay, setCompartmentsPerDay] = useState("1");

  const compartments =
    COMPARTMENT_CONFIGS[compartmentsPerDay] ?? ONE_COMPARTMENT;

  useEffect(() => {
    fetch("/api/v1/prescriptions?status=active")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Prescription[]) => setPrescriptions(data))
      .catch(() => {});
  }, []);

  const weeks = spanDays / 7;
  const cards = groupByMedicine(prescriptions, compartments);
  const totalPills = prescriptions.reduce(
    (sum, rx) => sum + pillsNeeded(rx.schedule, spanDays),
    0,
  );

  return (
    <main className="fill-session">
      <h1>Fill Session</h1>

      <div className="fill-session-controls">
        <label>
          Span
          <select
            value={spanDays}
            onChange={(e) => setSpanDays(Number(e.target.value))}
          >
            <option value="7">7 days</option>
            <option value="14">14 days</option>
            <option value="28">28 days</option>
          </select>
        </label>
        <label>
          Compartments per day
          <select
            value={compartmentsPerDay}
            onChange={(e) => setCompartmentsPerDay(e.target.value)}
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="4">4</option>
          </select>
        </label>
      </div>

      {prescriptions.length === 0 ? (
        <p>No active prescriptions.</p>
      ) : (
        <>
          {weeks > 1 && (
            <p className="fill-session-repeat-note">
              Weekly schedule repeats for {weeks} weeks.
            </p>
          )}

          <div className="fill-session-cards">
            {cards.map((card) => {
              const spanTotal = card.weeklyTotal * weeks;
              return (
                <div
                  key={`${card.drugName}-${card.dosage}`}
                  className="fill-session-card"
                >
                  <div className="fill-session-card-header">
                    <span className="fill-session-card-drug-name">
                      {card.drugName}
                    </span>
                    <span className="fill-session-card-drug-dosage">
                      {card.dosage}
                    </span>
                    <span className="fill-session-card-drug-total">
                      {spanTotal} pill{spanTotal !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <div
                    className="fill-session-card-grid"
                    style={
                      {
                        "--day-count": DAYS_OF_WEEK.length,
                      } as React.CSSProperties
                    }
                  >
                    <div className="fill-session-card-corner" />

                    {DAYS_OF_WEEK.map((day) => (
                      <div key={day} className="fill-session-card-day-header">
                        {DAY_LABELS[day].slice(0, 3)}
                      </div>
                    ))}

                    {compartments.map((comp) => {
                      const slot = card.slots.find(
                        (s) => s.compartmentLabel === comp.label,
                      )!;
                      return (
                        <>
                          <div
                            key={comp.label}
                            className="fill-session-card-slot-label"
                          >
                            <span className="fill-session-card-slot-name">
                              {comp.label}
                            </span>
                            <span className="fill-session-card-slot-time">
                              {comp.startTime}–{comp.endTime}
                            </span>
                          </div>
                          {DAYS_OF_WEEK.map((day) => {
                            const qty = slot.quantities[day] ?? 0;
                            return (
                              <div
                                key={day}
                                className={`fill-session-card-cell${qty === 0 ? " fill-session-card-cell--empty" : ""}`}
                              >
                                <span className="fill-session-card-cell-count">
                                  {qty > 0 ? qty : "—"}
                                </span>
                              </div>
                            );
                          })}
                        </>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="fill-session-total">
            Total for {spanDays}-day fill:{" "}
            <strong>
              {totalPills} pill{totalPills !== 1 ? "s" : ""}
            </strong>
          </p>
        </>
      )}
    </main>
  );
}

export default FillSession;
