export function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatMonthDay(dateStr: string, locale: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatShortDate(dateStr: string, locale: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString(locale, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatDate(dateStr: string, locale: string): string {
  return new Date(dateStr + "T00:00:00Z").toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatTimeOfDay(time: string, locale: string): string {
  const [hours, minutes] = time.split(":");
  const d = new Date(2000, 0, 1, parseInt(hours, 10), parseInt(minutes, 10));
  return d.toLocaleTimeString(locale, { hour: "numeric", minute: "2-digit" });
}

export function formatTime(
  scheduledAt: string,
  timezone: string,
  locale: string,
): string {
  return new Date(scheduledAt).toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  });
}
