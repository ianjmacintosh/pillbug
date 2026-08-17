import type { FillSession, FillSessionRepository } from "../fill-sessions";

export function makeInMemoryFillSessionRepo(): FillSessionRepository {
  const fillSessions: FillSession[] = [];
  return {
    async createFillSession(fillSession) {
      fillSessions.push(fillSession);
    },
    async findLastCompletedAt(patientId) {
      const completedAts = fillSessions
        .filter((f) => f.patientId === patientId)
        .map((f) => f.completedAt);
      if (completedAts.length === 0) return null;
      return completedAts.sort().at(-1)!;
    },
  };
}
