import type { Artifact, GenerationRequest, SourceSnapshot } from "@classmate/contracts";

export type OperationState =
  | { status: "queued"; queuedAt: string }
  | { status: "preparing"; startedAt: string }
  | { status: "streaming"; startedAt: string; lastSequence: number; partialText: string }
  | { status: "cancelling"; requestedAt: string }
  | { status: "completed"; completedAt: string; artifactId: string }
  | { status: "cancelled"; completedAt: string }
  | { status: "failed"; completedAt: string; errorCode: string }
  | { status: "incomplete"; updatedAt: string; partialText: string };

export interface ArtifactRepository {
  save(artifact: Artifact): Promise<void>;
  get(id: string): Promise<Artifact | undefined>;
  list(query?: string): Promise<readonly Artifact[]>;
  delete(id: string): Promise<void>;
}
export interface SourceRepository { save(source: SourceSnapshot): Promise<void>; get(id: string): Promise<SourceSnapshot | undefined>; }
export interface OperationRepository { saveIntent(request: GenerationRequest): Promise<void>; update(id: string, state: OperationState): Promise<void>; }

export function canTransition(from: OperationState["status"], to: OperationState["status"]): boolean {
  const transitions: Readonly<Record<OperationState["status"], readonly OperationState["status"][]>> = {
    queued: ["preparing", "failed"], preparing: ["streaming", "failed"], streaming: ["completed", "cancelling", "failed", "incomplete"],
    cancelling: ["cancelled"], completed: [], cancelled: [], failed: [], incomplete: []
  };
  return transitions[from].includes(to);
}

export function classifyReview(quality: "again" | "hard" | "good" | "easy", previousIntervalDays: number): number {
  const base = Math.max(1, previousIntervalDays);
  if (quality === "again") return 1;
  if (quality === "hard") return Math.max(1, Math.round(base * 1.2));
  if (quality === "good") return Math.round(base * 2.5);
  return Math.round(base * 4);
}
