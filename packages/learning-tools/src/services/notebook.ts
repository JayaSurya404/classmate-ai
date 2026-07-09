import {
  KnowledgeGraphSchema,
  NoteCollectionSchema,
  NoteFolderSchema,
  SmartNoteSchema,
  type Citation,
  type KnowledgeGraph,
  type KnowledgeGraphEdge,
  type KnowledgeGraphNode,
  type NoteBlock,
  type NoteBlockType,
  type NoteCollection,
  type NoteFolder,
  type NoteKind,
  type NoteStatus,
  type NoteTag,
  type NoteVersion,
  type SmartNote,
} from "@classmate/contracts";

export type NotebookExportFormat = "markdown" | "json" | "html" | "csv";
export type SmartSearchScope = "notes" | "sources" | "flashcards" | "quizzes" | "mind_maps" | "study_plans";

export interface NotebookSearchFilters {
  query?: string | undefined;
  tags?: readonly string[] | undefined;
  folderId?: string | undefined;
  sourceId?: string | undefined;
  status?: NoteStatus | undefined;
  from?: string | undefined;
  to?: string | undefined;
}

export interface NotebookSearchHit {
  id: string;
  scope: SmartSearchScope;
  title: string;
  snippet: string;
  score: number;
  tags: readonly string[];
  updatedAt: string;
}

export interface RelatedNote {
  note: SmartNote;
  reasons: readonly string[];
  score: number;
}

