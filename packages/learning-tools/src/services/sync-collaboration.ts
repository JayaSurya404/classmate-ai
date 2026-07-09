import {
  ActivityFeedEventSchema,
  BackupMetadataSchema,
  CollaborationCommentSchema,
  SharedWorkspaceSchema,
  SyncConflictSchema,
  SyncMetadataSchema,
  SyncOperationSchema,
  VersionSnapshotSchema,
  type ActivityFeedEvent,
  type BackupMetadata,
  type CollaborationComment,
  type CollaborationRole,
  type SharedWorkspace,
  type SyncConflict,
  type SyncDelta,
  type SyncDevice,
  type SyncEntityType,
  type SyncMetadata,
  type SyncOperation,
  type SyncOperationType,
  type VersionSnapshot,
} from "@classmate/contracts";

export interface ChangeInput {
  entityType: SyncEntityType;
  entityId: string;
  operation: SyncOperationType;
  before?: Record<string, unknown> | undefined;
  after?: Record<string, unknown> | undefined;
  deviceId: string;
  baseVersionId?: string | undefined;
}

export interface MergeResult {
  merged: Record<string, unknown>;
  conflictFields: readonly string[];
}

export interface VersionComparison {
  added: readonly string[];
  removed: readonly string[];
  changed: readonly string[];
}

