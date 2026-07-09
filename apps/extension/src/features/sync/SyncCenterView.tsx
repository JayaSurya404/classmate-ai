import { motion } from "framer-motion";
import { Activity, AlertTriangle, Cloud, GitCompare, MessageSquare, RotateCcw, Share2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { SyncCollaborationService } from "@classmate/learning-tools";
import { Badge, Button, Card, Input, Select, Textarea, cn } from "@classmate/ui";
import type { ActivityFeedEvent, CollaborationComment, SharedWorkspace, SyncConflict, SyncMetadata, SyncOperation, VersionSnapshot } from "@classmate/contracts";
import { localRepositories } from "../../adapters/local-db/database";
import { LOCAL_SYNC_DEVICE, backupAllVersions } from "./syncIntegration";

export type SyncPanelMode = "sync" | "collaboration" | "activity" | "versions" | "conflicts";

export interface SyncCenterViewProps {
  initialMode: SyncPanelMode;
}

export function SyncCenterView({ initialMode }: SyncCenterViewProps) {
  const [mode, setMode] = useState<SyncPanelMode>(initialMode);
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [versions, setVersions] = useState<VersionSnapshot[]>([]);
  const [workspaces, setWorkspaces] = useState<SharedWorkspace[]>([]);
  const [comments, setComments] = useState<CollaborationComment[]>([]);
  const [activity, setActivity] = useState<ActivityFeedEvent[]>([]);
  const [metadata, setMetadata] = useState<SyncMetadata | undefined>();
  const [inviteName, setInviteName] = useState("");
  const [commentBody, setCommentBody] = useState("");
  const [status, setStatus] = useState("Sync Center ready.");
  const pending = useMemo(() => SyncCollaborationService.incrementalQueue(operations), [operations]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  useEffect(() => {
    void load();
  }, []);

  const load = async (): Promise<void> => {
    const [storedOperations, storedConflicts, storedVersions, storedWorkspaces, storedActivity, storedMetadata] = await Promise.all([
      localRepositories.syncQueue.list(),
      localRepositories.syncConflicts.list(),
      localRepositories.versionSnapshots.list(),
      localRepositories.sharedWorkspaces.list(),
      localRepositories.activityFeed.list(),
      localRepositories.syncMetadata.latest(),
    ]);
    setOperations(storedOperations);
    setConflicts(storedConflicts);
    setVersions(storedVersions);
    setWorkspaces(storedWorkspaces);
    setActivity(storedActivity);
    setMetadata(storedMetadata);
    const workspace = storedWorkspaces[0];
    setComments(workspace ? await localRepositories.collaborationComments.listByWorkspace(workspace.id) : []);
  };

  const createWorkspace = async (): Promise<void> => {
    const workspace = SyncCollaborationService.createSharedWorkspace({
      title: "Shared Study Workspace",
      entityType: "workspace",
      entityIds: [],
      ownerName: "You",
    });
    await Promise.all([
      localRepositories.sharedWorkspaces.save(workspace),
      localRepositories.activityFeed.save(SyncCollaborationService.activity({
        workspaceId: workspace.id,
        actorId: workspace.collaborators[0]?.id ?? LOCAL_SYNC_DEVICE.id,
        verb: "shared",
        entityType: "workspace",
        entityId: workspace.id,
        summary: "Shared workspace created.",
      })),
    ]);
    setStatus("Shared workspace created.");
    await load();
  };

  const invite = async (): Promise<void> => {
    const workspace = workspaces[0];
    const trimmed = inviteName.trim();
    if (!workspace || !trimmed) return;
    const next = SyncCollaborationService.inviteCollaborator(workspace, trimmed, "editor");
    await Promise.all([
      localRepositories.sharedWorkspaces.save(next),
      localRepositories.activityFeed.save(SyncCollaborationService.activity({
        workspaceId: next.id,
        actorId: next.collaborators[0]?.id ?? LOCAL_SYNC_DEVICE.id,
        verb: "shared",
        entityType: "workspace",
        entityId: next.id,
        summary: `${trimmed} invited as editor.`,
      })),
    ]);
    setInviteName("");
    setStatus(`${trimmed} invited.`);
    await load();
  };

  const addComment = async (): Promise<void> => {
    const workspace = workspaces[0];
    const body = commentBody.trim();
    if (!workspace || !body) return;
    const authorId = workspace.collaborators[0]?.id ?? LOCAL_SYNC_DEVICE.id;
    const comment = SyncCollaborationService.addComment({ workspaceId: workspace.id, authorId, body });
    await Promise.all([
      localRepositories.collaborationComments.save(comment),
      localRepositories.activityFeed.save(SyncCollaborationService.activity({
        workspaceId: workspace.id,
        actorId: authorId,
        verb: "commented",
        entityType: "workspace",
        entityId: workspace.id,
        summary: "Comment added.",
      })),
    ]);
    setCommentBody("");
    setStatus("Comment added.");
    await load();
  };

  const resolveConflict = async (conflict: SyncConflict, resolution: SyncConflict["resolution"]): Promise<void> => {
    const resolved = SyncCollaborationService.resolveConflict(conflict, resolution);
    await Promise.all([
      localRepositories.syncConflicts.save(resolved),
      localRepositories.activityFeed.save(SyncCollaborationService.activity({
        actorId: LOCAL_SYNC_DEVICE.id,
        verb: "resolved_conflict",
        entityType: conflict.entityType,
        entityId: conflict.entityId,
        summary: `Conflict resolved with ${resolution}.`,
      })),
    ]);
    setStatus("Conflict resolved.");
    await load();
  };

  const createBackup = async (): Promise<void> => {
    const backup = await backupAllVersions("Manual sync backup");
    setStatus(`Backup created (${String(backup.length)} characters).`);
    await load();
  };

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col gap-3 p-[var(--panel-px)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-title font-bold">Sync & Collaboration</h2>
          <p className="text-sm text-muted-foreground">Local-first queue, conflicts, shared study spaces, comments, version history, backup, and restore metadata.</p>
        </div>
        <Button size="sm" onClick={createBackup}><Cloud className="size-4" />Backup</Button>
      </header>

      <nav aria-label="Sync panels" className="flex flex-wrap gap-2">
        {(["sync", "collaboration", "activity", "versions", "conflicts"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setMode(item)} className={cn("rounded-lg px-3 py-2 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring", mode === item ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}>{item}</button>
        ))}
      </nav>

      <p className="text-xs text-muted-foreground" role="status">{status}</p>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {mode === "sync" && <SyncPanel metadata={metadata} operations={operations} pending={pending} onBackup={() => { void createBackup(); }} />}
        {mode === "collaboration" && <CollaborationPanel workspaces={workspaces} comments={comments} inviteName={inviteName} commentBody={commentBody} onInviteName={setInviteName} onCommentBody={setCommentBody} onCreate={() => { void createWorkspace(); }} onInvite={() => { void invite(); }} onComment={() => { void addComment(); }} />}
        {mode === "activity" && <ActivityPanel activity={activity} />}
        {mode === "versions" && <VersionsPanel versions={versions} />}
        {mode === "conflicts" && <ConflictPanel conflicts={conflicts} onResolve={(conflict, resolution) => { void resolveConflict(conflict, resolution); }} />}
      </div>
    </motion.section>
  );
}

function SyncPanel({ metadata, operations, pending, onBackup }: { metadata: SyncMetadata | undefined; operations: readonly SyncOperation[]; pending: readonly SyncOperation[]; onBackup: () => void }) {
  return <div className="grid gap-3 lg:grid-cols-[18rem_1fr]"><Card className="p-4"><h3 className="flex items-center gap-2 font-semibold"><Cloud className="size-4" />Sync Center</h3><p className="mt-2 text-sm text-muted-foreground">Pending: {pending.length}</p><p className="text-sm text-muted-foreground">Conflicts: {metadata?.conflictCount ?? 0}</p><p className="text-sm text-muted-foreground">Device: {metadata?.deviceId.slice(0, 8) ?? "local"}</p><Button className="mt-3 w-full" onClick={onBackup}>Create backup</Button></Card><Card className="p-4"><h3 className="font-semibold">Background Queue</h3><div className="mt-3 space-y-2">{operations.map((operation) => <div key={operation.id} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between gap-2"><span className="font-medium">{operation.entityType}</span><Badge>{operation.status}</Badge></div><p className="text-xs text-muted-foreground">{operation.operation} · retries {operation.retryCount}</p></div>)}{operations.length === 0 && <p className="text-sm text-muted-foreground">No pending operations yet.</p>}</div></Card></div>;
}

function CollaborationPanel({ workspaces, comments, inviteName, commentBody, onInviteName, onCommentBody, onCreate, onInvite, onComment }: { workspaces: readonly SharedWorkspace[]; comments: readonly CollaborationComment[]; inviteName: string; commentBody: string; onInviteName: (value: string) => void; onCommentBody: (value: string) => void; onCreate: () => void; onInvite: () => void; onComment: () => void }) {
  const workspace = workspaces[0];
  return <div className="grid gap-3 lg:grid-cols-2"><Card className="p-4"><h3 className="flex items-center gap-2 font-semibold"><Share2 className="size-4" />Shared Workspace Manager</h3>{!workspace && <Button className="mt-3" onClick={onCreate}>Create shared workspace</Button>}{workspace && <div className="mt-3 space-y-2"><p className="font-medium">{workspace.title}</p>{workspace.collaborators.map((collaborator) => <div key={collaborator.id} className="flex items-center justify-between rounded-lg bg-accent p-2 text-sm"><span>{collaborator.displayName}</span><Badge>{collaborator.role}</Badge></div>)}<div className="flex gap-2 pt-2"><Input value={inviteName} onChange={(event) => onInviteName(event.target.value)} placeholder="Collaborator name" aria-label="Collaborator name" /><Button onClick={onInvite}><UserPlus className="size-4" />Invite</Button></div></div>}</Card><Card className="p-4"><h3 className="flex items-center gap-2 font-semibold"><MessageSquare className="size-4" />Comments</h3><Textarea className="mt-3" value={commentBody} onChange={(event) => onCommentBody(event.target.value)} placeholder="Add a comment for collaborators" aria-label="Collaboration comment" /><Button className="mt-2" onClick={onComment} disabled={!workspace}>Comment</Button><div className="mt-3 space-y-2">{comments.map((comment) => <p key={comment.id} className="rounded-lg bg-accent p-2 text-sm">{comment.body}</p>)}</div></Card></div>;
}

function ActivityPanel({ activity }: { activity: readonly ActivityFeedEvent[] }) {
  return <Card className="p-4"><h3 className="flex items-center gap-2 font-semibold"><Activity className="size-4" />Activity Feed</h3><div className="mt-3 space-y-2">{activity.map((event) => <div key={event.id} className="rounded-lg border border-border p-3"><p className="font-medium">{event.summary}</p><p className="text-xs text-muted-foreground">{event.verb} · {event.createdAt}</p></div>)}{activity.length === 0 && <p className="text-sm text-muted-foreground">No activity yet.</p>}</div></Card>;
}

function VersionsPanel({ versions }: { versions: readonly VersionSnapshot[] }) {
  const latest = versions[0];
  const previous = versions[1];
  const comparison = latest && previous ? SyncCollaborationService.compareVersions(previous, latest) : undefined;
  return <Card className="p-4"><h3 className="flex items-center gap-2 font-semibold"><GitCompare className="size-4" />Version History</h3>{comparison && <div className="mt-3 grid gap-2 md:grid-cols-3"><Badge>Added {comparison.added.length}</Badge><Badge>Removed {comparison.removed.length}</Badge><Badge>Changed {comparison.changed.length}</Badge></div>}<div className="mt-3 space-y-2">{versions.map((version) => <div key={version.id} className="rounded-lg border border-border p-3"><p className="font-medium">{version.label ?? version.entityType}</p><p className="text-xs text-muted-foreground">{version.entityType} · {version.createdAt}</p><Button size="sm" variant="ghost" className="mt-2"><RotateCcw className="size-4" />Restore marker</Button></div>)}{versions.length === 0 && <p className="text-sm text-muted-foreground">No version snapshots yet.</p>}</div></Card>;
}

function ConflictPanel({ conflicts, onResolve }: { conflicts: readonly SyncConflict[]; onResolve: (conflict: SyncConflict, resolution: SyncConflict["resolution"]) => void }) {
  return <Card className="p-4"><h3 className="flex items-center gap-2 font-semibold"><AlertTriangle className="size-4" />Conflict Resolution</h3><div className="mt-3 space-y-2">{conflicts.map((conflict) => <div key={conflict.id} className="rounded-lg border border-border p-3"><div className="flex items-center justify-between gap-2"><span className="font-medium">{conflict.entityType}</span><Badge>{conflict.status}</Badge></div><p className="mt-1 text-sm text-muted-foreground">Fields: {conflict.fields.join(", ") || "unknown"}</p><Select className="mt-2" aria-label="Resolve conflict" value={conflict.resolution ?? ""} onChange={(event) => onResolve(conflict, event.target.value as SyncConflict["resolution"])} disabled={conflict.status === "resolved"}><option value="">Choose resolution</option><option value="use_local">Use local</option><option value="use_remote">Use remote</option><option value="merge">Merge</option><option value="keep_both">Keep both</option></Select></div>)}{conflicts.length === 0 && <p className="text-sm text-muted-foreground">No conflicts detected.</p>}</div></Card>;
}