export class NotebookService {
  static createFolder(name: string, parentId: string | null = null, color?: string): NoteFolder {
    const now = new Date().toISOString();
    return NoteFolderSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      name,
      parentId,
      color,
      createdAt: now,
      updatedAt: now,
    });
  }

  static createCollection(name: string, noteIds: readonly string[] = []): NoteCollection {
    const now = new Date().toISOString();
    return NoteCollectionSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      name,
      noteIds: [...noteIds],
      createdAt: now,
      updatedAt: now,
    });
  }

  static createNote(args: {
    title: string;
    markdown?: string | undefined;
    kind?: NoteKind | undefined;
    folderId?: string | undefined;
    sourceIds?: readonly string[] | undefined;
    tags?: readonly NoteTag[] | undefined;
    citations?: readonly Citation[] | undefined;
  }): SmartNote {
    const now = new Date().toISOString();
    const markdown = args.markdown ?? "";
    return SmartNoteSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title: args.title,
      kind: args.kind ?? "manual",
      markdown,
      blocks: NotebookService.parseBlocks(markdown),
      folderId: args.folderId,
      sourceIds: [...(args.sourceIds ?? [])],
      tags: [...(args.tags ?? NotebookService.inferTags(markdown, args.title))],
      citations: [...(args.citations ?? [])],
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      versions: [],
    });
  }

  static generateAiNote(args: {
    title: string;
    kind: Exclude<NoteKind, "manual">;
    sourceTitle: string;
    sourceText: string;
    sourceId?: string | undefined;
    citations?: readonly Citation[] | undefined;
  }): SmartNote {
    const sections = noteSectionsForKind(args.kind);
    const excerpt = summarizeText(args.sourceText, args.kind);
    const citationList = (args.citations ?? []).map((citation) => `[^${citation.id}]: ${citation.quote ?? citation.chunkId}`);
    const markdown = [
      `# ${args.title}`,
      "",
      `> AI-generated ${args.kind.replace(/_/g, " ")} from ${args.sourceTitle}. Verify important claims against the cited source.`,
      "",
      ...sections.flatMap((section) => [`## ${section}`, excerpt, ""]),
      ...citationList,
    ].join("\n");
    return NotebookService.createNote({
      title: args.title,
      kind: args.kind,
      markdown,
      sourceIds: args.sourceId ? [args.sourceId] : [],
      citations: args.citations,
    });
  }

  static autoSave(note: SmartNote, markdown: string, reason: NoteVersion["reason"] = "autosave"): SmartNote {
    const now = new Date().toISOString();
    const version: NoteVersion = {
      id: crypto.randomUUID(),
      noteId: note.id,
      markdown: note.markdown,
      savedAt: now,
      reason,
    };
    return SmartNoteSchema.parse({
      ...note,
      markdown,
      blocks: NotebookService.parseBlocks(markdown),
      tags: mergeTags(note.tags, NotebookService.inferTags(markdown, note.title)),
      updatedAt: now,
      versions: [version, ...note.versions].slice(0, 100),
    });
  }

  static restoreVersion(note: SmartNote, versionId: string): SmartNote {
    const version = note.versions.find((candidate: NoteVersion) => candidate.id === versionId);
    return version ? NotebookService.autoSave(note, version.markdown, "manual") : note;
  }

  static setStatus(note: SmartNote, status: NoteStatus): SmartNote {
    return SmartNoteSchema.parse({ ...note, status, updatedAt: new Date().toISOString() });
  }

  static togglePinned(note: SmartNote): SmartNote {
    return SmartNoteSchema.parse({ ...note, isPinned: !note.isPinned, updatedAt: new Date().toISOString() });
  }

  static toggleFavorite(note: SmartNote): SmartNote {
    return SmartNoteSchema.parse({ ...note, isFavorite: !note.isFavorite, updatedAt: new Date().toISOString() });
  }

  static linkNotes(note: SmartNote, targetNoteId: string): SmartNote {
    if (note.id === targetNoteId || note.linkedNoteIds.includes(targetNoteId)) return note;
    return SmartNoteSchema.parse({
      ...note,
      linkedNoteIds: [...note.linkedNoteIds, targetNoteId],
      updatedAt: new Date().toISOString(),
    });
  }

  static backlinks(notes: readonly SmartNote[], noteId: string): SmartNote[] {
    return notes.filter((note) => note.linkedNoteIds.includes(noteId));
  }

  static relatedNotes(notes: readonly SmartNote[], note: SmartNote): RelatedNote[] {
    return notes
      .filter((candidate) => candidate.id !== note.id && candidate.status === "active")
      .map((candidate) => {
        const tagOverlap = overlap(note.tags.map((tag: NoteTag) => tag.label), candidate.tags.map((tag: NoteTag) => tag.label));
        const sourceOverlap = overlap(note.sourceIds, candidate.sourceIds);
        const linked = note.linkedNoteIds.includes(candidate.id) || candidate.linkedNoteIds.includes(note.id);
        const score = tagOverlap * 2 + sourceOverlap * 3 + (linked ? 5 : 0);
        const reasons = [
          ...(tagOverlap > 0 ? ["shared tags"] : []),
          ...(sourceOverlap > 0 ? ["shared sources"] : []),
          ...(linked ? ["linked notes"] : []),
        ];
        return { note: candidate, reasons, score };
      })
      .filter((result) => result.score > 0)
      .sort((left, right) => right.score - left.score);
  }

  static search(notes: readonly SmartNote[], filters: NotebookSearchFilters): NotebookSearchHit[] {
    const query = filters.query?.trim().toLowerCase();
    const from = filters.from ? Date.parse(filters.from) : undefined;
    const to = filters.to ? Date.parse(filters.to) : undefined;
    return notes
      .filter((note) => !filters.status || note.status === filters.status)
      .filter((note) => !filters.folderId || note.folderId === filters.folderId)
      .filter((note) => !filters.sourceId || note.sourceIds.includes(filters.sourceId))
      .filter((note) => !filters.tags || filters.tags.every((tag: string) => note.tags.some((candidate: NoteTag) => candidate.label.toLowerCase() === tag.toLowerCase())))
      .filter((note) => from === undefined || Date.parse(note.updatedAt) >= from)
      .filter((note) => to === undefined || Date.parse(note.updatedAt) <= to)
      .map((note) => {
        const haystack = `${note.title}\n${note.markdown}\n${note.tags.map((tag: NoteTag) => tag.label).join(" ")}`.toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const score = matchesQuery ? scoreNote(note, query) : 0;
        return { note, score };
      })
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score)
      .map(({ note, score }) => ({
        id: note.id,
        scope: "notes",
        title: note.title,
        snippet: snippet(note.markdown || note.title, query ?? note.title.toLowerCase()),
        score,
        tags: note.tags.map((tag: NoteTag) => tag.label),
        updatedAt: note.updatedAt,
      }));
  }

  static buildKnowledgeGraph(notes: readonly SmartNote[]): KnowledgeGraph {
    const nodes: KnowledgeGraphNode[] = [];
    const edges: KnowledgeGraphEdge[] = [];
    const addNode = (node: Omit<KnowledgeGraphNode, "id" | "weight" | "isExpanded">): string => {
      const existing = nodes.find((candidate: KnowledgeGraphNode) => candidate.kind === node.kind && candidate.refId === node.refId);
      if (existing) return existing.id;
      const id = crypto.randomUUID();
      nodes.push({ ...node, id, weight: 1, isExpanded: true });
      return id;
    };
    for (const note of notes.filter((candidate: SmartNote) => candidate.status === "active")) {
      const noteNodeId = addNode({ label: note.title, kind: "note", refId: note.id });
      for (const sourceId of note.sourceIds) {
        const sourceNodeId = addNode({ label: `Source ${sourceId.slice(0, 8)}`, kind: "source", refId: sourceId });
        edges.push({ id: crypto.randomUUID(), fromId: noteNodeId, toId: sourceNodeId, label: "references", strength: 0.8 });
      }
      for (const tag of note.tags) {
        const topicNodeId = addNode({ label: tag.label, kind: "topic", refId: tag.label.toLowerCase() });
        edges.push({ id: crypto.randomUUID(), fromId: noteNodeId, toId: topicNodeId, label: "tagged", strength: 0.6 });
      }
      for (const linkedNoteId of note.linkedNoteIds) {
        const target = notes.find((candidate: SmartNote) => candidate.id === linkedNoteId);
        if (target) {
          const targetNodeId = addNode({ label: target.title, kind: "note", refId: target.id });
          edges.push({ id: crypto.randomUUID(), fromId: noteNodeId, toId: targetNodeId, label: "links", strength: 1 });
        }
      }
    }
    return KnowledgeGraphSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title: "Knowledge Graph",
      nodes,
      edges,
      updatedAt: new Date().toISOString(),
    });
  }

  static exportNotes(notes: readonly SmartNote[], graph: KnowledgeGraph | undefined, format: NotebookExportFormat): string {
    if (format === "json") return JSON.stringify({ notes, graph }, null, 2);
    if (format === "csv") {
      return [
        "title,kind,status,tags,updatedAt",
        ...notes.map((note: SmartNote) => [note.title, note.kind, note.status, note.tags.map((tag: NoteTag) => tag.label).join("|"), note.updatedAt].map(csvCell).join(",")),
      ].join("\n");
    }
    if (format === "html") {
      return notes.map((note) => `<article><h1>${escapeHtml(note.title)}</h1>${markdownToHtml(note.markdown)}</article>`).join("\n");
    }
    return notes.map((note) => `# ${note.title}\n\n${note.markdown}`).join("\n\n---\n\n");
  }

  static parseBlocks(markdown: string): NoteBlock[] {
    return markdown.split(/\n{2,}/).filter(Boolean).slice(0, 1000).map((block) => ({
      id: crypto.randomUUID(),
      type: detectBlockType(block),
      markdown: block,
      metadata: {},
    }));
  }

  static inferTags(markdown: string, title = ""): NoteTag[] {
    const words = `${title} ${markdown}`.toLowerCase().match(/\b[a-z][a-z0-9-]{4,}\b/g) ?? [];
    return [...new Set(words)]
      .filter((word) => !STOP_WORDS.has(word))
      .slice(0, 8)
      .map((label: string) => ({ id: crypto.randomUUID(), label, kind: "automatic" as const }));
  }
}