export class SyncCollaborationService {
  static createMetadata(device: SyncDevice): SyncMetadata {
    return SyncMetadataSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      deviceId: device.id,
      online: false,
      pendingCount: 0,
      conflictCount: 0,
      updatedAt: new Date().toISOString(),
    });
  }

  static trackChange(input: ChangeInput): SyncOperation {
    const now = new Date().toISOString();
    const delta = diffRecords(input.before ?? {}, input.after ?? {});
    return SyncOperationSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      entityType: input.entityType,
      entityId: input.entityId,
      operation: input.operation,
      baseVersionId: input.baseVersionId,
      delta,
      status: "pending",
      retryCount: 0,
      deviceId: input.deviceId,
      createdAt: now,
      updatedAt: now,
    });
  }

  static incrementalQueue(operations: readonly SyncOperation[]): SyncOperation[] {
    return operations
      .filter((operation) => operation.status === "pending" || operation.status === "failed")
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  }

  static markSyncing(operation: SyncOperation): SyncOperation {
    return SyncOperationSchema.parse({ ...operation, status: "syncing", updatedAt: new Date().toISOString() });
  }

  static markAcked(operation: SyncOperation, remoteVersionId?: string): SyncOperation {
    return SyncOperationSchema.parse({
      ...operation,
      status: "acked",
      remoteVersionId,
      updatedAt: new Date().toISOString(),
      lastError: undefined,
    });
  }

  static markFailed(operation: SyncOperation, error: string): SyncOperation {
    return SyncOperationSchema.parse({
      ...operation,
      status: "failed",
      retryCount: operation.retryCount + 1,
      updatedAt: new Date().toISOString(),
      lastError: error,
    });
  }

  static mergeRecords(
    base: Record<string, unknown>,
    local: Record<string, unknown>,
    remote: Record<string, unknown>,
  ): MergeResult {
    const keys = new Set([...Object.keys(base), ...Object.keys(local), ...Object.keys(remote)]);
    const merged: Record<string, unknown> = {};
    const conflictFields: string[] = [];
    for (const key of keys) {
      const baseValue = base[key];
      const localValue = local[key];
      const remoteValue = remote[key];
      const localChanged = !sameValue(baseValue, localValue);
      const remoteChanged = !sameValue(baseValue, remoteValue);
      if (localChanged && remoteChanged && !sameValue(localValue, remoteValue)) {
        conflictFields.push(key);
        merged[key] = localValue;
      } else if (remoteChanged) {
        merged[key] = remoteValue;
      } else {
        merged[key] = localValue;
      }
    }
    return { merged, conflictFields };
  }

  static detectConflict(args: {
    operation: SyncOperation;
    localVersion: VersionSnapshot;
    remoteVersion: VersionSnapshot;
    baseVersion?: VersionSnapshot | undefined;
  }): SyncConflict | undefined {
    const base = toRecord(args.baseVersion?.payload);
    const local = toRecord(args.localVersion.payload);
    const remote = toRecord(args.remoteVersion.payload);
    const fields = SyncCollaborationService.mergeRecords(base, local, remote).conflictFields;
    if (fields.length === 0) return undefined;
    return SyncConflictSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      operationId: args.operation.id,
      entityType: args.operation.entityType,
      entityId: args.operation.entityId,
      localVersionId: args.localVersion.id,
      remoteVersionId: args.remoteVersion.id,
      baseVersionId: args.baseVersion?.id,
      fields,
      status: "open",
      createdAt: new Date().toISOString(),
    });
  }

  static resolveConflict(conflict: SyncConflict, resolution: SyncConflict["resolution"]): SyncConflict {
    return SyncConflictSchema.parse({
      ...conflict,
      status: "resolved",
      resolution,
      resolvedAt: new Date().toISOString(),
    });
  }

  static snapshot(args: {
    entityType: SyncEntityType;
    entityId: string;
    payload: unknown;
    authorDeviceId: string;
    parentVersionId?: string | undefined;
    label?: string | undefined;
  }): VersionSnapshot {
    return VersionSnapshotSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      entityType: args.entityType,
      entityId: args.entityId,
      parentVersionId: args.parentVersionId,
      payload: args.payload,
      hash: stableHash(args.payload),
      label: args.label,
      authorDeviceId: args.authorDeviceId,
      createdAt: new Date().toISOString(),
    });
  }

  static compareVersions(left: VersionSnapshot, right: VersionSnapshot): VersionComparison {
    const leftRecord = toRecord(left.payload);
    const rightRecord = toRecord(right.payload);
    const keys = new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)]);
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];
    for (const key of keys) {
      if (!(key in leftRecord)) added.push(key);
      else if (!(key in rightRecord)) removed.push(key);
      else if (!sameValue(leftRecord[key], rightRecord[key])) changed.push(key);
    }
    return { added, removed, changed };
  }

  static createSharedWorkspace(args: {
    title: string;
    entityType: SyncEntityType;
    entityIds: readonly string[];
    ownerName: string;
  }): SharedWorkspace {
    const now = new Date().toISOString();
    return SharedWorkspaceSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title: args.title,
      entityType: args.entityType,
      entityIds: [...args.entityIds],
      collaborators: [{
        id: crypto.randomUUID(),
        displayName: args.ownerName,
        role: "owner",
        invitedAt: now,
        acceptedAt: now,
      }],
      createdAt: now,
      updatedAt: now,
    });
  }

  static inviteCollaborator(workspace: SharedWorkspace, displayName: string, role: CollaborationRole): SharedWorkspace {
    return SharedWorkspaceSchema.parse({
      ...workspace,
      collaborators: [...workspace.collaborators, { id: crypto.randomUUID(), displayName, role, invitedAt: new Date().toISOString() }],
      updatedAt: new Date().toISOString(),
    });
  }

  static addComment(args: {
    workspaceId: string;
    authorId: string;
    body: string;
    entityId?: string | undefined;
  }): CollaborationComment {
    return CollaborationCommentSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      workspaceId: args.workspaceId,
      entityId: args.entityId,
      authorId: args.authorId,
      body: args.body,
      createdAt: new Date().toISOString(),
    });
  }

  static activity(args: {
    actorId: string;
    verb: ActivityFeedEvent["verb"];
    entityType: SyncEntityType;
    entityId: string;
    summary: string;
    workspaceId?: string | undefined;
  }): ActivityFeedEvent {
    return ActivityFeedEventSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      workspaceId: args.workspaceId,
      actorId: args.actorId,
      verb: args.verb,
      entityType: args.entityType,
      entityId: args.entityId,
      summary: args.summary,
      createdAt: new Date().toISOString(),
    });
  }

  static backup(records: readonly VersionSnapshot[]): string {
    return JSON.stringify({ schemaVersion: 1, exportedAt: new Date().toISOString(), records }, null, 2);
  }

  static backupMetadata(label: string, backupJson: string, recordCount: number): BackupMetadata {
    return BackupMetadataSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      label,
      recordCount,
      byteSize: new Blob([backupJson]).size,
      createdAt: new Date().toISOString(),
    });
  }

  static restore(backupJson: string): VersionSnapshot[] {
    const parsed: unknown = JSON.parse(backupJson);
    if (typeof parsed !== "object" || parsed === null || !("records" in parsed) || !Array.isArray(parsed.records)) return [];
    return parsed.records.map((record: unknown) => VersionSnapshotSchema.parse(record));
  }
}

function diffRecords(before: Record<string, unknown>, after: Record<string, unknown>): SyncDelta[] {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys]
    .filter((key) => !sameValue(before[key], after[key]))
    .map((key) => ({ path: key, before: before[key], after: after[key] }));
}

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

function stableHash(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) hash = Math.imul(31, hash) + text.charCodeAt(index);
  return `sync-${Math.abs(hash).toString(16).padStart(16, "0")}`;
}
