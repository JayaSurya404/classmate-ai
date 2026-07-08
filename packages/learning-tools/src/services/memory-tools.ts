import type { MemoryAid, MemoryToolType } from "@classmate/contracts";
import { MemoryAidSchema } from "@classmate/contracts";

export interface MemoryToolsServiceOptions {
  filterByType?: MemoryToolType[];
}

export class MemoryToolsService {
  private aids: MemoryAid[];

  constructor(aids: MemoryAid[]) {
    this.aids = aids;
  }

  static createAid(
    type: MemoryToolType,
    concept: string,
    aid: string,
    explanation?: string,
    citations: string[] = []
  ): MemoryAid {
    return MemoryAidSchema.parse({
      id: crypto.randomUUID(),
      type,
      concept,
      aid,
      explanation,
      citations,
    });
  }

  getAids(options: MemoryToolsServiceOptions = {}): MemoryAid[] {
    let filtered = [...this.aids];

    if (options.filterByType) {
      filtered = filtered.filter((a: MemoryAid) => options.filterByType?.includes(a.type));
    }

    return filtered;
  }

  getAidById(aidId: string): MemoryAid | undefined {
    return this.aids.find((a) => a.id === aidId);
  }

  getAidsByConcept(concept: string): MemoryAid[] {
    return this.aids.filter((a: MemoryAid) =>
      a.concept.toLowerCase().includes(concept.toLowerCase())
    );
  }

  getAidsByType(type: MemoryToolType): MemoryAid[] {
    return this.aids.filter((a: MemoryAid) => a.type === type);
  }

  getAllConcepts(): string[] {
    const concepts = new Set<string>();
    this.aids.forEach((a: MemoryAid) => concepts.add(a.concept));
    return Array.from(concepts).sort();
  }

  getStatistics(): {
    total: number;
    byType: Record<MemoryToolType, number>;
  } {
    const stats = {
      total: this.aids.length,
      byType: {
        mnemonic: 0,
        acronym: 0,
        analogy: 0,
        story: 0,
        feynman: 0,
      } as Record<MemoryToolType, number>,
    };

    this.aids.forEach((a: MemoryAid) => {
      const type = a.type;
      const typeKey = type as keyof typeof stats.byType;
      const typeValue = stats.byType[typeKey];
      if (typeValue !== undefined) {
        stats.byType[typeKey] = typeValue + 1;
      }
    });

    return stats;
  }

  static parseFromMarkdown(markdown: string): MemoryAid[] {
    const lines = markdown.split("\n");
    const aids: MemoryAid[] = [];
    let currentAid: Partial<MemoryAid> | null = null;

    for (const line of lines) {
      const typeMatch = line.match(/^###\s*(mnemonic|acronym|analogy|story|feynman)/i);
      if (typeMatch) {
        if (currentAid && currentAid.concept && currentAid.aid) {
          aids.push(MemoryToolsService.createAidFromPartial(currentAid));
        }
        const matchedType = typeMatch[1]?.toLowerCase();
        if (matchedType) {
          currentAid = {
            type: matchedType as MemoryToolType,
            citations: [],
          };
        }
        continue;
      }

      if (!currentAid) continue;

      const conceptMatch = line.match(/^Concept:\s*(.*)/i);
      if (conceptMatch) {
        currentAid.concept = conceptMatch[1]?.trim() ?? "";
        continue;
      }

      const aidMatch = line.match(/^Aid:\s*(.*)/i);
      if (aidMatch) {
        currentAid.aid = aidMatch[1]?.trim() ?? "";
        continue;
      }

      const explanationMatch = line.match(/^Explanation:\s*(.*)/i);
      if (explanationMatch) {
        const explanation = explanationMatch[1]?.trim();
        if (explanation !== undefined) {
          currentAid.explanation = explanation;
        }
        continue;
      }
    }

    if (currentAid && currentAid.concept && currentAid.aid) {
      aids.push(MemoryToolsService.createAidFromPartial(currentAid));
    }

    return aids;
  }

  static exportToMarkdown(aids: MemoryAid[]): string {
    const lines: string[] = [`# Memory Aids`, ``, `Total aids: ${aids.length}`, ``];

    aids.forEach((a: MemoryAid) => {
      lines.push(`### ${a.type}`);
      lines.push(`Concept: ${a.concept}`);
      lines.push(`Aid: ${a.aid}`);
      if (a.explanation) {
        lines.push(`Explanation: ${a.explanation}`);
      }
      if (a.citations.length > 0) {
        lines.push(`Citations: ${a.citations.join(", ")}`);
      }
      lines.push(``);
    });

    return lines.join("\n");
  }

  static exportToJson(aids: MemoryAid[]): string {
    return JSON.stringify(aids, null, 2);
  }

  static exportToCsv(aids: MemoryAid[]): string {
    const headers = ["Type", "Concept", "Aid", "Explanation", "Citations"];
    const rows = aids.map((a: MemoryAid) => [
      a.type,
      `"${a.concept.replace(/"/g, '""')}"`,
      `"${a.aid.replace(/"/g, '""')}"`,
      a.explanation ? `"${a.explanation.replace(/"/g, '""')}"` : "",
      `"${a.citations.join(", ").replace(/"/g, '""')}"`,
    ]);

    return [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
  }

  private static createAidFromPartial(partial: Partial<MemoryAid>): MemoryAid {
    return MemoryAidSchema.parse({
      id: crypto.randomUUID(),
      type: partial.type ?? "mnemonic",
      concept: partial.concept ?? "",
      aid: partial.aid ?? "",
      explanation: partial.explanation,
      citations: partial.citations ?? [],
    });
  }
}
