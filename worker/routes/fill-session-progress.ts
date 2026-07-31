import { getFreshProgress, isValidStep } from "../fill-session-progress";
import { json, type Repos } from "../session";
import type { Env } from "../env";

export async function handleGetFillSessionProgress(
  _request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const progress = await getFreshProgress(patientId, repos.fillSessionProgress);
  if (!progress) return json({ ok: true, progress: null });
  return json({
    ok: true,
    progress: {
      step: progress.step,
      organizerType: progress.organizerType,
      startDate: progress.startDate,
      currentIndex: progress.currentIndex,
      updatedAt: progress.updatedAt,
    },
  });
}

export async function handlePutFillSessionProgress(
  request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  const body = await request.json<Record<string, unknown>>();
  if (!isValidStep(body.step)) return json({ error: "invalid_step" }, 422);
  if (typeof body.organizerType !== "string" || !body.organizerType) {
    return json({ error: "invalid_organizer_type" }, 422);
  }
  if (typeof body.startDate !== "string" || !body.startDate) {
    return json({ error: "invalid_start_date" }, 422);
  }
  const currentIndex = Number(body.currentIndex);
  if (!Number.isInteger(currentIndex) || currentIndex < 0) {
    return json({ error: "invalid_current_index" }, 422);
  }
  await repos.fillSessionProgress.upsertProgress({
    patientId,
    step: body.step,
    organizerType: body.organizerType,
    startDate: body.startDate,
    currentIndex,
    updatedAt: new Date().toISOString(),
  });
  return json({ ok: true });
}

export async function handleDeleteFillSessionProgress(
  _request: Request,
  _env: Env,
  repos: Repos,
  patientId: string,
): Promise<Response> {
  await repos.fillSessionProgress.deleteProgress(patientId);
  return json({ ok: true });
}
