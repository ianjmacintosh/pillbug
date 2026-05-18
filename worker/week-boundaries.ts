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
