import type { MindMap, MindMapNode } from "@classmate/contracts";
import { MindMapSchema, MindMapNodeSchema } from "@classmate/contracts";

export class MindMapService {
  private mindMap: MindMap;

  constructor(mindMap: MindMap) {
    this.mindMap = mindMap;
  }

  static createMindMap(title: string, sourceId?: string): MindMap {
    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title,
      sourceId,
      nodes: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static addNode(mindMap: MindMap, node: Omit<MindMapNode, "id">): MindMap {
    const newNode: MindMapNode = {
      ...node,
      id: crypto.randomUUID(),
    };
    return {
      ...mindMap,
      nodes: [...mindMap.nodes, newNode],
      updatedAt: new Date().toISOString(),
    };
  }

  static updateNode(mindMap: MindMap, nodeId: string, updates: Partial<MindMapNode>): MindMap {
    return {
      ...mindMap,
      nodes: mindMap.nodes.map((n: MindMapNode) =>
        n.id === nodeId ? { ...n, ...updates } : n
      ),
      updatedAt: new Date().toISOString(),
    };
  }

  static deleteNode(mindMap: MindMap, nodeId: string): MindMap {
    const nodeToDelete = mindMap.nodes.find((n: MindMapNode) => n.id === nodeId);
    if (!nodeToDelete) return mindMap;

    const updatedNodes = mindMap.nodes
      .filter((n: MindMapNode) => n.id !== nodeId)
      .map((n: MindMapNode) => ({
        ...n,
        children: n.children.filter((childId: string) => childId !== nodeId),
        parentId: n.parentId === nodeId ? null : n.parentId,
      }));

    return {
      ...mindMap,
      nodes: updatedNodes,
      updatedAt: new Date().toISOString(),
    };
  }

  static toggleNodeExpansion(mindMap: MindMap, nodeId: string): MindMap {
    const node = mindMap.nodes.find((n: MindMapNode) => n.id === nodeId);
    if (!node) return mindMap;
    return MindMapService.updateNode(mindMap, nodeId, {
      isExpanded: !node.isExpanded,
    });
  }

  getNodes(): readonly MindMapNode[] {
    return this.mindMap.nodes;
  }

  getNodeById(nodeId: string): MindMapNode | undefined {
    return this.mindMap.nodes.find((n: MindMapNode) => n.id === nodeId);
  }

  getRootNodes(): MindMapNode[] {
    return this.mindMap.nodes.filter((n: MindMapNode) => n.parentId === null);
  }

  getChildren(parentId: string): MindMapNode[] {
    return this.mindMap.nodes.filter((n: MindMapNode) => n.parentId === parentId);
  }

  getDescendants(nodeId: string): MindMapNode[] {
    const descendants: MindMapNode[] = [];
    const children = this.getChildren(nodeId);
    children.forEach((child: MindMapNode) => {
      descendants.push(child);
      descendants.push(...this.getDescendants(child.id));
    });
    return descendants;
  }

  getAncestors(nodeId: string): MindMapNode[] {
    const ancestors: MindMapNode[] = [];
    let currentNode = this.getNodeById(nodeId);
    while (currentNode?.parentId) {
      const parent = this.getNodeById(currentNode.parentId);
      if (parent) {
        ancestors.unshift(parent);
        currentNode = parent;
      } else {
        break;
      }
    }
    return ancestors;
  }

  getPath(nodeId: string): MindMapNode[] {
    const node = this.getNodeById(nodeId);
    if (!node) return [];
    return [...this.getAncestors(nodeId), node];
  }

  getMaxDepth(): number {
    let maxDepth = 0;
    this.mindMap.nodes.forEach((n: MindMapNode) => {
      if (n.level > maxDepth) maxDepth = n.level;
    });
    return maxDepth;
  }

  getNodeCount(): number {
    return this.mindMap.nodes.length;
  }

  static parseFromMarkdown(markdown: string): MindMap {
    const lines = markdown.split("\n");
    const nodes: MindMapNode[] = [];
    const nodeStack: MindMapNode[] = [];

    for (const line of lines) {
      const depthMatch = line.match(/^(\s*)-\s*(.*)/);
      if (depthMatch) {
        const indent = depthMatch[1] ?? "";
        const depth = indent.length / 2;
        const label = depthMatch[2]?.trim() ?? "";

        const newNode: MindMapNode = MindMapNodeSchema.parse({
          id: crypto.randomUUID(),
          label,
          parentId: null,
          children: [],
          level: depth,
          isExpanded: true,
        });

        while (nodeStack.length > depth) {
          nodeStack.pop();
        }

        if (nodeStack.length > 0) {
          const parent = nodeStack[nodeStack.length - 1];
          if (parent) {
            newNode.parentId = parent.id;
            parent.children.push(newNode.id);
          }
        }

        nodes.push(newNode);
        nodeStack.push(newNode);
      }
    }

    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title: "Imported Mind Map",
      nodes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static exportToMarkdown(mindMap: MindMap): string {
    const lines: string[] = [`# ${mindMap.title}`, ``, `Total nodes: ${mindMap.nodes.length}`, ``];

    const rootNodes = mindMap.nodes.filter((n: MindMapNode) => n.parentId === null);
    rootNodes.forEach((root: MindMapNode) => {
      MindMapService.exportNodeRecursive(mindMap, root, 0, lines);
    });

    return lines.join("\n");
  }

  private static exportNodeRecursive(
    mindMap: MindMap,
    node: MindMapNode,
    depth: number,
    lines: string[]
  ): void {
    const indent = "  ".repeat(depth);
    lines.push(`${indent}- ${node.label}`);

    if (node.isExpanded) {
      const children = mindMap.nodes.filter((n: MindMapNode) => n.parentId === node.id);
      children.forEach((child: MindMapNode) => {
        MindMapService.exportNodeRecursive(mindMap, child, depth + 1, lines);
      });
    }
  }

  static exportToJson(mindMap: MindMap): string {
    return JSON.stringify(mindMap, null, 2);
  }

  static exportToCsv(mindMap: MindMap): string {
    const headers = ["ID", "Label", "Parent ID", "Level", "Children Count", "Expanded"];
    const rows: Array<Array<string | number>> = mindMap.nodes.map((n: MindMapNode) => [
      n.id,
      `"${n.label.replace(/"/g, '""')}"`,
      n.parentId ?? "",
      n.level,
      n.children.length,
      n.isExpanded ? "Yes" : "No",
    ]);

    return [headers.join(","), ...rows.map((r) => r.map((value) => String(value)).join(","))].join("\n");
  }
}
