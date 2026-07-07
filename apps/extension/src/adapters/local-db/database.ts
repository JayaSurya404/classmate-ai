import type { Artifact, GenerationRequest, SourceSnapshot } from "@classmate/contracts";
import type { OperationState } from "@classmate/domain";
import Dexie, { type EntityTable } from "dexie";
import { z } from "zod";

export interface StoredOperation { id: string; request: GenerationRequest; state: OperationState; updatedAt: string; }
export interface VersionedLocalRecord { id: string; schemaVersion: number; updatedAt: string; payload: unknown; }
export interface QuarantinedRecord { id: string; storeName: string; reason: string; quarantinedAt: string; payload: unknown; }
const VersionedLocalRecordSchema = z.object({ id: z.string().min(1), schemaVersion: z.number().int().positive(), updatedAt: z.string().datetime(), payload: z.unknown() });
class ClassMateDatabase extends Dexie {
  sources!: EntityTable<SourceSnapshot, "id">; artifacts!: EntityTable<Artifact, "id">; operations!: EntityTable<StoredOperation, "id">;
  revisions!: EntityTable<VersionedLocalRecord, "id">; threads!: EntityTable<VersionedLocalRecord, "id">; messages!: EntityTable<VersionedLocalRecord, "id">; practiceItems!: EntityTable<VersionedLocalRecord, "id">; attempts!: EntityTable<VersionedLocalRecord, "id">; outbox!: EntityTable<VersionedLocalRecord, "id">; syncMeta!: EntityTable<VersionedLocalRecord, "id">; searchIndex!: EntityTable<VersionedLocalRecord, "id">; quarantine!: EntityTable<QuarantinedRecord, "id">;
  constructor() { super("classmate-ai-v1"); this.version(1).stores({ sources: "id, capturedAt, sourceType, contentHash", artifacts: "id, createdAt, type, title, *sourceIds", operations: "id, updatedAt, state.status" }); this.version(2).stores({ sources: "id, capturedAt, sourceType, contentHash", artifacts: "id, createdAt, type, title, *sourceIds", operations: "id, updatedAt, state.status", revisions: "id, updatedAt, schemaVersion", threads: "id, updatedAt, schemaVersion", messages: "id, updatedAt, schemaVersion", practiceItems: "id, updatedAt, schemaVersion", attempts: "id, updatedAt, schemaVersion", outbox: "id, updatedAt, schemaVersion", syncMeta: "id, updatedAt, schemaVersion", searchIndex: "id, updatedAt, schemaVersion", quarantine: "id, storeName, quarantinedAt" }); }
}
export const database = new ClassMateDatabase();
export const localRepositories = {
  sources: { save: async (source: SourceSnapshot) => { await database.sources.put(source); }, get: async (id: string) => database.sources.get(id) },
  artifacts: { save: async (artifact: Artifact) => { await database.artifacts.put(artifact); }, get: async (id: string) => database.artifacts.get(id), list: async (query?: string) => { const values = await database.artifacts.orderBy("createdAt").reverse().toArray(); return query ? values.filter((item) => `${item.title} ${item.markdown}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())) : values; }, delete: async (id: string) => { await database.artifacts.delete(id); } },
  operations: { saveIntent: async (request: GenerationRequest) => { await database.operations.put({ id: request.operationId, request, state: { status: "queued", queuedAt: new Date().toISOString() }, updatedAt: new Date().toISOString() }); }, update: async (id: string, state: OperationState) => { await database.operations.update(id, { state, updatedAt: new Date().toISOString() }); } }
};
export async function readVersionedRecord(table: EntityTable<VersionedLocalRecord, "id">, id: string): Promise<VersionedLocalRecord | undefined> { const raw: unknown = await table.get(id); if (raw === undefined) return undefined; const parsed = VersionedLocalRecordSchema.safeParse(raw); if (parsed.success) return parsed.data; await database.quarantine.put({ id: crypto.randomUUID(), storeName: table.name, reason: "SCHEMA_VALIDATION_FAILED", quarantinedAt: new Date().toISOString(), payload: raw }); await table.delete(id); return undefined; }
