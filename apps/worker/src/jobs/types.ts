export type JobState = "queued" | "running" | "ready" | "failed";

export type Job = {
  id: string;
  tenant_id: string;
  type: string;
  state: JobState;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  attempts: number;
  created_at: string;
  updated_at: string;
};
