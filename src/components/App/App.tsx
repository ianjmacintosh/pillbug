import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";
import "./App.css";

interface ScheduledDose {
  prescriptionId: string;
  drugName: string;
  dosage: string;
  scheduledAt: string;
  actionable: boolean;
  resolvedDose: { id: string; status: "taken" | "missed" } | null;
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

function getWeekBoundaries(date: string): { monday: string; sunday: string } {
  const d = new Date(date + "T00:00:00Z");
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

const Route = getRouteApi("/layout/");

function App({
  today = new Date().toISOString().slice(0, 10),
}: {
  today?: string;
}) {
  const { registrationDate } = Route.useLoaderData();
  const { monday: currentWeekMonday } = getWeekBoundaries(today);
  const [revealed, setRevealed] = useState(false);
  const [doses, setDoses] = useState<ScheduledDose[]>([]);
  const [displayedMonday, setDisplayedMonday] = useState(currentWeekMonday);

  const sunday = addDays(displayedMonday, 6);
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    addDays(displayedMonday, i),
  );

  const floor = registrationDate
    ? getWeekBoundaries(registrationDate).monday
    : null;
  const atFloor = floor !== null && displayedMonday <= floor;

  async function fetchDoses(weekMonday: string) {
    const weekSunday = addDays(weekMonday, 6);
    const res = await fetch(
      `/api/v1/scheduled-doses?start=${weekMonday}&end=${weekSunday}`,
    );
    if (res.ok) {
      setDoses((await res.json()) as ScheduledDose[]);
    }
  }

  async function handleReveal() {
    const res = await fetch(
      `/api/v1/scheduled-doses?start=${displayedMonday}&end=${sunday}`,
    );
    if (res.ok) {
      setDoses((await res.json()) as ScheduledDose[]);
      setRevealed(true);
    }
  }

  async function handlePreviousWeek() {
    const prevMonday = addDays(displayedMonday, -7);
    setDisplayedMonday(prevMonday);
    await fetchDoses(prevMonday);
  }

  function handleHide() {
    setDoses([]);
    setRevealed(false);
    setDisplayedMonday(currentWeekMonday);
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
                    {dayDoses.map((dose) => {
                      const time = dose.scheduledAt.slice(11, 16);
                      const checked = dose.resolvedDose !== null;

                      async function handleToggle() {
                        if (dose.resolvedDose) {
                          const res = await fetch(
                            `/api/v1/doses/${dose.resolvedDose.id}`,
                            { method: "DELETE" },
                          );
                          if (res.ok) {
                            setDoses((prev) =>
                              prev.map((d) =>
                                d.scheduledAt === dose.scheduledAt
                                  ? { ...d, resolvedDose: null }
                                  : d,
                              ),
                            );
                          }
                        } else {
                          const res = await fetch("/api/v1/doses", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              prescriptionId: dose.prescriptionId,
                              scheduledAt: dose.scheduledAt,
                              status: "taken",
                            }),
                          });
                          if (res.ok) {
                            const created = (await res.json()) as {
                              id: string;
                            };
                            setDoses((prev) =>
                              prev.map((d) =>
                                d.scheduledAt === dose.scheduledAt
                                  ? {
                                      ...d,
                                      resolvedDose: {
                                        id: created.id,
                                        status: "taken" as const,
                                      },
                                    }
                                  : d,
                              ),
                            );
                          }
                        }
                      }

                      return (
                        <li key={dose.scheduledAt}>
                          <label>
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!dose.actionable}
                              onChange={handleToggle}
                            />
                            <span className="dose-time">{time}</span>
                            <span className="dose-dosage">{dose.dosage}</span>
                            <span className="dose-drug">{dose.drugName}</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}

          <button
            type="button"
            onClick={handlePreviousWeek}
            disabled={atFloor}
            className="button-secondary"
          >
            Previous week
          </button>

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
