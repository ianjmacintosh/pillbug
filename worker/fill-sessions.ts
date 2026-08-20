export interface FillSession {
  id: string;
  patientId: string;
  completedAt: string;
}

export interface FillSessionRepository {
  createFillSession(fillSession: FillSession): Promise<void>;
  findLastCompletedAt(patientId: string): Promise<string | null>;
}
