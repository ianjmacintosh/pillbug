import type { Schedule } from "./schedule";

export type { Schedule };

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

export const THREE_COMPARTMENTS: Compartment[] = [
  { label: "Morn", startTime: "00:00", endTime: "11:59" },
  { label: "Noon", startTime: "12:00", endTime: "17:59" },
  { label: "Night", startTime: "18:00", endTime: "23:59" },
];

export const FOUR_COMPARTMENTS: Compartment[] = [
  { label: "Morn", startTime: "00:00", endTime: "05:59" },
  { label: "Noon", startTime: "06:00", endTime: "11:59" },
  { label: "Eve", startTime: "12:00", endTime: "17:59" },
  { label: "Bed", startTime: "18:00", endTime: "23:59" },
];

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

const WEEK_DAYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export interface MedicineSlot {
  compartmentLabel: string;
  quantities: Partial<Record<string, number>>;
  weeklyTotal: number;
}

export interface MedicineCard {
  drugName: string;
  dosage: string;
  slots: MedicineSlot[];
  weeklyTotal: number;
}

export function medicineCardKey(card: {
  drugName: string;
  dosage: string;
}): string {
  return `${card.drugName}-${card.dosage}`;
}

export function groupByMedicine(
  prescriptions: Array<{
    drugName: string;
    dosage: string;
    schedule: Schedule;
  }>,
  compartments: Compartment[],
): MedicineCard[] {
  const cardMap = new Map<string, MedicineCard>();

  for (const rx of prescriptions) {
    const key = `${rx.drugName}||${rx.dosage}`;
    if (!cardMap.has(key)) {
      cardMap.set(key, {
        drugName: rx.drugName,
        dosage: rx.dosage,
        slots: compartments.map((c) => ({
          compartmentLabel: c.label,
          quantities: {},
          weeklyTotal: 0,
        })),
        weeklyTotal: 0,
      });
    }
    const card = cardMap.get(key)!;

    for (const dayName of WEEK_DAYS) {
      const timeSlots = rx.schedule.days[dayName] ?? [];
      for (const timeSlot of timeSlots) {
        let label: string;
        try {
          label = resolveCompartmentLabel(timeSlot.time, compartments);
        } catch {
          continue;
        }
        const medicineSlot = card.slots.find(
          (s) => s.compartmentLabel === label,
        );
        if (!medicineSlot) continue;
        medicineSlot.quantities[dayName] =
          (medicineSlot.quantities[dayName] ?? 0) + timeSlot.quantity;
        medicineSlot.weeklyTotal += timeSlot.quantity;
        card.weeklyTotal += timeSlot.quantity;
      }
    }
  }

  return Array.from(cardMap.values());
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
