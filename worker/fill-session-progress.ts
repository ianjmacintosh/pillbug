const VALID_STEPS = ["step1", "step2", "step3", "step4", "step5"];

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

export function isValidStep(s: unknown): s is string {
  return typeof s === "string" && VALID_STEPS.includes(s);
}

export interface FillSessionProgress {
  patientId: string;
  step: string;
  organizerType: string;
  startDate: string;
  currentIndex: number;
  updatedAt: string;
}

export interface FillSessionProgressRepository {
  upsertProgress(progress: FillSessionProgress): Promise<void>;
  getProgress(patientId: string): Promise<FillSessionProgress | null>;
  deleteProgress(patientId: string): Promise<void>;
}

export function isStale(progress: FillSessionProgress, now: Date): boolean {
  return (
    now.getTime() - new Date(progress.updatedAt).getTime() > STALE_AFTER_MS
  );
}

export async function getFreshProgress(
  patientId: string,
  repo: FillSessionProgressRepository,
  now: Date = new Date(),
): Promise<FillSessionProgress | null> {
  const progress = await repo.getProgress(patientId);
  if (!progress || isStale(progress, now)) return null;
  return progress;
}
