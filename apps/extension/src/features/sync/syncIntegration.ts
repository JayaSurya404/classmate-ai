import { SyncCollaborationService } from "@classmate/learning-tools";
import type { SyncDevice, SyncEntityType, SyncOperation, VersionSnapshot } from "@classmate/contracts";
import { localRepositories } from "../../adapters/local-db/database";

export const LOCAL_SYNC_DEVICE: SyncDevice = {
  id: "00000000-0000-4000-8000-000000000013",
  name: "This device",
  lastSeenAt: new Date().toISOString(),
};

export async function recordEntityChange(args: {
  entityType: SyncEntityType;
  entityId: string;
  before?: Record<string, unknown> | undefined;
  after: Record<string, unknown>;
  operation?: SyncOperation["operation"] | undefined;
  label?: string | undefined;
}): Promise<{ operation: SyncOperation; snapshot: VersionSnapshot }> {
  await localRepositories.syncDevices.save({ ...LOCAL_SYNC_DEVICE, lastSeenAt: new Date().toISOString() });
  const previousSnapshots = await localRepositories.versionSnapshots.listByEntity(args.entityId);
  const previous = previousSnapshots.at(-1);
  const snapshot = SyncCollaborationService.snapshot({
    entityType: args.entityType,
    entityId: args.entityId,
    payload: args.after,
    authorDeviceId: LOCAL_SYNC_DEVICE.id,
    parentVersionId: previous?.id,
    label: args.label,
  });
  const operation = SyncCollaborationService.trackChange({
    entityType: args.entityType,
    entityId: args.entityId,
    operation: args.operation ?? "update",
    before: args.before,
    after: args.after,
    deviceId: LOCAL_SYNC_DEVICE.id,
    baseVersionId: previous?.id,
  });
  await Promise.all([
    localRepositories.versionSnapshots.save(snapshot),
    localRepositories.syncQueue.save(operation),
    localRepositories.activityFeed.save(SyncCollaborationService.activity({
      actorId: LOCAL_SYNC_DEVICE.id,
      verb: args.operation === "delete" ? "deleted" : "updated",
      entityType: args.entityType,
      entityId: args.entityId,
      summary: `${args.entityType.replace(/_/g, " ")} queued for sync.`,
    })),
  ]);
  return { operation, snapshot };
}

export async function backupAllVersions(label = "ClassMate backup"): Promise<string> {
  const versions = await localRepositories.versionSnapshots.list();
  const backup = SyncCollaborationService.backup(versions);
  await localRepositories.backupMetadata.save(SyncCollaborationService.backupMetadata(label, backup, versions.length));
  return backup;
}
