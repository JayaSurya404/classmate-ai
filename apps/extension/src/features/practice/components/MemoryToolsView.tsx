import { motion } from "framer-motion";
import { useState } from "react";
import { Brain, Download, Filter } from "lucide-react";
import { Button } from "@classmate/ui";
import { cn } from "@classmate/ui";
import type { MemoryAid, MemoryToolType } from "@classmate/contracts";

interface MemoryToolsViewProps {
  aids: MemoryAid[];
  onExport: (format: "markdown" | "json" | "csv") => void;
}

export function MemoryToolsView({ aids, onExport }: MemoryToolsViewProps) {
  const [filterType, setFilterType] = useState<MemoryToolType | "all">("all");
  const [selectedConcept, setSelectedConcept] = useState<string>("");

  const filteredAids = aids.filter((aid) => {
    if (filterType !== "all" && aid.type !== filterType) return false;
    if (selectedConcept && !aid.concept.toLowerCase().includes(selectedConcept.toLowerCase())) return false;
    return true;
  });

  const concepts = Array.from(new Set(aids.map((a) => a.concept))).sort();

  const typeLabels: Record<MemoryToolType, string> = {
    mnemonic: "Mnemonic",
    acronym: "Acronym",
    analogy: "Analogy",
    story: "Story Method",
    feynman: "Feynman Explanation",
  };

  const stats = {
    total: aids.length,
    byType: {
      mnemonic: aids.filter((a) => a.type === "mnemonic").length,
      acronym: aids.filter((a) => a.type === "acronym").length,
      analogy: aids.filter((a) => a.type === "analogy").length,
      story: aids.filter((a) => a.type === "story").length,
      feynman: aids.filter((a) => a.type === "feynman").length,
    },
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-title font-bold">Memory Tools</h2>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as MemoryToolType | "all")}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">All Types</option>
            <option value="mnemonic">Mnemonic</option>
            <option value="acronym">Acronym</option>
            <option value="analogy">Analogy</option>
            <option value="story">Story Method</option>
            <option value="feynman">Feynman Explanation</option>
          </select>
          <Button variant="outline" size="sm" onClick={() => onExport("markdown")}>
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
          <span>Total: {stats.total}</span>
          <span>Mnemonics: {stats.byType.mnemonic}</span>
          <span>Acronyms: {stats.byType.acronym}</span>
          <span>Analogies: {stats.byType.analogy}</span>
          <span>Stories: {stats.byType.story}</span>
          <span>Feynman: {stats.byType.feynman}</span>
        </div>

        {concepts.length > 1 && (
          <div className="mb-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-medium">
              <Filter className="size-4" />
              Filter by Concept
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSelectedConcept("")}
                className={cn(
                  "rounded-full border border-border px-3 py-1 text-sm transition-colors",
                  selectedConcept === "" ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"
                )}
              >
                All Concepts
              </button>
              {concepts.map((concept) => (
                <button
                  key={concept}
                  type="button"
                  onClick={() => setSelectedConcept(concept)}
                  className={cn(
                    "rounded-full border border-border px-3 py-1 text-sm transition-colors",
                    selectedConcept === concept ? "border-primary bg-primary/10 text-primary" : "hover:bg-accent"
                  )}
                >
                  {concept}
                </button>
              ))}
            </div>
          </div>
        )}

        {filteredAids.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>No memory aids match the current filters.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAids.map((aid, idx) => (
              <motion.div
                key={aid.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="rounded-xl border border-border bg-card p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    <Brain className="mr-1 size-3" />
                    {typeLabels[aid.type]}
                  </span>
                  {aid.citations.length > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {aid.citations.length} citation(s)
                    </span>
                  )}
                </div>

                <h3 className="mb-2 text-lg font-semibold">{aid.concept}</h3>

                <div className="mb-3 rounded-lg bg-accent p-4">
                  <p className="text-sm leading-relaxed">{aid.aid}</p>
                </div>

                {aid.explanation && (
                  <div className="text-sm text-muted-foreground">
                    <span className="font-medium">Explanation: </span>
                    {aid.explanation}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
