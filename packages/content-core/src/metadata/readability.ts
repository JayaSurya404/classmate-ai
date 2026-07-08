import type { ReadabilityMetrics } from "../types";

const VOWEL_GROUP = /[aeiouy]+/gi;

export function calculateReadability(text: string): ReadabilityMetrics {
  const words = text.match(/\b[\p{L}\p{N}'-]+\b/gu) ?? [];
  const sentences = text
    .split(/[.!?]+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  const wordCount = Math.max(words.length, 1);
  const sentenceCount = Math.max(sentences.length, 1);
  const syllableCount = Math.max(
    words.reduce((total, word) => total + countSyllables(word), 0),
    wordCount,
  );
  const averageWordsPerSentence = round(wordCount / sentenceCount);
  const score = round(206.835 - 1.015 * averageWordsPerSentence - 84.6 * (syllableCount / wordCount));

  return {
    score,
    label: labelForScore(score),
    sentenceCount,
    averageWordsPerSentence,
  };
}

function countSyllables(word: string): number {
  const normalized = word.toLowerCase().replace(/(?:e|es|ed)$/u, "");
  return Math.max(normalized.match(VOWEL_GROUP)?.length ?? 1, 1);
}

function labelForScore(score: number): ReadabilityMetrics["label"] {
  if (score >= 70) return "easy";
  if (score >= 40) return "standard";
  return "difficult";
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}
