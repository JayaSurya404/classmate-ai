export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3.5);
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

export function estimateReadingTimeMinutes(wordCount: number, wordsPerMinute = 200): number {
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute));
}
