import type {
  FillSessionProgress,
  FillSessionProgressRepository,
} from "../fill-session-progress";

export function makeInMemoryFillSessionProgressRepo(): FillSessionProgressRepository {
  const byPatient = new Map<string, FillSessionProgress>();
  return {
    async upsertProgress(progress) {
      byPatient.set(progress.patientId, progress);
    },
    async getProgress(patientId) {
      return byPatient.get(patientId) ?? null;
    },
    async deleteProgress(patientId) {
      byPatient.delete(patientId);
    },
  };
}
