import type { StudyPlan, StudyPlanItem, StudyPlanType } from "@classmate/contracts";
import { StudyPlanSchema, StudyPlanItemSchema } from "@classmate/contracts";

export interface StudyPlanServiceOptions {
  filterByType?: StudyPlanType[];
}

export class StudyPlanService {
  private studyPlan: StudyPlan;

  constructor(studyPlan: StudyPlan) {
    this.studyPlan = studyPlan;
  }

  static createStudyPlan(
    title: string,
    planType: StudyPlanType,
    sourceId?: string
  ): StudyPlan {
    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title,
      planType,
      sourceId,
      items: [],
      totalDuration: 0,
      createdAt: new Date().toISOString(),
    };
  }

  static addItem(studyPlan: StudyPlan, item: Omit<StudyPlanItem, "id">): StudyPlan {
    const newItem: StudyPlanItem = {
      ...item,
      id: crypto.randomUUID(),
    };
    const totalDuration = studyPlan.items.reduce((sum: number, i: StudyPlanItem) => sum + i.duration, 0) + item.duration;
    return {
      ...studyPlan,
      items: [...studyPlan.items, newItem],
      totalDuration,
    };
  }

  static updateItem(studyPlan: StudyPlan, itemId: string, updates: Partial<StudyPlanItem>): StudyPlan {
    const updatedItems = studyPlan.items.map((i: StudyPlanItem) =>
      i.id === itemId ? { ...i, ...updates } : i
    );
    const totalDuration = updatedItems.reduce((sum: number, i: StudyPlanItem) => sum + i.duration, 0);
    return {
      ...studyPlan,
      items: updatedItems,
      totalDuration,
    };
  }

  static deleteItem(studyPlan: StudyPlan, itemId: string): StudyPlan {
    const updatedItems = studyPlan.items.filter((i: StudyPlanItem) => i.id !== itemId);
    const totalDuration = updatedItems.reduce((sum: number, i: StudyPlanItem) => sum + i.duration, 0);
    return {
      ...studyPlan,
      items: updatedItems,
      totalDuration,
    };
  }

  static reorderItems(studyPlan: StudyPlan, itemIds: string[]): StudyPlan {
    const itemMap = new Map(studyPlan.items.map((i: StudyPlanItem) => [i.id, i]));
    const reorderedItems = itemIds
      .map((id: string) => itemMap.get(id))
      .filter((i): i is StudyPlanItem => i !== undefined)
      .map((i: StudyPlanItem, index: number) => ({ ...i, order: index }));

    return {
      ...studyPlan,
      items: reorderedItems,
    };
  }

  getItems(): readonly StudyPlanItem[] {
    return this.studyPlan.items;
  }

  getItemById(itemId: string): StudyPlanItem | undefined {
    return this.studyPlan.items.find((i: StudyPlanItem) => i.id === itemId);
  }

  getItemsByOrder(): StudyPlanItem[] {
    return [...this.studyPlan.items].sort((a: StudyPlanItem, b: StudyPlanItem) => a.order - b.order);
  }

  getTotalDuration(): number {
    return this.studyPlan.totalDuration;
  }

  getFormattedDuration(): string {
    const minutes = this.studyPlan.totalDuration;
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  }

  getStatistics(): {
    totalItems: number;
    totalDuration: number;
    averageDuration: number;
    totalTopics: number;
  } {
    const totalTopics = this.studyPlan.items.reduce((sum: number, i: StudyPlanItem) => sum + i.topics.length, 0);
    return {
      totalItems: this.studyPlan.items.length,
      totalDuration: this.studyPlan.totalDuration,
      averageDuration: this.studyPlan.items.length > 0
        ? Math.round(this.studyPlan.totalDuration / this.studyPlan.items.length)
        : 0,
      totalTopics,
    };
  }

  static generatePlanByType(
    planType: StudyPlanType,
    sourceContent: string,
    title: string
  ): StudyPlan {
    const basePlan = StudyPlanService.createStudyPlan(title, planType);

    switch (planType) {
      case "30_min": {
        const items: Omit<StudyPlanItem, "id">[] = [
          { title: "Quick Review", duration: 10, order: 0, topics: ["Key concepts"] },
          { title: "Practice", duration: 15, order: 1, topics: ["Exercises"] },
          { title: "Summary", duration: 5, order: 2, topics: ["Recap"] },
        ];
        return items.reduce((plan: StudyPlan, item: Omit<StudyPlanItem, "id">) =>
          StudyPlanService.addItem(plan, item), basePlan);
      }
      case "1_hour": {
        const items: Omit<StudyPlanItem, "id">[] = [
          { title: "Introduction", duration: 10, order: 0, topics: ["Overview"] },
          { title: "Deep Dive", duration: 25, order: 1, topics: ["Main concepts"] },
          { title: "Practice", duration: 15, order: 2, topics: ["Exercises"] },
          { title: "Review", duration: 10, order: 3, topics: ["Summary"] },
        ];
        return items.reduce((plan: StudyPlan, item: Omit<StudyPlanItem, "id">) =>
          StudyPlanService.addItem(plan, item), basePlan);
      }
      case "tomorrow_exam": {
        const items: Omit<StudyPlanItem, "id">[] = [
          { title: "Last Minute Review", duration: 20, order: 0, topics: ["Key formulas", "Definitions"] },
          { title: "Practice Questions", duration: 30, order: 1, topics: ["Sample problems"] },
          { title: "Final Check", duration: 10, order: 2, topics: ["Important points"] },
        ];
        return items.reduce((plan: StudyPlan, item: Omit<StudyPlanItem, "id">) =>
          StudyPlanService.addItem(plan, item), basePlan);
      }
      case "one_week": {
        const items: Omit<StudyPlanItem, "id">[] = [
          { title: "Day 1: Foundation", duration: 60, order: 0, topics: ["Basics"] },
          { title: "Day 2: Core Concepts", duration: 60, order: 1, topics: ["Main topics"] },
          { title: "Day 3: Advanced Topics", duration: 60, order: 2, topics: ["Complex concepts"] },
          { title: "Day 4: Practice", duration: 60, order: 3, topics: ["Exercises"] },
          { title: "Day 5: Review", duration: 45, order: 4, topics: ["Revision"] },
          { title: "Day 6: Mock Test", duration: 60, order: 5, topics: ["Practice test"] },
          { title: "Day 7: Final Prep", duration: 45, order: 6, topics: ["Final review"] },
        ];
        return items.reduce((plan: StudyPlan, item: Omit<StudyPlanItem, "id">) =>
          StudyPlanService.addItem(plan, item), basePlan);
      }
    }
  }

  static parseFromMarkdown(markdown: string): StudyPlan {
    const lines = markdown.split("\n");
    const items: StudyPlanItem[] = [];
    let currentItem: Partial<StudyPlanItem> | null = null;
    let planType: StudyPlanType = "30_min";

    for (const line of lines) {
      const typeMatch = line.match(/^Plan Type:\s*(30_min|1_hour|tomorrow_exam|one_week)/i);
      if (typeMatch) {
        const matchedType = typeMatch[1]?.toLowerCase();
        if (matchedType === "30_min" || matchedType === "1_hour" || matchedType === "tomorrow_exam" || matchedType === "one_week") {
          planType = matchedType as StudyPlanType;
        }
        continue;
      }

      const itemMatch = line.match(/^##\s*(.*)/);
      if (itemMatch) {
        if (currentItem && currentItem.title && currentItem.duration !== undefined) {
          items.push(StudyPlanService.createItemFromPartial(currentItem, items.length));
        }
        currentItem = {
          title: itemMatch[1]?.trim() ?? "",
          topics: [],
        };
        continue;
      }

      if (!currentItem) continue;

      const durationMatch = line.match(/^Duration:\s*(\d+)/i);
      if (durationMatch) {
        const duration = parseInt(durationMatch[1] ?? "0", 10);
        if (!isNaN(duration)) {
          currentItem.duration = duration;
        }
        continue;
      }

      const topicsMatch = line.match(/^Topics:\s*(.*)/i);
      if (topicsMatch) {
        currentItem.topics = topicsMatch[1]?.split(",").map((t: string) => t.trim()).filter(Boolean) ?? [];
        continue;
      }
    }

    if (currentItem && currentItem.title && currentItem.duration !== undefined) {
      items.push(StudyPlanService.createItemFromPartial(currentItem, items.length));
    }

    const totalDuration = items.reduce((sum: number, i: StudyPlanItem) => sum + i.duration, 0);

    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title: "Imported Study Plan",
      planType,
      items,
      totalDuration,
      createdAt: new Date().toISOString(),
    };
  }

  static exportToMarkdown(studyPlan: StudyPlan): string {
    const lines: string[] = [
      `# ${studyPlan.title}`,
      ``,
      `Plan Type: ${studyPlan.planType}`,
      `Total Duration: ${studyPlan.totalDuration} minutes`,
      `Total Items: ${studyPlan.items.length}`,
      ``,
    ];

    studyPlan.items.forEach((item: StudyPlanItem) => {
      lines.push(`## ${item.title}`);
      lines.push(`Duration: ${item.duration} minutes`);
      if (item.topics.length > 0) {
        lines.push(`Topics: ${item.topics.join(", ")}`);
      }
      lines.push(``);
    });

    return lines.join("\n");
  }

  static exportToJson(studyPlan: StudyPlan): string {
    return JSON.stringify(studyPlan, null, 2);
  }

  static exportToCsv(studyPlan: StudyPlan): string {
    const headers = ["Order", "Title", "Duration (min)", "Topics"];
    const rows: Array<Array<string | number>> = studyPlan.items.map((item: StudyPlanItem) => [
      item.order,
      `"${item.title.replace(/"/g, '""')}"`,
      item.duration,
      `"${item.topics.join(", ").replace(/"/g, '""')}"`,
    ]);

    return [headers.join(","), ...rows.map((r) => r.map((value) => String(value)).join(","))].join("\n");
  }

  private static createItemFromPartial(partial: Partial<StudyPlanItem>, order: number): StudyPlanItem {
    return StudyPlanItemSchema.parse({
      id: crypto.randomUUID(),
      title: partial.title ?? "",
      duration: partial.duration ?? 30,
      order: partial.order ?? order,
      topics: partial.topics ?? [],
    });
  }
}
