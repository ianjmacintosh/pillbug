import { Fragment, useEffect, useState } from "react";
import {
  ONE_COMPARTMENT,
  TWO_COMPARTMENTS,
  FOUR_COMPARTMENTS,
  pillsNeeded,
  resolveCompartmentLabel,
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

interface SlotBreakdown {
  drugName: string;
  dosage: string;
  quantity: number;
}

const COMPARTMENT_CONFIGS: Record<string, Compartment[]> = {
  "1": ONE_COMPARTMENT,
  "2": TWO_COMPARTMENTS,
  "4": FOUR_COMPARTMENTS,
};

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DAY_LABELS: Record<string, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

function cellBreakdown(
  prescriptions: Prescription[],
  dayName: string,
  compartmentLabel: string,
  compartments: Compartment[],
): SlotBreakdown[] {
  const result: SlotBreakdown[] = [];
  for (const rx of prescriptions) {
    const slots = rx.schedule.days[dayName] ?? [];
    let qty = 0;
    for (const slot of slots) {
      if (
        resolveCompartmentLabel(slot.time, compartments) === compartmentLabel
      ) {
        qty += slot.quantity;
      }
    }
    if (qty > 0)
      result.push({ drugName: rx.drugName, dosage: rx.dosage, quantity: qty });
  }
  return result;
}

function FillSession() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [spanDays, setSpanDays] = useState(7);
  const [compartmentsPerDay, setCompartmentsPerDay] = useState("1");
  const [expandedDays, setExpandedDays] = useState(new Set<string>());

  const compartments =
    COMPARTMENT_CONFIGS[compartmentsPerDay] ?? ONE_COMPARTMENT;

  useEffect(() => {
    fetch("/api/v1/prescriptions?status=active")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Prescription[]) => setPrescriptions(data))
      .catch(() => {});
  }, []);

  function toggleDay(dayName: string) {
    setExpandedDays((prev) => {
      const next = new Set(prev);
      if (next.has(dayName)) next.delete(dayName);
      else next.add(dayName);
      return next;
    });
  }

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

      <div
        className="fill-session-mapping"
        role="region"
        aria-label="Compartment mapping"
      >
        {compartments.map((c) => (
          <span key={c.label} className="fill-session-mapping-item">
            <strong>{c.label}</strong> {c.startTime}–{c.endTime}
          </span>
        ))}
      </div>

      {prescriptions.length === 0 ? (
        <p>No active prescriptions.</p>
      ) : (
        <>
          <table className="fill-session-table">
            <thead>
              <tr>
                <th>Day</th>
                {compartments.map((c) => (
                  <th key={c.label}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS_OF_WEEK.map((day) => {
                const expanded = expandedDays.has(day);
                const dayCells = compartments.map((c) =>
                  cellBreakdown(prescriptions, day, c.label, compartments),
                );

                return (
                  <Fragment key={day}>
                    <tr
                      className={`fill-session-day-row${expanded ? " fill-session-day-row--expanded" : ""}`}
                      onClick={() => toggleDay(day)}
                      aria-expanded={expanded}
                    >
                      <td className="fill-session-day-name">
                        {DAY_LABELS[day]}
                      </td>
                      {dayCells.map((breakdown, i) => {
                        const total = breakdown.reduce(
                          (s, b) => s + b.quantity,
                          0,
                        );
                        return (
                          <td
                            key={compartments[i].label}
                            className="fill-session-count"
                          >
                            {total > 0 ? total : "—"}
                          </td>
                        );
                      })}
                    </tr>
                    {expanded && (
                      <tr className="fill-session-breakdown-row">
                        <td colSpan={compartments.length + 1}>
                          <div className="fill-session-breakdown">
                            {dayCells.map((breakdown, i) =>
                              breakdown.length > 0 ? (
                                <div
                                  key={compartments[i].label}
                                  className="fill-session-breakdown-compartment"
                                >
                                  <p className="fill-session-breakdown-label">
                                    {compartments[i].label}{" "}
                                    <span className="fill-session-breakdown-total">
                                      {breakdown.reduce(
                                        (s, b) => s + b.quantity,
                                        0,
                                      )}{" "}
                                      pill
                                      {breakdown.reduce(
                                        (s, b) => s + b.quantity,
                                        0,
                                      ) !== 1
                                        ? "s"
                                        : ""}
                                    </span>
                                  </p>
                                  <ul>
                                    {breakdown.map((b) => (
                                      <li key={b.drugName}>
                                        {b.drugName} {b.dosage} × {b.quantity}
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              ) : null,
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>

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
