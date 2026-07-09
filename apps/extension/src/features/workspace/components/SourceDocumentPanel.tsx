import { motion } from "framer-motion";
import { Bookmark, Download, FileText, Highlighter, MessageSquare, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { SourceAnnotation } from "@classmate/contracts";
import { Button, Card, Input, Select, Textarea } from "@classmate/ui";
import { localRepositories } from "../../../adapters/local-db/database";
import {
  createStoredAnnotation,
  isImageSourceDocument,
  isPdfSourceDocument,
  isYoutubeSourceDocument,
  StoredSourceDocumentSchema,
  type StoredSourceDocument,
} from "../sourceDocuments";
import {
  exportSourceDocument,
  searchSourceDocument,
  type SourceExportFormat,
} from "../services/sourceDocumentExport";

export interface SourceDocumentPanelProps {
  kind: "pdf" | "image" | "youtube";
  sourceId?: string | undefined;
}

export function SourceDocumentPanel({ kind, sourceId }: SourceDocumentPanelProps) {
  const [document, setDocument] = useState<StoredSourceDocument | undefined>();
  const [annotations, setAnnotations] = useState<SourceAnnotation[]>([]);
  const [query, setQuery] = useState("");
  const [note, setNote] = useState("");
  const [format, setFormat] = useState<SourceExportFormat>("markdown");
  const [activeIndex, setActiveIndex] = useState(0);
  const hits = useMemo(() => (document ? searchSourceDocument(document, query) : []), [document, query]);

  useEffect(() => {
    let active = true;
    if (!sourceId) {
      setDocument(undefined);
      setAnnotations([]);
      return () => {
        active = false;
      };
    }
    void Promise.all([
      localRepositories.sourceDocuments.getBySourceId(sourceId),
      localRepositories.sourceAnnotations.listBySourceId(sourceId),
    ]).then(([stored, storedAnnotations]) => {
      if (!active) return;
      const parsed = StoredSourceDocumentSchema.safeParse(stored);
      setDocument(parsed.success && parsed.data.kind === kind ? parsed.data : undefined);
      setAnnotations(storedAnnotations.map((entry) => entry.annotation));
    });
    return () => {
      active = false;
    };
  }, [kind, sourceId]);

  if (!sourceId) {
    return <EmptySource kind={kind} message="Capture or attach a source to open this viewer." />;
  }

  if (!document) {
    return <EmptySource kind={kind} message={`The current source is not a ${labelForKind(kind)} document.`} />;
  }

  const addAnnotation = async (annotationKind: SourceAnnotation["kind"]): Promise<void> => {
    const annotation = createStoredAnnotation({
      sourceId,
      kind: annotationKind,
      text: note || `${annotationKind} on ${document.title}`,
      anchor: activeAnchor(document, activeIndex),
    });
    await localRepositories.sourceAnnotations.save({
      id: annotation.id,
      sourceId,
      kind: annotation.kind,
      updatedAt: annotation.updatedAt,
      annotation,
    });
    setAnnotations((current) => [...current, annotation]);
    setNote("");
  };

  const copyExport = async (): Promise<void> => {
    await navigator.clipboard.writeText(exportSourceDocument(document, annotations, format));
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="grid h-full gap-3 overflow-hidden p-[var(--panel-px)] lg:grid-cols-[14rem_1fr_16rem]"
      aria-label={`${labelForKind(kind)} workspace`}
    >
      <aside className="glass-panel overflow-y-auto rounded-2xl p-3" aria-label="Navigation sidebar">
        <h2 className="text-label font-semibold">{labelForKind(kind)} navigation</h2>
        <div className="mt-3 grid gap-2">{renderNavigation(document, activeIndex, setActiveIndex)}</div>
      </aside>

      <main className="min-h-0 overflow-y-auto rounded-2xl" aria-live="polite">
        {renderMain(document, activeIndex)}
      </main>

      <aside className="glass-panel space-y-3 overflow-y-auto rounded-2xl p-3" aria-label="Tools sidebar">
        <label className="grid gap-1 text-sm">
          <span className="text-label text-muted-foreground">Search</span>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find text" />
        </label>
        {hits.length > 0 && (
          <div className="space-y-1" aria-label="Search results">
            {hits.slice(0, 8).map((hit) => (
              <button
                key={hit.id}
                type="button"
                className="w-full rounded-lg p-2 text-left text-xs hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring"
                onClick={() => setActiveIndex(Math.max(0, (hit.pageNumber ?? 1) - 1))}
              >
                <span className="font-medium">{hit.label}</span>
                <span className="block text-muted-foreground">{hit.snippet}</span>
              </button>
            ))}
          </div>
        )}

        <Textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Annotation note" rows={3} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="secondary" size="sm" onClick={() => void addAnnotation("highlight")}>
            <Highlighter className="size-4" /> Highlight
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void addAnnotation("note")}>
            <MessageSquare className="size-4" /> Note
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void addAnnotation("bookmark")}>
            <Bookmark className="size-4" /> Bookmark
          </Button>
          <Button variant="secondary" size="sm" onClick={() => void addAnnotation("underline")}>
            <FileText className="size-4" /> Underline
          </Button>
        </div>

        <Select value={format} onChange={(event) => setFormat(event.target.value as SourceExportFormat)}>
          <option value="markdown">Markdown</option>
          <option value="json">JSON</option>
          <option value="csv">CSV</option>
        </Select>
        <Button className="w-full" onClick={() => void copyExport()}>
          <Download className="size-4" /> Copy export
        </Button>

        <section aria-label="Annotations" className="space-y-1">
          <h3 className="text-label font-semibold">Annotations</h3>
          {annotations.length === 0 ? (
            <p className="text-xs text-muted-foreground">No annotations yet.</p>
          ) : (
            annotations.map((annotation) => (
              <p key={annotation.id} className="rounded-lg bg-surface-2 p-2 text-xs">
                {annotation.kind}: {annotation.text}
              </p>
            ))
          )}
        </section>
      </aside>
    </motion.section>
  );
}

