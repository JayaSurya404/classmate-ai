import { motion } from "framer-motion";
import { Archive, Download, GitBranch, Pin, Search, Star, Tags, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NotebookService, type NotebookExportFormat } from "@classmate/learning-tools";
import { Badge, Button, Card, Input, MarkdownRenderer, Select, Textarea, cn } from "@classmate/ui";
import type { KnowledgeGraph, SmartNote } from "@classmate/contracts";
import { localRepositories } from "../../adapters/local-db/database";
import { recordEntityChange } from "../sync/syncIntegration";

export type NotebookPanelMode = "notebook" | "editor" | "graph" | "search";

export interface NotebookViewProps {
  initialMode: NotebookPanelMode;
  sourceId?: string | undefined;
  sourceTitle?: string | undefined;
}

export function NotebookView({ initialMode, sourceId, sourceTitle }: NotebookViewProps) {
  const [mode, setMode] = useState<NotebookPanelMode>(initialMode);
  const [notes, setNotes] = useState<SmartNote[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | undefined>();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState("");
  const [graph, setGraph] = useState<KnowledgeGraph | undefined>();
  const activeNote = notes.find((note) => note.id === activeNoteId) ?? notes[0];
  const hits = useMemo(() => NotebookService.search(notes, { query, status: "active" }), [notes, query]);
  const related = useMemo(() => (activeNote ? NotebookService.relatedNotes(notes, activeNote) : []), [activeNote, notes]);

  useEffect(() => {
    let active = true;
    void Promise.all([localRepositories.notes.list(), localRepositories.knowledgeGraphs.latest()]).then(([storedNotes, storedGraph]) => {
      if (!active) return;
      setNotes(storedNotes);
      setGraph(storedGraph);
      const first = storedNotes[0];
      if (first) {
        setActiveNoteId(first.id);
        setDraft(first.markdown);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const saveNote = async (note: SmartNote): Promise<void> => {
    const previous = notes.find((candidate) => candidate.id === note.id);
    await localRepositories.notes.save(note);
    await recordEntityChange({
      entityType: "note",
      entityId: note.id,
      before: previous ? { title: previous.title, markdown: previous.markdown, status: previous.status } : undefined,
      after: { title: note.title, markdown: note.markdown, status: note.status, tags: note.tags.map((tag) => tag.label) },
      operation: previous ? "update" : "create",
      label: note.title,
    });
    setNotes((current) => [note, ...current.filter((candidate) => candidate.id !== note.id)]);
    setActiveNoteId(note.id);
    setDraft(note.markdown);
  };

  const createNote = async (): Promise<void> => {
    const note = NotebookService.createNote({
      title: sourceTitle ? `${sourceTitle} Notes` : "Untitled Note",
      markdown: sourceTitle ? `# ${sourceTitle}\n\nStart your notes here.` : "# Untitled Note\n\nStart writing.",
      sourceIds: sourceId ? [sourceId] : [],
    });
    await saveNote(note);
    setMode("editor");
  };

  const createAiNote = async (): Promise<void> => {
    const note = NotebookService.generateAiNote({
      title: sourceTitle ? `${sourceTitle} Revision Notes` : "Revision Notes",
      kind: "revision",
      sourceTitle: sourceTitle ?? "Current source",
      sourceText: activeNote?.markdown ?? "Capture a source or write notes to generate revision material.",
      sourceId,
    });
    await saveNote(note);
    setMode("editor");
  };

  const autoSave = async (): Promise<void> => {
    if (!activeNote) return;
    await saveNote(NotebookService.autoSave(activeNote, draft));
  };

  const updateStatus = async (note: SmartNote, status: SmartNote["status"]): Promise<void> => {
    await saveNote(NotebookService.setStatus(note, status));
  };

  const rebuildGraph = async (): Promise<void> => {
    const nextGraph = NotebookService.buildKnowledgeGraph(notes);
    await localRepositories.knowledgeGraphs.save(nextGraph);
    await recordEntityChange({
      entityType: "knowledge_graph",
      entityId: nextGraph.id,
      after: { title: nextGraph.title, nodes: nextGraph.nodes.length, edges: nextGraph.edges.length },
      operation: "update",
      label: nextGraph.title,
    });
    setGraph(nextGraph);
    setMode("graph");
  };

  const copyExport = async (format: NotebookExportFormat): Promise<void> => {
    await navigator.clipboard.writeText(NotebookService.exportNotes(notes, graph, format));
  };

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col gap-3 p-[var(--panel-px)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-title font-bold">Smart Notebook</h2>
          <p className="text-sm text-muted-foreground">Notes, folders, tags, graph links, source references, autosave, and exports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={createNote}>New note</Button>
          <Button size="sm" variant="secondary" onClick={createAiNote}>AI note</Button>
          <Button size="sm" variant="outline" onClick={() => copyExport("markdown")}><Download className="size-4" />Export</Button>
        </div>
      </header>

      <nav aria-label="Notebook panels" className="flex flex-wrap gap-2">
        {(["notebook", "editor", "graph", "search"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setMode(item)} className={cn("rounded-lg px-3 py-2 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring", mode === item ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}>{item}</button>
        ))}
      </nav>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[14rem_1fr_14rem]">
        <aside className="space-y-3 overflow-y-auto" aria-label="Folder and tag sidebar">
          <Card className="p-3">
            <h3 className="text-sm font-semibold">Folders</h3>
            <button type="button" className="mt-2 text-sm text-primary">All Notes</button>
            <p className="mt-2 text-xs text-muted-foreground">Pinned: {notes.filter((note) => note.isPinned).length}</p>
            <p className="text-xs text-muted-foreground">Favorites: {notes.filter((note) => note.isFavorite).length}</p>
            <p className="text-xs text-muted-foreground">Trash: {notes.filter((note) => note.status === "trashed").length}</p>
          </Card>
          <Card className="p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Tags className="size-4" />Tags</h3>
            <div className="mt-2 flex flex-wrap gap-1">
              {[...new Set(notes.flatMap((note) => note.tags.map((tag) => tag.label)))].slice(0, 20).map((tag) => <Badge key={tag}>{tag}</Badge>)}
            </div>
          </Card>
        </aside>

        <main className="min-h-0 overflow-hidden">
          {mode === "notebook" && <NoteList notes={notes} activeNoteId={activeNote?.id} onOpen={(note) => { setActiveNoteId(note.id); setDraft(note.markdown); setMode("editor"); }} onTogglePin={(note) => { void saveNote(NotebookService.togglePinned(note)); }} onToggleFavorite={(note) => { void saveNote(NotebookService.toggleFavorite(note)); }} onStatus={updateStatus} />}
          {mode === "editor" && <EditorPanel note={activeNote} draft={draft} onDraft={setDraft} onSave={() => { void autoSave(); }} />}
          {mode === "graph" && <GraphPanel graph={graph} onRebuild={() => { void rebuildGraph(); }} />}
          {mode === "search" && <SearchPanel query={query} onQuery={setQuery} hits={hits} onOpen={(id) => { const note = notes.find((candidate) => candidate.id === id); if (note) { setActiveNoteId(note.id); setDraft(note.markdown); setMode("editor"); } }} />}
        </main>

        <aside className="space-y-3 overflow-y-auto" aria-label="Related notes sidebar">
          <Card className="p-3">
            <h3 className="text-sm font-semibold">Related Notes</h3>
            <div className="mt-2 space-y-2">
              {related.length === 0 && <p className="text-xs text-muted-foreground">No related notes yet.</p>}
              {related.slice(0, 6).map((item) => (
                <button key={item.note.id} type="button" onClick={() => { setActiveNoteId(item.note.id); setDraft(item.note.markdown); setMode("editor"); }} className="block w-full rounded-md p-2 text-left text-xs hover:bg-accent">
                  <span className="font-medium">{item.note.title}</span>
                  <span className="block text-muted-foreground">{item.reasons.join(", ")}</span>
                </button>
              ))}
            </div>
          </Card>
        </aside>
      </div>
    </motion.section>
  );
}

function NoteList({ notes, activeNoteId, onOpen, onTogglePin, onToggleFavorite, onStatus }: { notes: readonly SmartNote[]; activeNoteId?: string | undefined; onOpen: (note: SmartNote) => void; onTogglePin: (note: SmartNote) => void; onToggleFavorite: (note: SmartNote) => void; onStatus: (note: SmartNote, status: SmartNote["status"]) => Promise<void>; }) {
  return (
    <div className="grid gap-2 overflow-y-auto">
      {notes.length === 0 && <Card className="p-6 text-center text-muted-foreground">Create your first note or generate one from the current source.</Card>}
      {notes.map((note) => (
        <Card key={note.id} className={cn("p-3", note.id === activeNoteId && "border-primary")}>
          <button type="button" onClick={() => onOpen(note)} className="block w-full text-left">
            <h3 className="font-semibold">{note.title}</h3>
            <p className="line-clamp-2 text-sm text-muted-foreground">{note.markdown}</p>
          </button>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => onTogglePin(note)}><Pin className="size-4" />{note.isPinned ? "Unpin" : "Pin"}</Button>
            <Button size="sm" variant="ghost" onClick={() => onToggleFavorite(note)}><Star className="size-4" />{note.isFavorite ? "Unfavorite" : "Favorite"}</Button>
            <Button size="sm" variant="ghost" onClick={() => { void onStatus(note, "archived"); }}><Archive className="size-4" />Archive</Button>
            <Button size="sm" variant="ghost" onClick={() => { void onStatus(note, "trashed"); }}><Trash2 className="size-4" />Trash</Button>
          </div>
        </Card>
      ))}
    </div>
  );
}

function EditorPanel({ note, draft, onDraft, onSave }: { note: SmartNote | undefined; draft: string; onDraft: (value: string) => void; onSave: () => void }) {
  if (!note) return <Card className="p-6 text-center text-muted-foreground">Select or create a note to start editing.</Card>;
  return (
    <div className="grid h-full gap-3 lg:grid-cols-2">
      <Card className="flex min-h-0 flex-col p-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <h3 className="font-semibold">{note.title}</h3>
          <Button size="sm" onClick={onSave}>Save</Button>
        </div>
        <Textarea value={draft} onChange={(event) => onDraft(event.target.value)} onBlur={onSave} aria-label="Rich markdown note editor" className="min-h-0 flex-1 font-mono text-sm" placeholder="Markdown, tables, code, callouts, math, links, checkboxes, embeds..." />
      </Card>
      <Card className="min-h-0 overflow-y-auto p-4">
        <MarkdownRenderer markdown={draft || "Nothing to preview yet."} />
      </Card>
    </div>
  );
}

function GraphPanel({ graph, onRebuild }: { graph: KnowledgeGraph | undefined; onRebuild: () => void }) {
  return (
    <Card className="h-full overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 font-semibold"><GitBranch className="size-4" />Knowledge Graph</h3>
        <Button size="sm" onClick={onRebuild}>Rebuild</Button>
      </div>
      {!graph && <p className="mt-4 text-sm text-muted-foreground">Build a graph to see linked notes, sources, topics, PDFs, videos, and websites.</p>}
      {graph && <div className="mt-4 grid gap-2">{graph.nodes.map((node) => <div key={node.id} className="rounded-lg border border-border p-3"><span className="font-medium">{node.label}</span><span className="ml-2 text-xs text-muted-foreground">{node.kind}</span></div>)}</div>}
    </Card>
  );
}

function SearchPanel({ query, onQuery, hits, onOpen }: { query: string; onQuery: (value: string) => void; hits: readonly { id: string; title: string; snippet: string; score: number }[]; onOpen: (id: string) => void }) {
  return (
    <Card className="h-full overflow-y-auto p-4">
      <label className="text-sm font-medium" htmlFor="notebook-search">Smart Search</label>
      <div className="mt-2 flex items-center gap-2">
        <Search className="size-4 text-muted-foreground" />
        <Input id="notebook-search" value={query} onChange={(event) => onQuery(event.target.value)} placeholder="Search notes, tags, folders, dates, and sources" />
      </div>
      <Select className="mt-3" aria-label="Search scope" value="notes" onChange={() => undefined}>
        <option value="notes">Notes, PDFs, YouTube, web sources, practice artifacts</option>
      </Select>
      <div className="mt-4 space-y-2">
        {hits.map((hit) => <button key={hit.id} type="button" onClick={() => onOpen(hit.id)} className="block w-full rounded-lg border border-border p-3 text-left hover:bg-accent"><span className="font-medium">{hit.title}</span><span className="block text-sm text-muted-foreground">{hit.snippet}</span></button>)}
        {query && hits.length === 0 && <p className="text-sm text-muted-foreground">No matches found.</p>}
      </div>
    </Card>
  );
}
