import type { FlashcardDeck, Flashcard, Quiz, QuizQuestion, QuizAttempt, MemoryAid, MindMap, MindMapNode, StudyPlan, StudyPlanItem } from "@classmate/contracts";

export type ExportFormat = "markdown" | "json" | "csv";

export interface ExportOptions {
  format: ExportFormat;
  includeMetadata?: boolean;
}

export class ExportService {
  static exportFlashcards(deck: FlashcardDeck, options: ExportOptions = { format: "markdown" }): string {
    const { format } = options;

    switch (format) {
      case "markdown":
        return this.flashcardsToMarkdown(deck);
      case "json":
        return JSON.stringify(deck, null, 2);
      case "csv":
        return this.flashcardsToCsv(deck);
      default:
        return this.flashcardsToMarkdown(deck);
    }
  }

  static exportQuiz(quiz: Quiz, options: ExportOptions = { format: "markdown" }): string {
    const { format } = options;

    switch (format) {
      case "markdown":
        return this.quizToMarkdown(quiz);
      case "json":
        return JSON.stringify(quiz, null, 2);
      case "csv":
        return this.quizToCsv(quiz);
      default:
        return this.quizToMarkdown(quiz);
    }
  }

  static exportMemoryAids(aids: MemoryAid[], options: ExportOptions = { format: "markdown" }): string {
    const { format } = options;

    switch (format) {
      case "markdown":
        return this.memoryAidsToMarkdown(aids);
      case "json":
        return JSON.stringify(aids, null, 2);
      case "csv":
        return this.memoryAidsToCsv(aids);
      default:
        return this.memoryAidsToMarkdown(aids);
    }
  }

  static exportMindMap(mindMap: MindMap, options: ExportOptions = { format: "markdown" }): string {
    const { format } = options;

    switch (format) {
      case "markdown":
        return this.mindMapToMarkdown(mindMap);
      case "json":
        return JSON.stringify(mindMap, null, 2);
      case "csv":
        return this.mindMapToCsv(mindMap);
      default:
        return this.mindMapToMarkdown(mindMap);
    }
  }

  static exportStudyPlan(studyPlan: StudyPlan, options: ExportOptions = { format: "markdown" }): string {
    const { format } = options;

    switch (format) {
      case "markdown":
        return this.studyPlanToMarkdown(studyPlan);
      case "json":
        return JSON.stringify(studyPlan, null, 2);
      case "csv":
        return this.studyPlanToCsv(studyPlan);
      default:
        return this.studyPlanToMarkdown(studyPlan);
    }
  }

  private static flashcardsToMarkdown(deck: FlashcardDeck): string {
    const lines: string[] = [`# ${deck.title}`, ``, `Total cards: ${deck.cards.length}`, ``];

    deck.cards.forEach((card: Flashcard) => {
      lines.push(`### ${card.type}`);
      lines.push(`Front: ${card.front}`);
      lines.push(`Back: ${card.back}`);
      lines.push(`Difficulty: ${card.difficulty}`);
      if (card.tags.length > 0) {
        lines.push(`Tags: ${card.tags.join(", ")}`);
      }
      if (card.isFavorite) {
        lines.push(`⭐ Favorite`);
      }
      if (card.reviewCount > 0) {
        lines.push(`Reviewed: ${card.reviewCount} times`);
      }
      lines.push(``);
    });

    return lines.join("\n");
  }

  private static flashcardsToCsv(deck: FlashcardDeck): string {
    const headers = ["Type", "Front", "Back", "Difficulty", "Tags", "Favorite", "Review Count"];
    const rows: Array<Array<string | number>> = deck.cards.map((card: Flashcard) => [
      card.type,
      `"${card.front.replace(/"/g, '""')}"`,
      `"${card.back.replace(/"/g, '""')}"`,
      card.difficulty,
      `"${card.tags.join(", ")}"`,
      card.isFavorite ? "Yes" : "No",
      card.reviewCount,
    ]);

    return [headers.join(","), ...rows.map((r) => r.map((value) => String(value)).join(","))].join("\n");
  }

  private static quizToMarkdown(quiz: Quiz): string {
    const lines: string[] = [`# ${quiz.title}`, ``, `Total questions: ${quiz.questions.length}`, ``];

    quiz.questions.forEach((question: QuizQuestion) => {
      lines.push(`### ${question.type}`);
      lines.push(`Question: ${question.prompt}`);
      if (question.choices && question.choices.length > 0) {
        lines.push(`Choices: ${question.choices.join(" | ")}`);
      }
      lines.push(`Answer: ${Array.isArray(question.correctAnswer) ? question.correctAnswer.join(", ") : question.correctAnswer}`);
      if (question.explanation) {
        lines.push(`Explanation: ${question.explanation}`);
      }
      lines.push(`Difficulty: ${question.difficulty}`);
      lines.push(``);
    });

    if (quiz.attempts.length > 0) {
      lines.push(`## Attempts`);
      lines.push(``);
      quiz.attempts.forEach((attempt: QuizAttempt) => {
        lines.push(`- Score: ${attempt.score}% (${attempt.completedAt})`);
      });
    }

    return lines.join("\n");
  }

