export type PracticeTool = "flashcards" | "quiz" | "memory" | "mindmap" | "studyplan";

export interface PracticeState {
  activeTool: PracticeTool | null;
  flashcardDeck: any;
  quiz: any;
  memoryAids: any;
  mindMap: any;
  studyPlan: any;
}
