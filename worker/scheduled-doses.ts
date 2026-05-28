import type { Prescription, DayOfWeek } from "./prescriptions";
import type { Dose, DoseStatus } from "./doses";

export interface ScheduledDose {
  prescriptionId: string;
  drugName: string;
  dosage: string;
  quantity: number;
  doseForm: string;
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

function localToUtc(
  dateStr: string,
  timeStr: string,
  timezone: string,
): string {
  const guessUtc = new Date(`${dateStr}T${timeStr}:00Z`);
  const localRepr = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(guessUtc)
    .replace(" ", "T");
  const offsetMs = guessUtc.getTime() - new Date(localRepr + "Z").getTime();
  return new Date(guessUtc.getTime() + offsetMs).toISOString();
}

export function scheduledDoses(
  prescriptions: Prescription[],
  weekStart: string,
  weekEnd: string,
  today: string,
  loggedDoses: Dose[],
  patientTimezone = "UTC",
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

      const slots = rx.schedule.days[dayName] ?? [];
      for (const slot of slots) {
        const scheduledAt = localToUtc(dateStr, slot.time, patientTimezone);
        const actionable = dateStr <= today;
        const match = loggedDoses.find(
          (dose) =>
            dose.prescriptionId === rx.id && dose.scheduledAt === scheduledAt,
        );
        result.push({
          prescriptionId: rx.id,
          drugName: rx.drugName,
          dosage: rx.dosage,
          quantity: slot.quantity,
          doseForm: rx.doseForm,
          scheduledAt,
          actionable,
          resolvedDose: match ? { id: match.id, status: match.status } : null,
        });
      }
    }
  }

  return result;
}
