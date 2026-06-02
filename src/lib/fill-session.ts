const HH_MM = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface Compartment {
  label: string;
  startTime: string;
  endTime: string;
}

export const ONE_COMPARTMENT: Compartment[] = [
  { label: "Daily", startTime: "00:00", endTime: "23:59" },
];

export const TWO_COMPARTMENTS: Compartment[] = [
  { label: "AM", startTime: "00:00", endTime: "11:59" },
  { label: "PM", startTime: "12:00", endTime: "23:59" },
];

export const FOUR_COMPARTMENTS: Compartment[] = [
  { label: "AM", startTime: "00:00", endTime: "05:59" },
  { label: "Noon", startTime: "06:00", endTime: "11:59" },
  { label: "PM", startTime: "12:00", endTime: "17:59" },
  { label: "Bedtime", startTime: "18:00", endTime: "23:59" },
];

export interface Schedule {
  days: Partial<Record<string, { time: string; quantity: number }[]>>;
}

export function pillsNeeded(schedule: Schedule, spanDays: number): number {
  const weeks = spanDays / 7;
  let total = 0;
  for (const slots of Object.values(schedule.days)) {
    if (!slots) continue;
    for (const slot of slots) {
      total += slot.quantity * weeks;
    }
  }
  return total;
}

export function resolveCompartmentLabel(
  time: string,
  compartments: Compartment[],
): string {
  if (!HH_MM.test(time)) throw new Error(`invalid time: ${time}`);

  for (const c of compartments) {
    if (!HH_MM.test(c.startTime))
      throw new Error(`invalid compartment startTime: ${c.startTime}`);
    if (!HH_MM.test(c.endTime))
      throw new Error(`invalid compartment endTime: ${c.endTime}`);

    const wraps = c.endTime < c.startTime;
    const matches = wraps
      ? time >= c.startTime || time <= c.endTime
      : time >= c.startTime && time <= c.endTime;

    if (matches) return c.label;
  }

  throw new Error(
    `time ${time} does not match any compartment (invalid config)`,
  );
}
