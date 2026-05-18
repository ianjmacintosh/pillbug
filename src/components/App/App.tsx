import { useState } from "react";
import "./App.css";

interface ScheduledDose {
  prescriptionId: string;
  drugName: string;
  scheduledAt: string;
  actionable: boolean;
  resolvedDose: { status: "taken" | "missed" } | null;
}

const WEEK_DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

function getWeekBoundaries(today: string): { monday: string; sunday: string } {
  const d = new Date(today + "T00:00:00Z");
  const day = d.getUTCDay();
  const daysToMonday = (day + 6) % 7;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - daysToMonday);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return {
    monday: monday.toISOString().slice(0, 10),
    sunday: sunday.toISOString().slice(0, 10),
  };
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function App({
  today = new Date().toISOString().slice(0, 10),
}: {
  today?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [doses, setDoses] = useState<ScheduledDose[]>([]);

  const { monday, sunday } = getWeekBoundaries(today);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i));

  async function handleReveal() {
    const res = await fetch(
      `/api/v1/scheduled-doses?start=${monday}&end=${sunday}`,
    );
    if (res.ok) {
      setDoses((await res.json()) as ScheduledDose[]);
      setRevealed(true);
    }
  }

  function handleHide() {
    setDoses([]);
    setRevealed(false);
  }

  const dosesByDate = new Map<string, ScheduledDose[]>();
  for (const dose of doses) {
    const date = dose.scheduledAt.slice(0, 10);
    if (!dosesByDate.has(date)) dosesByDate.set(date, []);
    dosesByDate.get(date)!.push(dose);
  }

  const hasAnyDoses = doses.length > 0;

  return (
    <main className="home">
      <h1>Your doses this week</h1>

      {!revealed ? (
        <button
          type="button"
          onClick={handleReveal}
          className="button-secondary"
        >
          Show doses
        </button>
      ) : (
        <>
          {!hasAnyDoses && <p>No doses scheduled for this week.</p>}

          {weekDates.map((date, i) => {
            const dayName = WEEK_DAY_NAMES[i];
            const isToday = date === today;
            const dayDoses = dosesByDate.get(date) ?? [];

            return (
              <section key={date} aria-current={isToday ? "date" : undefined}>
                <h2>{dayName}</h2>
                {dayDoses.length > 0 && (
                  <ul>
                    {dayDoses.map((dose) => (
                      <li
                        key={dose.scheduledAt}
                        aria-disabled={!dose.actionable ? "true" : undefined}
                      >
                        <span>{dose.drugName}</span>
                        <span>{dose.scheduledAt.slice(11, 16)}</span>
                        {dose.resolvedDose && (
                          <span>{dose.resolvedDose.status}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}

          <button
            type="button"
            onClick={handleHide}
            className="button-secondary"
          >
            Hide
          </button>
        </>
      )}
    </main>
  );
}

export default App;
