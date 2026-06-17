export function weekBoundaries(date: string): {
  monday: string;
  sunday: string;
} {
  const d = new Date(date + "T00:00:00Z");
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, ..., 6=Sat
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

export function nearestSunday(date: string): string {
  const d = new Date(date + "T00:00:00Z");
  const day = d.getUTCDay();
  if (day === 0) return date;
  const sunday = new Date(d);
  sunday.setUTCDate(d.getUTCDate() + (7 - day));
  return sunday.toISOString().slice(0, 10);
}

const SESSION_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export function sessionDates(
  startDate: string,
): Record<string, { date: string; wrapped: boolean }> {
  const start = new Date(startDate + "T00:00:00Z");
  const startDayIdx = start.getUTCDay();
  const result: Record<string, { date: string; wrapped: boolean }> = {};
  for (let i = 0; i < 7; i++) {
    const offset = i >= startDayIdx ? i - startDayIdx : 7 - startDayIdx + i;
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + offset);
    result[SESSION_DAYS[i]] = {
      date: d.toISOString().slice(0, 10),
      wrapped: i < startDayIdx,
    };
  }
  return result;
}

export function navigationFloor(registrationDate: string): string {
  return weekBoundaries(registrationDate).monday;
}
