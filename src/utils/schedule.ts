import type { DayOfWeek, PerSlotDose, Schedule } from "../../shared/schedule";
import { WEEKDAYS } from "./constants";
import { formatTimeOfDay } from "./dates";

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

const SUMMARY_CHAR_LIMIT = 30;

interface Routine {
  days: DayOfWeek[];
  slots: PerSlotDose[];
}

function groupRoutines(days: Schedule["days"]): Routine[] {
  const bySignature = new Map<string, DayOfWeek[]>();
  for (const day of WEEKDAYS) {
    const slots = days[day];
    if (!slots) continue;
    const sig = JSON.stringify(slots);
    const group = bySignature.get(sig) ?? [];
    group.push(day);
    bySignature.set(sig, group);
  }
  return Array.from(bySignature.entries()).map(([sig, groupDays]) => ({
    days: groupDays,
    slots: JSON.parse(sig) as PerSlotDose[],
  }));
}

export function buildScheduleSummary(
  schedule: Schedule,
  t: TranslateFn,
  language: string,
): string {
  const routines = groupRoutines(schedule.days);
  if (routines.length === 0) return "";

  const formatDays = (days: DayOfWeek[]) =>
    days.length === 7
      ? t("prescriptionDetail.scheduleDaily")
      : days.map((d) => t(`days.abbr.${d}`)).join("/");

  if (routines.length > 1) {
    const allDays = WEEKDAYS.filter((d) =>
      routines.some((r) => r.days.includes(d)),
    );
    const dayStr = allDays.map((d) => t(`days.abbr.${d}`)).join("/");
    return t("prescriptionList.complexSchedule", { days: dayStr });
  }

  const { days, slots } = routines[0];
  const dayStr = formatDays(days);
  const times = slots.map((s) => formatTimeOfDay(s.time, language));

  let timeStr: string;
  if (times.length === 1) {
    timeStr = times[0];
  } else if (times.length === 2) {
    timeStr = `${times[0]} & ${times[1]}`;
  } else {
    timeStr = `${times.slice(0, -1).join(", ")} & ${times[times.length - 1]}`;
  }

  const full = `${dayStr}: ${timeStr}`;
  if (full.length > SUMMARY_CHAR_LIMIT) {
    return t("prescriptionList.scheduleDoses", {
      days: dayStr,
      count: slots.length,
    });
  }

  return full;
}
