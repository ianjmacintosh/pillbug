import { getRouteApi, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { weekBoundaries } from "../../../shared/week-boundaries";
import "./App.css";

interface ScheduledDose {
  prescriptionId: string;
  drugName: string;
  dosage: string;
  doseCount: number;
  doseForm: string;
  scheduledAt: string;
  actionable: boolean;
  resolvedDose: { id: string; status: "taken" } | null;
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

function formatShortDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(scheduledAt: string): string {
  return new Date(scheduledAt).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  });
}

function formatDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
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
  const { monday: currentWeekMonday } = weekBoundaries(today);
  const [doses, setDoses] = useState<ScheduledDose[]>([]);
  const [displayedMonday, setDisplayedMonday] = useState(currentWeekMonday);

  const sunday = addDays(displayedMonday, 6);
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    addDays(displayedMonday, i),
  );

  const floor = registrationDate
    ? weekBoundaries(registrationDate).monday
    : null;
  const atFloor = floor !== null && displayedMonday <= floor;
  const atCeiling = displayedMonday >= currentWeekMonday;

  useEffect(() => {
    const weekSunday = addDays(displayedMonday, 6);
    fetch(`/api/v1/scheduled-doses?start=${displayedMonday}&end=${weekSunday}`)
      .then(async (res) => {
        if (res.ok) setDoses((await res.json()) as ScheduledDose[]);
      })
      .catch(() => {});
  }, [displayedMonday]);

  function handlePreviousWeek() {
    setDisplayedMonday(addDays(displayedMonday, -7));
  }

  function handleNextWeek() {
    setDisplayedMonday(addDays(displayedMonday, 7));
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
      <h1>Weekly Dose Schedule</h1>
      <h2 className="week-range">
        {formatShortDate(displayedMonday)}–{formatShortDate(sunday)}
      </h2>

      {!hasAnyDoses && <p>No doses scheduled for this week.</p>}

      {weekDates.map((date, i) => {
        const dayName = WEEK_DAY_NAMES[i];
        const isToday = date === today;
        const dayDoses = dosesByDate.get(date) ?? [];

        const timeGroups = new Map<string, ScheduledDose[]>();
        for (const dose of [...dayDoses].sort((a, b) =>
          a.scheduledAt.localeCompare(b.scheduledAt),
        )) {
          const time = formatTime(dose.scheduledAt);
          if (!timeGroups.has(time)) timeGroups.set(time, []);
          timeGroups.get(time)!.push(dose);
        }

        return (
          <section key={date} aria-current={isToday ? "date" : undefined}>
            <h2>{dayName}</h2>
            <time dateTime={date}>{formatDate(date)}</time>
            {dayDoses.length > 0 && (
              <ul>
                {Array.from(timeGroups.entries()).map(
                  ([time, dosesForTime]) => (
                    <li key={time}>
                      <h3 className="dose-time">{time}</h3>
                      <ul>
                        {dosesForTime.map((dose) => {
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
                                    d.prescriptionId === dose.prescriptionId &&
                                    d.scheduledAt === dose.scheduledAt
                                      ? { ...d, resolvedDose: null }
                                      : d,
                                  ),
                                );
                              }
                            } else {
                              const res = await fetch("/api/v1/doses", {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                },
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
                                    d.prescriptionId === dose.prescriptionId &&
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
                            <li key={dose.prescriptionId}>
                              <label>
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!dose.actionable}
                                  onChange={handleToggle}
                                />
                                <span>
                                  {dose.doseCount} {dose.doseForm} ×{" "}
                                  {dose.drugName} {dose.dosage}
                                </span>
                              </label>
                              <span>
                                (
                                <Link
                                  to="/prescriptions/$id"
                                  params={{ id: dose.prescriptionId }}
                                >
                                  View Details
                                </Link>
                                )
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ),
                )}
              </ul>
            )}
          </section>
        );
      })}

      <div className="week-nav">
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
          onClick={handleNextWeek}
          disabled={atCeiling}
          className="button-secondary"
        >
          Next week
        </button>
      </div>
    </main>
  );
}

export default App;