  private static quizToCsv(quiz: Quiz): string {
    const headers = ["Type", "Question", "Choices", "Answer", "Explanation", "Difficulty"];
    const rows: Array<Array<string | number>> = quiz.questions.map((question: QuizQuestion) => [
      question.type,
      `"${question.prompt.replace(/"/g, '""')}"`,
      question.choices ? `"${question.choices.join(" | ").replace(/"/g, '""')}"` : "",
      Array.isArray(question.correctAnswer)
        ? `"${question.correctAnswer.join(", ").replace(/"/g, '""')}"`
        : `"${question.correctAnswer.replace(/"/g, '""')}"`,
      question.explanation ? `"${question.explanation.replace(/"/g, '""')}"` : "",
      question.difficulty,
    ]);

    return [headers.join(","), ...rows.map((r) => r.map((value) => String(value)).join(","))].join("\n");
  }

  private static memoryAidsToMarkdown(aids: MemoryAid[]): string {
    const lines: string[] = [`# Memory Aids`, ``, `Total aids: ${aids.length}`, ``];

    aids.forEach((aid: MemoryAid) => {
      lines.push(`### ${aid.type}`);
      lines.push(`Concept: ${aid.concept}`);
      lines.push(`Aid: ${aid.aid}`);
      if (aid.explanation) {
        lines.push(`Explanation: ${aid.explanation}`);
      }
      if (aid.citations.length > 0) {
        lines.push(`Citations: ${aid.citations.join(", ")}`);
      }
      lines.push(``);
    });

    return lines.join("\n");
  }

  private static memoryAidsToCsv(aids: MemoryAid[]): string {
    const headers = ["Type", "Concept", "Aid", "Explanation", "Citations"];
    const rows: Array<Array<string | number>> = aids.map((aid: MemoryAid) => [
      aid.type,
      `"${aid.concept.replace(/"/g, '""')}"`,
      `"${aid.aid.replace(/"/g, '""')}"`,
      aid.explanation ? `"${aid.explanation.replace(/"/g, '""')}"` : "",
      `"${aid.citations.join(", ").replace(/"/g, '""')}"`,
    ]);

    return [headers.join(","), ...rows.map((r) => r.map((value) => String(value)).join(","))].join("\n");
  }

  private static mindMapToMarkdown(mindMap: MindMap): string {
    const lines: string[] = [`# ${mindMap.title}`, ``, `Total nodes: ${mindMap.nodes.length}`, ``];

    const rootNodes = mindMap.nodes.filter((n: MindMapNode) => n.parentId === null);
    rootNodes.forEach((root: MindMapNode) => {
      this.exportNodeRecursive(mindMap, root, 0, lines);
    });

    return lines.join("\n");
  }

  private static exportNodeRecursive(
    mindMap: MindMap,
    node: { id: string; label: string; parentId: string | null; children: string[]; level: number; isExpanded: boolean },
    depth: number,
    lines: string[]
  ): void {
    const indent = "  ".repeat(depth);
    lines.push(`${indent}- ${node.label}`);

    if (node.isExpanded) {
      const children = mindMap.nodes.filter((n: MindMapNode) => n.parentId === node.id);
      children.forEach((child: MindMapNode) => {
        this.exportNodeRecursive(mindMap, child, depth + 1, lines);
      });
    }
  }

  private static mindMapToCsv(mindMap: MindMap): string {
    const headers = ["ID", "Label", "Parent ID", "Level", "Children Count", "Expanded"];
    const rows: Array<Array<string | number>> = mindMap.nodes.map((node: MindMapNode) => [
      node.id,
      `"${node.label.replace(/"/g, '""')}"`,
      node.parentId ?? "",
      node.level,
      node.children.length,
      node.isExpanded ? "Yes" : "No",
    ]);

    return [headers.join(","), ...rows.map((r) => r.map((value) => String(value)).join(","))].join("\n");
  }

  private static studyPlanToMarkdown(studyPlan: StudyPlan): string {
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

  private static studyPlanToCsv(studyPlan: StudyPlan): string {
    const headers = ["Order", "Title", "Duration (min)", "Topics"];
    const rows: Array<Array<string | number>> = studyPlan.items.map((item: StudyPlanItem) => [
      item.order,
      `"${item.title.replace(/"/g, '""')}"`,
      item.duration,
      `"${item.topics.join(", ").replace(/"/g, '""')}"`,
    ]);

    return [headers.join(","), ...rows.map((r) => r.map((value) => String(value)).join(","))].join("\n");
  }

  static downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  static getMimeType(format: ExportFormat): string {
    switch (format) {
      case "markdown":
        return "text/markdown";
      case "json":
        return "application/json";
      case "csv":
        return "text/csv";
      default:
        return "text/plain";
    }
  }

  static getFileExtension(format: ExportFormat): string {
    switch (format) {
      case "markdown":
        return ".md";
      case "json":
        return ".json";
      case "csv":
        return ".csv";
      default:
        return ".txt";
    }
  }
}
