import { useEffect, useState } from "react";
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

const COMPARTMENT_CONFIGS: Record<string, Compartment[]> = {
  "1": ONE_COMPARTMENT,
  "2": TWO_COMPARTMENTS,
  "4": FOUR_COMPARTMENTS,
};

function compartmentCount(
  schedule: Schedule,
  compartments: Compartment[],
  label: string,
  spanDays: number,
): number {
  const weeks = spanDays / 7;
  let total = 0;
  for (const slots of Object.values(schedule.days)) {
    if (!slots) continue;
    for (const slot of slots) {
      if (resolveCompartmentLabel(slot.time, compartments) === label) {
        total += slot.quantity * weeks;
      }
    }
  }
  return total;
}

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

  return (
    <main>
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
        <table className="fill-session-table">
          <thead>
            <tr>
              <th>Prescription</th>
              {compartments.map((c) => (
                <th key={c.label}>
                  {c.label}
                  <br />
                  <small>
                    {c.startTime}–{c.endTime}
                  </small>
                </th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {prescriptions.map((rx) => (
              <tr key={rx.id}>
                <td>
                  {rx.drugName} {rx.dosage}
                </td>
                {compartments.map((c) => (
                  <td key={c.label}>
                    {compartmentCount(
                      rx.schedule,
                      compartments,
                      c.label,
                      spanDays,
                    )}
                  </td>
                ))}
                <td>{pillsNeeded(rx.schedule, spanDays)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

export default FillSession;
