import { describe, expect, it } from "vitest";
import { SyncCollaborationService } from "./sync-collaboration";

const device = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Laptop",
  lastSeenAt: "2026-01-01T00:00:00.000Z",
};

describe("SyncCollaborationService", () => {
  it("tracks changes and builds an incremental retry queue", () => {
    const operation = SyncCollaborationService.trackChange({
      entityType: "note",
      entityId: "22222222-2222-4222-8222-222222222222",
      operation: "update",
      before: { title: "Old", body: "Same" },
      after: { title: "New", body: "Same" },
      deviceId: device.id,
    });
    const failed = SyncCollaborationService.markFailed(operation, "network unavailable");
    const queue = SyncCollaborationService.incrementalQueue([SyncCollaborationService.markAcked(operation), failed]);

    expect(operation.delta).toHaveLength(1);
    expect(failed.retryCount).toBe(1);
    expect(queue[0]?.status).toBe("failed");
  });

  it("merges compatible records and detects conflicts", () => {
    const base = SyncCollaborationService.snapshot({
      entityType: "note",
      entityId: "33333333-3333-4333-8333-333333333333",
      payload: { title: "Base", body: "Original", tags: ["a"] },
      authorDeviceId: device.id,
    });
    const local = SyncCollaborationService.snapshot({
      entityType: "note",
      entityId: base.entityId,
      parentVersionId: base.id,
      payload: { title: "Local", body: "Original", tags: ["a"] },
      authorDeviceId: device.id,
    });
    const remote = SyncCollaborationService.snapshot({
      entityType: "note",
      entityId: base.entityId,
      parentVersionId: base.id,
      payload: { title: "Remote", body: "Changed remotely", tags: ["a"] },
      authorDeviceId: "44444444-4444-4444-8444-444444444444",
    });
    const operation = SyncCollaborationService.trackChange({
      entityType: "note",
      entityId: base.entityId,
      operation: "update",
      before: base.payload as Record<string, unknown>,
      after: local.payload as Record<string, unknown>,
      deviceId: device.id,
      baseVersionId: base.id,
    });
    const conflict = SyncCollaborationService.detectConflict({ operation, baseVersion: base, localVersion: local, remoteVersion: remote });

    expect(SyncCollaborationService.compareVersions(base, remote).changed).toContain("title");
    expect(conflict?.fields).toContain("title");
    expect(conflict ? SyncCollaborationService.resolveConflict(conflict, "merge").status : "open").toBe("resolved");
  });

  it("creates shared workspaces, invites collaborators, comments, activity, backup and restore", () => {
    const workspace = SyncCollaborationService.createSharedWorkspace({
      title: "Group Study",
      entityType: "workspace",
      entityIds: ["55555555-5555-4555-8555-555555555555"],
      ownerName: "Owner",
    });
    const shared = SyncCollaborationService.inviteCollaborator(workspace, "Peer", "editor");
    const comment = SyncCollaborationService.addComment({
      workspaceId: shared.id,
      authorId: shared.collaborators[0]?.id ?? "66666666-6666-4666-8666-666666666666",
      body: "Review this chapter.",
    });
    const activity = SyncCollaborationService.activity({
      workspaceId: shared.id,
      actorId: comment.authorId,
      verb: "commented",
      entityType: "workspace",
      entityId: shared.id,
      summary: "Peer commented.",
    });
    const snapshot = SyncCollaborationService.snapshot({
      entityType: "workspace",
      entityId: shared.id,
      payload: shared,
      authorDeviceId: device.id,
    });
    const backup = SyncCollaborationService.backup([snapshot]);
    const metadata = SyncCollaborationService.backupMetadata("Manual backup", backup, 1);
    const restored = SyncCollaborationService.restore(backup);

    expect(shared.collaborators).toHaveLength(2);
    expect(comment.body).toContain("Review");
    expect(activity.verb).toBe("commented");
    expect(metadata.recordCount).toBe(1);
    expect(metadata.byteSize).toBeGreaterThan(0);
    expect(restored[0]?.entityId).toBe(shared.id);
  });
});
