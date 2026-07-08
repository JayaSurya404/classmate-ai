import type { Flashcard, FlashcardDeck, FlashcardType } from "@classmate/contracts";
import { FlashcardSchema, FlashcardDeckSchema } from "@classmate/contracts";

export interface FlashcardsServiceOptions {
  shuffle?: boolean;
  filterByType?: FlashcardType[];
  filterByDifficulty?: ("easy" | "medium" | "hard")[];
  favoritesOnly?: boolean;
}

export class FlashcardsService {
  private deck: FlashcardDeck;

  constructor(deck: FlashcardDeck) {
    this.deck = deck;
  }

  static createDeck(title: string, sourceId?: string): FlashcardDeck {
    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title,
      sourceId,
      cards: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static addCard(deck: FlashcardDeck, card: Omit<Flashcard, "id" | "reviewCount" | "lastReviewedAt">): FlashcardDeck {
    const newCard: Flashcard = {
      ...card,
      id: crypto.randomUUID(),
      reviewCount: 0,
      lastReviewedAt: undefined,
    };
    return {
      ...deck,
      cards: [...deck.cards, newCard],
      updatedAt: new Date().toISOString(),
    };
  }

  static updateCard(deck: FlashcardDeck, cardId: string, updates: Partial<Flashcard>): FlashcardDeck {
    return {
      ...deck,
      cards: deck.cards.map((card) =>
        card.id === cardId ? { ...card, ...updates } : card
      ),
      updatedAt: new Date().toISOString(),
    };
  }

  static deleteCard(deck: FlashcardDeck, cardId: string): FlashcardDeck {
    return {
      ...deck,
      cards: deck.cards.filter((card) => card.id !== cardId),
      updatedAt: new Date().toISOString(),
    };
  }

  static toggleFavorite(deck: FlashcardDeck, cardId: string): FlashcardDeck {
    const card = deck.cards.find((c) => c.id === cardId);
    if (!card) return deck;
    return FlashcardsService.updateCard(deck, cardId, {
      isFavorite: !card.isFavorite,
    });
  }

  static recordReview(deck: FlashcardDeck, cardId: string): FlashcardDeck {
    const card = deck.cards.find((c) => c.id === cardId);
    if (!card) return deck;
    return FlashcardsService.updateCard(deck, cardId, {
      reviewCount: card.reviewCount + 1,
      lastReviewedAt: new Date().toISOString(),
    });
  }

  getCards(options: FlashcardsServiceOptions = {}): Flashcard[] {
    let cards = [...this.deck.cards];

    if (options.filterByType) {
      cards = cards.filter((card: Flashcard) => options.filterByType?.includes(card.type));
    }

    if (options.filterByDifficulty) {
      cards = cards.filter((card: Flashcard) => options.filterByDifficulty?.includes(card.difficulty));
    }

    if (options.favoritesOnly) {
      cards = cards.filter((card: Flashcard) => card.isFavorite);
    }

    if (options.shuffle) {
      cards = this.shuffleArray(cards);
    }

    return cards;
  }

  getCardById(cardId: string): Flashcard | undefined {
    return this.deck.cards.find((card) => card.id === cardId);
  }

  getCardsByTag(tag: string): Flashcard[] {
    return this.deck.cards.filter((card: Flashcard) => card.tags.includes(tag));
  }

  getAllTags(): string[] {
    const tags = new Set<string>();
    this.deck.cards.forEach((card: Flashcard) => card.tags.forEach((tag: string) => tags.add(tag)));
    return Array.from(tags).sort();
  }

  getStatistics(): {
    total: number;
    byType: Record<FlashcardType, number>;
    byDifficulty: Record<"easy" | "medium" | "hard", number>;
    favorites: number;
    reviewed: number;
  } {
    const stats = {
      total: this.deck.cards.length,
      byType: { qa: 0, cloze: 0, definition: 0, concept: 0, formula: 0 } as Record<FlashcardType, number>,
      byDifficulty: { easy: 0, medium: 0, hard: 0 } as Record<"easy" | "medium" | "hard", number>,
      favorites: 0,
      reviewed: 0,
    };

    this.deck.cards.forEach((card: Flashcard) => {
      stats.byType[card.type]++;
      stats.byDifficulty[card.difficulty]++;
      if (card.isFavorite) stats.favorites++;
      if (card.reviewCount > 0) stats.reviewed++;
    });

    return stats;
  }

  static parseFromMarkdown(markdown: string): FlashcardDeck {
    const lines = markdown.split("\n");
    const cards: Flashcard[] = [];
    let currentCard: Partial<Flashcard> | null = null;

    for (const line of lines) {
      const typeMatch = line.match(/^###\s*(qa|cloze|definition|concept|formula)/i);
      if (typeMatch) {
        if (currentCard && currentCard.front !== undefined && currentCard.back !== undefined) {
          cards.push(FlashcardsService.createCardFromPartial(currentCard));
        }

        const matchedType = typeMatch[1]?.toLowerCase();
        if (matchedType) {
          currentCard = {
            type: matchedType as FlashcardType,
            difficulty: "medium",
            tags: [],
            citations: [],
            isFavorite: false,
          };
        }
        continue;
      }

      if (!currentCard) continue;

      const frontMatch = line.match(/^Front:\s*(.*)/i);
      if (frontMatch) {
        currentCard.front = frontMatch[1]?.trim() ?? "";
        continue;
      }

      const backMatch = line.match(/^Back:\s*(.*)/i);
      if (backMatch) {
        currentCard.back = backMatch[1]?.trim() ?? "";
        continue;
      }

      const difficultyMatch = line.match(/^Difficulty:\s*(easy|medium|hard)/i);
      if (difficultyMatch) {
        currentCard.difficulty = difficultyMatch[1]?.toLowerCase() as "easy" | "medium" | "hard";
        continue;
      }

      const tagsMatch = line.match(/^Tags:\s*(.*)/i);
      if (tagsMatch) {
        currentCard.tags = tagsMatch[1]?.split(",").map((t: string) => t.trim()).filter(Boolean) ?? [];
        continue;
      }
    }

    if (currentCard && currentCard.front !== undefined && currentCard.back !== undefined) {
      cards.push(FlashcardsService.createCardFromPartial(currentCard));
    }

    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title: "Imported Flashcards",
      cards,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static exportToMarkdown(deck: FlashcardDeck): string {
    const lines: string[] = [`# ${deck.title}`, ``, `Total cards: ${deck.cards.length}`, ``];

    deck.cards.forEach((card) => {
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
      lines.push(``);
    });

    return lines.join("\n");
  }

  static exportToJson(deck: FlashcardDeck): string {
    return JSON.stringify(deck, null, 2);
  }

  static exportToCsv(deck: FlashcardDeck): string {
    const headers = ["Type", "Front", "Back", "Difficulty", "Tags", "Favorite"];
    const rows: Array<Array<string | number>> = deck.cards.map((card) => [
      card.type,
      `"${card.front.replace(/"/g, '""')}"`,
      `"${card.back.replace(/"/g, '""')}"`,
      card.difficulty,
      `"${card.tags.join(", ")}"`,
      card.isFavorite ? "Yes" : "No",
    ]);

    return [headers.join(","), ...rows.map((r) => r.map((value) => String(value)).join(","))].join("\n");
  }

  private shuffleArray<T>(array: readonly T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled;
  }

  private static createCardFromPartial(partial: Partial<Flashcard>): Flashcard {
    return FlashcardSchema.parse({
      id: crypto.randomUUID(),
      type: partial.type ?? "qa",
      front: partial.front ?? "",
      back: partial.back ?? "",
      difficulty: partial.difficulty ?? "medium",
      tags: partial.tags ?? [],
      citations: partial.citations ?? [],
      isFavorite: partial.isFavorite ?? false,
      reviewCount: 0,
    });
  }
}