const STOP_WORDS = new Set(["about", "after", "again", "class", "could", "every", "their", "there", "these", "those", "where", "which", "would"]);

function noteSectionsForKind(kind: Exclude<NoteKind, "manual">): readonly string[] {
  const map: Record<Exclude<NoteKind, "manual">, readonly string[]> = {
    summary: ["Key Ideas", "Important Details", "Citations"],
    detailed: ["Overview", "Detailed Explanation", "Examples", "Citations"],
    class: ["Learning Objectives", "Class Notes", "Questions to Ask"],
    lecture: ["Lecture Flow", "Main Points", "Revision Prompts"],
    revision: ["Must Remember", "Common Mistakes", "Quick Recall"],
    formula_sheet: ["Formulae", "Variables", "When to Use"],
    cheat_sheet: ["Core Rules", "Shortcuts", "Warnings"],
    one_page_revision: ["One-page Review", "High-yield Facts", "Last-minute Checks"],
    concept: ["Concept", "How It Works", "Connections"],
    definition: ["Definitions", "Examples", "Non-examples"],
  };
  return map[kind] ?? map.summary;
}

function summarizeText(text: string, kind: NoteKind): string {
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const limit = kind === "detailed" || kind === "lecture" ? 140 : 70;
  return words.slice(0, limit).join(" ") || "No source text was available for this note.";
}

function detectBlockType(block: string): NoteBlockType {
  if (/^#{1,6}\s/m.test(block)) return "heading";
  if (/^```/m.test(block)) return "code";
  if (/^\|.+\|/m.test(block)) return "table";
  if (/^\s*[-*]\s\[[ x]\]/im.test(block)) return "checkbox";
  if (/^\s*[-*]\s/m.test(block)) return "list";
  if (/^>\s/m.test(block)) return "quote";
  if (/^\$\$[\s\S]*\$\$$/.test(block.trim())) return "math";
  if (/^---+$/.test(block.trim())) return "hr";
  if (/!\[[^\]]*]\([^)]*\)/.test(block)) return "image";
  return "markdown";
}

function mergeTags(existing: readonly NoteTag[], inferred: readonly NoteTag[]): NoteTag[] {
  const labels = new Set(existing.map((tag: NoteTag) => tag.label.toLowerCase()));
  return [...existing, ...inferred.filter((tag) => !labels.has(tag.label.toLowerCase()))].slice(0, 50);
}

function overlap(left: readonly string[], right: readonly string[]): number {
  const rightSet = new Set(right.map((value) => value.toLowerCase()));
  return left.filter((value) => rightSet.has(value.toLowerCase())).length;
}

function scoreNote(note: SmartNote, query: string | undefined): number {
  let score = 1;
  if (note.isPinned) score += 3;
  if (note.isFavorite) score += 2;
  if (query && note.title.toLowerCase().includes(query)) score += 5;
  if (query && note.tags.some((tag: NoteTag) => tag.label.toLowerCase().includes(query))) score += 3;
  return score;
}

function snippet(text: string, query: string): string {
  const index = text.toLowerCase().indexOf(query);
  const start = Math.max(0, index < 0 ? 0 : index - 48);
  return text.slice(start, start + 180).trim();
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function markdownToHtml(markdown: string): string {
  return escapeHtml(markdown)
    .split("\n\n")
    .map((block) => `<p>${block.replace(/\n/g, "<br />")}</p>`)
    .join("\n");
}
