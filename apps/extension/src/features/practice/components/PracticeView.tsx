import { useState } from "react";
import { Brain, BookOpen, Download, Network, Timer } from "lucide-react";
import { Button } from "@classmate/ui";
import { cn } from "@classmate/ui";
import { FlashcardsView } from "./FlashcardsView";
import { QuizView } from "./QuizView";
import { MemoryToolsView } from "./MemoryToolsView";
import { MindMapView } from "./MindMapView";
import { StudyPlanView } from "./StudyPlanView";
import type { PracticeTool } from "../types";

interface PracticeViewProps {
  onExport: (tool: PracticeTool, format: "markdown" | "json" | "csv") => void;
}

export function PracticeView({ onExport }: PracticeViewProps) {
  const [activeTool, setActiveTool] = useState<PracticeTool>("flashcards");

  const tools = [
    { id: "flashcards" as PracticeTool, label: "Flashcards", icon: BookOpen },
    { id: "quiz" as PracticeTool, label: "Quiz", icon: BookOpen },
    { id: "memory" as PracticeTool, label: "Memory Tools", icon: Brain },
    { id: "mindmap" as PracticeTool, label: "Mind Map", icon: Network },
    { id: "studyplan" as PracticeTool, label: "Study Plan", icon: Timer },
  ];

  const handleExport = (format: "markdown" | "json" | "csv") => {
    onExport(activeTool, format);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex gap-2">
          {tools.map((tool) => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                type="button"
                onClick={() => setActiveTool(tool.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  activeTool === tool.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <Icon className="size-4" />
                {tool.label}
              </button>
            );
          })}
        </div>
        <Button variant="outline" size="sm" onClick={() => handleExport("markdown")}>
          <Download className="size-4" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {activeTool === "flashcards" && (
          <FlashcardsView
            deck={{
              schemaVersion: 1,
              id: "demo",
              title: "Sample Flashcards",
              cards: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }}
            onUpdateDeck={() => {}}
            onExport={handleExport}
          />
        )}
        {activeTool === "quiz" && (
          <QuizView
            quiz={{
              schemaVersion: 1,
              id: "demo",
              title: "Sample Quiz",
              questions: [],
              attempts: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }}
            onUpdateQuiz={() => {}}
            onExport={handleExport}
          />
        )}
        {activeTool === "memory" && (
          <MemoryToolsView aids={[]} onExport={handleExport} />
        )}
        {activeTool === "mindmap" && (
          <MindMapView
            mindMap={{
              schemaVersion: 1,
              id: "demo",
              title: "Sample Mind Map",
              nodes: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }}
            onUpdateMindMap={() => {}}
            onExport={handleExport}
          />
        )}
        {activeTool === "studyplan" && (
          <StudyPlanView
            studyPlan={{
              schemaVersion: 1,
              id: "demo",
              title: "Sample Study Plan",
              planType: "30_min",
              items: [],
              totalDuration: 0,
              createdAt: new Date().toISOString(),
            }}
            onUpdateStudyPlan={() => {}}
            onExport={handleExport}
          />
        )}
      </div>
    </div>
  );
}
