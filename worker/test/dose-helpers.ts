import type { Dose, DoseRepository } from "../doses";

export function makeInMemoryDoseRepo(): DoseRepository {
  const doses: Dose[] = [];
  return {
    async createDose(dose) {
      doses.push(dose);
    },
    async listDoses(patientId, start, end) {
      return doses.filter(
        (d) =>
          d.patientId === patientId &&
          d.scheduledAt.slice(0, 10) >= start &&
          d.scheduledAt.slice(0, 10) <= end,
      );
    },
  };
}
