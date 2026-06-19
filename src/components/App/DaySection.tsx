import type { Dispatch, SetStateAction } from "react";
import { formatDate, formatTime } from "../../utils/dates";
import { DoseItem, type ScheduledDose } from "./DoseItem";

interface DaySectionProps {
  date: string;
  dayName: string;
  isToday: boolean;
  dayDoses: ScheduledDose[];
  timezone: string;
  locale: string;
  setDoses: Dispatch<SetStateAction<ScheduledDose[]>>;
}

export function DaySection({
  date,
  dayName,
  isToday,
  dayDoses,
  timezone,
  locale,
  setDoses,
}: DaySectionProps) {
  const timeGroups = new Map<string, ScheduledDose[]>();
  for (const dose of [...dayDoses].sort((a, b) =>
    a.scheduledAt.localeCompare(b.scheduledAt),
  )) {
    const time = formatTime(dose.scheduledAt, timezone, locale);
    if (!timeGroups.has(time)) timeGroups.set(time, []);
    timeGroups.get(time)!.push(dose);
  }

  return (
    <section aria-current={isToday ? "date" : undefined}>
      <h2>{dayName}</h2>
      <time dateTime={date}>{formatDate(date, locale)}</time>
      {dayDoses.length > 0 && (
        <ul>
          {Array.from(timeGroups.entries()).map(([time, dosesForTime]) => (
            <li key={time}>
              <h3 className="dose-time">{time}</h3>
              <ul>
                {dosesForTime.map((dose) => (
                  <DoseItem
                    key={dose.prescriptionId}
                    dose={dose}
                    setDoses={setDoses}
                  />
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
