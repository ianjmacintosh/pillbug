import type { Prescription, DayOfWeek } from "./prescriptions";
import type { Dose, DoseStatus } from "./doses";

export interface ScheduledDose {
  prescriptionId: string;
  drugName: string;
  dosage: string;
  scheduledAt: string;
  actionable: boolean;
  resolvedDose: { id: string; status: DoseStatus } | null;
}

const DAY_NAMES: DayOfWeek[] = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

export function scheduledDoses(
  prescriptions: Prescription[],
  weekStart: string,
  weekEnd: string,
  today: string,
  loggedDoses: Dose[],
): ScheduledDose[] {
  const result: ScheduledDose[] = [];
  const active = prescriptions.filter((rx) => rx.status === "active");

  const start = new Date(weekStart + "T00:00:00Z");
  const end = new Date(weekEnd + "T00:00:00Z");

  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    const dateStr = d.toISOString().slice(0, 10);
    const dayName = DAY_NAMES[d.getUTCDay()];

    for (const rx of active) {
      if (dateStr < rx.startDate) continue;
      if (rx.endDate && dateStr > rx.endDate) continue;

      const times = rx.schedule.days[dayName] ?? [];
      for (const time of times) {
        const scheduledAt = `${dateStr}T${time}:00Z`;
        const actionable = dateStr <= today;
        const match = loggedDoses.find(
          (dose) =>
            dose.prescriptionId === rx.id && dose.scheduledAt === scheduledAt,
        );
        result.push({
          prescriptionId: rx.id,
          drugName: rx.drugName,
          dosage: rx.dosage,
          scheduledAt,
          actionable,
          resolvedDose: match ? { id: match.id, status: match.status } : null,
        });
      }
    }
  }

  return result;
}
