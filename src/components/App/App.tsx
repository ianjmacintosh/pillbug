import { getRouteApi } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { addDays, formatShortDate } from "../../utils/dates";
import { weekBoundaries } from "../../../shared/week-boundaries";
import { DaySection } from "./DaySection";
import { type ScheduledDose } from "./DoseItem";
import { WeekNav } from "./WeekNav";
import "./App.css";

const WEEK_DAY_KEYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const Route = getRouteApi("/layout/weekly-doses");

function App({ today: todayProp }: { today?: string }) {
  const { t, i18n } = useTranslation();
  const { registrationDate, timezone } = Route.useLoaderData();
  const today =
    todayProp ??
    new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone ?? "UTC",
    }).format(new Date());
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
    fetch(
      `/api/v1/scheduled-doses?start=${displayedMonday}&end=${addDays(displayedMonday, 6)}`,
    )
      .then(async (res) => {
        if (res.ok) setDoses((await res.json()) as ScheduledDose[]);
      })
      .catch(() => {});
  }, [displayedMonday]);

  const dosesByDate = new Map<string, ScheduledDose[]>();
  for (const dose of doses) {
    const date = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone ?? "UTC",
    }).format(new Date(dose.scheduledAt));
    if (!dosesByDate.has(date)) dosesByDate.set(date, []);
    dosesByDate.get(date)!.push(dose);
  }

  return (
    <main className="home">
      <h1>{t("app.heading")}</h1>
      <h2 className="week-range">
        {formatShortDate(displayedMonday, i18n.language)}–
        {formatShortDate(sunday, i18n.language)}
      </h2>

      {doses.length === 0 && <p>{t("app.noDoses")}</p>}

      {weekDates.map((date, i) => (
        <DaySection
          key={date}
          date={date}
          dayName={t(`days.full.${WEEK_DAY_KEYS[i]}`)}
          isToday={date === today}
          dayDoses={dosesByDate.get(date) ?? []}
          timezone={timezone ?? "UTC"}
          locale={i18n.language}
          setDoses={setDoses}
        />
      ))}

      <WeekNav
        onPrevious={() => setDisplayedMonday(addDays(displayedMonday, -7))}
        onNext={() => setDisplayedMonday(addDays(displayedMonday, 7))}
        previousDisabled={atFloor}
        nextDisabled={atCeiling}
      />
    </main>
  );
}

export default App;
