import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Download, Heart, RotateCcw, Shuffle, Star } from "lucide-react";
import { Button } from "@classmate/ui";
import { cn } from "@classmate/ui";
import type { Flashcard, FlashcardDeck, FlashcardType } from "@classmate/contracts";

interface FlashcardsViewProps {
  deck: FlashcardDeck;
  onUpdateDeck: (deck: FlashcardDeck) => void;
  onExport: (format: "markdown" | "json" | "csv") => void;
}

export function FlashcardsView({ deck, onUpdateDeck, onExport }: FlashcardsViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [filterType, setFilterType] = useState<FlashcardType | "all">("all");
  const [showFavorites, setShowFavorites] = useState(false);

  const filteredCards = deck.cards.filter((card) => {
    if (filterType !== "all" && card.type !== filterType) return false;
    if (showFavorites && !card.isFavorite) return false;
    return true;
  });

  const currentCard = filteredCards[currentIndex];
  const hasCards = filteredCards.length > 0;

  if (!hasCards) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-title font-bold">{deck.title}</h2>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>No cards match the current filters.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentCard) {
    return null;
  }

  const handleNext = () => {
    if (!hasCards) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev + 1) % filteredCards.length);
  };

  const handlePrevious = () => {
    if (!hasCards) return;
    setIsFlipped(false);
    setCurrentIndex((prev) => (prev - 1 + filteredCards.length) % filteredCards.length);
  };

  const handleShuffle = () => {
    const shuffled = [...filteredCards].sort(() => Math.random() - 0.5);
    onUpdateDeck({ ...deck, cards: shuffled });
    setCurrentIndex(0);
    setIsFlipped(false);
  };

  const handleToggleFavorite = () => {
    if (!currentCard) return;
    const updatedCards = deck.cards.map((card) =>
      card.id === currentCard.id ? { ...card, isFavorite: !card.isFavorite } : card
    );
    onUpdateDeck({ ...deck, cards: updatedCards });
  };

  const handleRecordReview = () => {
    if (!currentCard) return;
    const updatedCards = deck.cards.map((card) =>
      card.id === currentCard.id
        ? { ...card, reviewCount: card.reviewCount + 1, lastReviewedAt: new Date().toISOString() }
        : card
    );
    onUpdateDeck({ ...deck, cards: updatedCards });
  };

  const stats = {
    total: deck.cards.length,
    reviewed: deck.cards.filter((c) => c.reviewCount > 0).length,
    favorites: deck.cards.filter((c) => c.isFavorite).length,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-title font-bold">{deck.title}</h2>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as FlashcardType | "all")}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">All Types</option>
            <option value="qa">Q/A</option>
            <option value="cloze">Cloze</option>
            <option value="definition">Definition</option>
            <option value="concept">Concept</option>
            <option value="formula">Formula</option>
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFavorites(!showFavorites)}
            className={showFavorites ? "bg-primary/10" : ""}
          >
            <Star className={cn("size-4", showFavorites && "fill-primary text-primary")} />
          </Button>
          <Button variant="outline" size="sm" onClick={handleShuffle}>
            <Shuffle className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport("markdown")}>
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
          <span>Total: {stats.total}</span>
          <span>Reviewed: {stats.reviewed}</span>
          <span>Favorites: {stats.favorites}</span>
        </div>

        <div className="mx-auto max-w-2xl">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="relative"
            >
              <div
                className={cn(
                  "relative cursor-pointer rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300",
                  isFlipped && "bg-accent"
                )}
                onClick={() => setIsFlipped(!isFlipped)}
                onKeyDown={(e) => {
                  if (e.key === " " || e.key === "Enter") {
                    setIsFlipped(!isFlipped);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium uppercase text-muted-foreground">
                    {currentCard.type}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {currentIndex + 1} / {filteredCards.length}
                  </span>
                </div>

                <div className="min-h-[150px]">
                  <p className="text-lg font-medium">{isFlipped ? currentCard.back : currentCard.front}</p>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex gap-2">
                    {currentCard.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Difficulty: {currentCard.difficulty}
                  </span>
                </div>

                {currentCard.reviewCount > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Reviewed {currentCard.reviewCount} times
                  </div>
                )}
              </div>
            </motion.div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                disabled={!hasCards}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 size-4" />
                Previous
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setIsFlipped(!isFlipped)}
                disabled={!hasCards}
                className="flex-1"
              >
                <RotateCcw className="mr-2 size-4" />
                Flip
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={handleNext}
                disabled={!hasCards}
                className="flex-1"
              >
                Next
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleToggleFavorite}
                disabled={!hasCards}
              >
                <Heart
                  className={cn(
                    "mr-2 size-4",
                    currentCard.isFavorite && "fill-primary text-primary"
                  )}
                />
                {currentCard.isFavorite ? "Unfavorite" : "Favorite"}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRecordReview}
                disabled={!hasCards}
              >
                <BookOpen className="mr-2 size-4" />
                Mark as Reviewed
              </Button>
            </div>
          </div>
      </div>
    </div>
  );
}
