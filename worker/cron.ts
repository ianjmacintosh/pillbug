import type { AuthRepository } from "./auth";

// A patient is stale when: created_at + 7 days <= scheduledTime
// Equivalently: created_at <= cutoffDate (where cutoffDate = scheduledTime - 7 days)
// Example: created May 9, cron fires May 16 → May 9 + 7 = May 16 ≤ May 16 → delete
//          created May 10, cron fires May 16 → May 10 + 7 = May 17 > May 16 → retain
export async function deleteStaleUnverifiedPatients(
  repo: AuthRepository,
  cutoffDate: string,
): Promise<void> {
  const patients = await repo.findUnverifiedPatientsBefore(cutoffDate);
  for (const { id } of patients) {
    await repo.deletePatient(id);
  }
}

export async function deleteExpiredTokens(
  repo: AuthRepository,
  now: string,
): Promise<void> {
  await repo.deleteExpiredAndUsedTokens(now);
}
