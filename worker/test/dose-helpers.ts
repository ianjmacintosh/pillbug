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
    async updateDoseStatus(id, patientId, status) {
      const dose = doses.find((d) => d.id === id && d.patientId === patientId);
      if (!dose) return null;
      dose.status = status;
      return dose;
    },
  };
}
