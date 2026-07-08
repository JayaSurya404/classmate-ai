import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown, ChevronRight, Download, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@classmate/ui";
import { cn } from "@classmate/ui";
import type { MindMap, MindMapNode } from "@classmate/contracts";

interface MindMapViewProps {
  mindMap: MindMap;
  onUpdateMindMap: (mindMap: MindMap) => void;
  onExport: (format: "markdown" | "json" | "csv") => void;
}

export function MindMapView({ mindMap, onUpdateMindMap, onExport }: MindMapViewProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<"tree" | "compact">("tree");

  const toggleNode = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    setExpandedNodes(new Set(mindMap.nodes.map((n) => n.id)));
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const rootNodes = mindMap.nodes.filter((n) => n.parentId === null);

  const renderNode = (node: MindMapNode, depth: number = 0) => {
    const isExpanded = expandedNodes.has(node.id);
    const children = mindMap.nodes.filter((n) => n.parentId === node.id);
    const hasChildren = children.length > 0;

    return (
      <div key={node.id} className="relative">
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border border-border bg-card p-3 transition-colors",
            depth === 0 && "bg-primary/5 border-primary/20",
            "hover:bg-accent"
          )}
          style={{ marginLeft: `${depth * 20}px` }}
        >
          {hasChildren && (
            <button
              type="button"
              onClick={() => toggleNode(node.id)}
              className="flex-shrink-0 text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? (
                <ChevronDown className="size-4" />
              ) : (
                <ChevronRight className="size-4" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          <span className={cn("font-medium", depth === 0 && "text-lg")}>{node.label}</span>
          <span className="ml-auto text-xs text-muted-foreground">
            Level {node.level}
          </span>
        </div>

        {isExpanded && hasChildren && (
          <div className="mt-2 space-y-2">
            {children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const stats = {
    totalNodes: mindMap.nodes.length,
    maxDepth: Math.max(...mindMap.nodes.map((n) => n.level)),
    expanded: expandedNodes.size,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-title font-bold">{mindMap.title}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(viewMode === "tree" ? "compact" : "tree")}
          >
            {viewMode === "tree" ? (
              <Minimize2 className="size-4" />
            ) : (
              <Maximize2 className="size-4" />
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport("markdown")}>
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
          <span>Total Nodes: {stats.totalNodes}</span>
          <span>Max Depth: {stats.maxDepth}</span>
          <span>Expanded: {stats.expanded}</span>
        </div>

        {rootNodes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>This mind map has no nodes.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {rootNodes.map((node) => (
              <motion.div
                key={node.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2 }}
              >
                {renderNode(node)}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