function EmptySource({ kind, message }: { kind: SourceDocumentPanelProps["kind"]; message: string }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground">
      <p>{labelForKind(kind)} viewer: {message}</p>
    </div>
  );
}

function renderNavigation(document: StoredSourceDocument, activeIndex: number, setActiveIndex: (index: number) => void) {
  if (isPdfSourceDocument(document)) {
    return document.payload.pages.map((page, index) => (
      <button key={page.pageNumber} type="button" onClick={() => setActiveIndex(index)} className={navClass(index === activeIndex)}>
        Page {page.pageNumber}
      </button>
    ));
  }
  if (isYoutubeSourceDocument(document)) {
    return document.payload.chapters.map((chapter, index) => (
      <button key={chapter.id} type="button" onClick={() => setActiveIndex(index)} className={navClass(index === activeIndex)}>
        {chapter.title}
      </button>
    ));
  }
  return [<span key="image" className={navClass(true)}>Image OCR</span>];
}

function renderMain(document: StoredSourceDocument, activeIndex: number) {
  if (isPdfSourceDocument(document)) {
    const page = document.payload.pages[activeIndex] ?? document.payload.pages[0];
    return <Card className="space-y-3 p-4"><h2 className="text-title font-semibold">Page {page?.pageNumber}</h2><p className="whitespace-pre-wrap text-sm">{page?.text}</p></Card>;
  }
  if (isYoutubeSourceDocument(document)) {
    const chapter = document.payload.chapters[activeIndex];
    const segments = chapter ? document.payload.segments.filter((segment) => segment.startMs >= chapter.startMs && (chapter.endMs === undefined || segment.startMs <= chapter.endMs)) : document.payload.segments;
    return <Card className="space-y-3 p-4"><iframe title={document.title} src={document.payload.embedUrl} className="aspect-video w-full rounded-xl" /><div className="space-y-2">{segments.map((segment) => <p key={segment.id} className="text-sm"><span className="font-mono text-primary">{Math.floor(segment.startMs / 1000)}s</span> {segment.text}</p>)}</div></Card>;
  }
  if (isImageSourceDocument(document)) {
    return <Card className="space-y-3 p-4">{document.payload.previewDataUrl && <img src={document.payload.previewDataUrl} alt={document.title} className="max-h-80 rounded-xl object-contain" />}<div className="space-y-2">{document.payload.ocrRegions.map((region) => <p key={region.id} className="text-sm">{region.text}</p>)}</div></Card>;
  }
  return null;
}

function activeAnchor(document: StoredSourceDocument, activeIndex: number): SourceAnnotation["anchor"] {
  if (isPdfSourceDocument(document)) return { pageNumber: document.payload.pages[activeIndex]?.pageNumber ?? 1 };
  if (isYoutubeSourceDocument(document)) return { timestampMs: document.payload.chapters[activeIndex]?.startMs ?? 0 };
  return {};
}

function navClass(active: boolean): string {
  return `rounded-lg px-3 py-2 text-left text-sm focus-visible:ring-2 focus-visible:ring-ring ${active ? "bg-primary/10 text-primary" : "hover:bg-accent"}`;
}

function labelForKind(kind: SourceDocumentPanelProps["kind"]): string {
  if (kind === "pdf") return "PDF";
  if (kind === "youtube") return "Video";
  return "OCR";
}
