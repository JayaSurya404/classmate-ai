import { motion } from "framer-motion";
import { GitBranch, Link2, Radar, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { RetrievalCache, SemanticRetrievalService } from "@classmate/ai-core";
import { Badge, Button, Card, Input, Progress } from "@classmate/ui";
import type { EmbeddingRecord, RetrievalEvidence, SemanticCluster, SourceSnapshot } from "@classmate/contracts";
import { localRepositories } from "../../adapters/local-db/database";

export interface SemanticSearchViewProps {
  source?: SourceSnapshot | undefined;
}

export function SemanticSearchView({ source }: SemanticSearchViewProps) {
  const [query, setQuery] = useState("");
  const [records, setRecords] = useState<EmbeddingRecord[]>([]);
  const [results, setResults] = useState<RetrievalEvidence[]>([]);
  const [clusters, setClusters] = useState<SemanticCluster[]>([]);
  const [status, setStatus] = useState("Ready for offline semantic search.");
  const service = useMemo(() => new SemanticRetrievalService(records), [records]);

  useEffect(() => {
    let active = true;
    void Promise.all([localRepositories.embeddings.list(), localRepositories.semanticClusters.list()]).then(([storedRecords, storedClusters]) => {
      if (!active) return;
      setRecords(storedRecords);
      setClusters(storedClusters);
    });
    return () => {
      active = false;
    };
  }, []);

  const indexCurrentSource = async (): Promise<void> => {
    if (!source) {
      setStatus("Capture a source before indexing.");
      return;
    }
    const nextService = new SemanticRetrievalService(records);
    await localRepositories.embeddings.clearSource(source.id);
    const nextRecords = nextService.indexSource(source);
    const nextClusters = nextService.clusters();
    await Promise.all([
      localRepositories.embeddings.bulkSave(nextRecords),
      localRepositories.semanticClusters.bulkSave(nextClusters),
    ]);
    setRecords((current) => [...current.filter((record) => record.sourceId !== source.id), ...nextRecords]);
    setClusters(nextClusters);
    setStatus(`Indexed ${String(nextRecords.length)} chunks for ${source.title}.`);
  };

  const runSearch = async (): Promise<void> => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const cache = new RetrievalCache();
    const evidence = service.search({ query: trimmed, limit: 8 });
    const entry = cache.set(trimmed, evidence);
    await localRepositories.retrievalCache.save(entry);
    setResults(evidence);
    setStatus(evidence.length > 0 ? `Found ${String(evidence.length)} semantic matches.` : "No semantic matches found.");
  };

  const rag = query.trim() ? service.buildRagContext(query) : undefined;
  const concepts = query.trim() ? service.relatedConcepts(query, 10) : [];
  const duplicates = service.duplicates();

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col gap-3 p-[var(--panel-px)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-title font-bold">Semantic Search</h2>
          <p className="text-sm text-muted-foreground">Offline embeddings, hybrid retrieval, local RAG, related concepts, and duplicate detection.</p>
        </div>
        <Button size="sm" onClick={indexCurrentSource}><Radar className="size-4" />Index source</Button>
      </header>

      <Card className="p-3">
        <label htmlFor="semantic-query" className="text-sm font-medium">Search across indexed knowledge</label>
        <div className="mt-2 flex gap-2">
          <Input id="semantic-query" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void runSearch(); }} placeholder="Ask about a concept, source, PDF, video, note, or exam topic" />
          <Button onClick={() => { void runSearch(); }}><Search className="size-4" />Search</Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{status}</p>
      </Card>

      <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[1fr_18rem]">
        <main className="min-h-0 overflow-y-auto">
          <div className="grid gap-3">
            {results.map((result) => (
              <Card key={result.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold">{result.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{result.headingPath.join(" / ") || "Indexed source"}</p>
                  </div>
                  <Badge>{Math.round(result.score * 100)}%</Badge>
                </div>
                <p className="mt-3 text-sm">{result.text}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <Metric label="Keyword" value={result.keywordScore} />
                  <Metric label="Vector" value={result.vectorScore} />
                </div>
              </Card>
            ))}
            {query && results.length === 0 && <Card className="p-6 text-center text-muted-foreground">Run a search to retrieve semantic matches.</Card>}
          </div>
        </main>

        <aside className="space-y-3 overflow-y-auto">
          <Card className="p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Sparkles className="size-4" />Local RAG</h3>
            <p className="mt-2 text-xs text-muted-foreground">Evidence score: {rag ? Math.round(rag.evidenceScore * 100) : 0}%</p>
            <p className="text-xs text-muted-foreground">Tokens: {rag?.estimatedTokens ?? 0}</p>
          </Card>
          <Card className="p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><Link2 className="size-4" />Similar Concepts</h3>
            <div className="mt-2 flex flex-wrap gap-1">{concepts.map((concept) => <Badge key={concept}>{concept}</Badge>)}</div>
          </Card>
          <Card className="p-3">
            <h3 className="flex items-center gap-2 text-sm font-semibold"><GitBranch className="size-4" />Graph Cache</h3>
            <p className="mt-2 text-xs text-muted-foreground">{clusters.length} semantic clusters · {duplicates.length} duplicates</p>
            <div className="mt-2 space-y-2">{clusters.slice(0, 6).map((cluster) => <p key={cluster.id} className="text-xs">{cluster.label}: {cluster.recordIds.length} chunks</p>)}</div>
          </Card>
        </aside>
      </div>
    </motion.section>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs text-muted-foreground"><span>{label}</span><span>{Math.round(value * 100)}%</span></div>
      <Progress value={Math.round(value * 100)} />
    </div>
  );
}
