import { motion } from "framer-motion";
import { useState } from "react";
import { Clock, Download, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@classmate/ui";
import { cn } from "@classmate/ui";
import type { StudyPlan, StudyPlanItem, StudyPlanType } from "@classmate/contracts";

interface StudyPlanViewProps {
  studyPlan: StudyPlan;
  onUpdateStudyPlan: (studyPlan: StudyPlan) => void;
  onExport: (format: "markdown" | "json" | "csv") => void;
}

export function StudyPlanView({ studyPlan, onUpdateStudyPlan, onExport }: StudyPlanViewProps) {
  const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());
  const [currentItemIndex, setCurrentItemIndex] = useState(0);

  const toggleItemComplete = (itemId: string) => {
    const newCompleted = new Set(completedItems);
    if (newCompleted.has(itemId)) {
      newCompleted.delete(itemId);
    } else {
      newCompleted.add(itemId);
    }
    setCompletedItems(newCompleted);
  };

  const startItem = (index: number) => {
    setCurrentItemIndex(index);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  const typeLabels: Record<StudyPlanType, string> = {
    "30_min": "30 Minute Plan",
    "1_hour": "1 Hour Plan",
    "tomorrow_exam": "Tomorrow Exam Plan",
    "one_week": "One Week Plan",
  };

  const stats = {
    totalItems: studyPlan.items.length,
    completedItems: completedItems.size,
    totalDuration: studyPlan.totalDuration,
    completedDuration: studyPlan.items
      .filter((item) => completedItems.has(item.id))
      .reduce((sum, item) => sum + item.duration, 0),
    progress: studyPlan.items.length > 0
      ? Math.round((completedItems.size / studyPlan.items.length) * 100)
      : 0,
  };

  const sortedItems = [...studyPlan.items].sort((a, b) => a.order - b.order);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-title font-bold">{studyPlan.title}</h2>
        <div className="flex gap-2">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            {typeLabels[studyPlan.planType]}
          </span>
          <Button variant="outline" size="sm" onClick={() => onExport("markdown")}>
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{stats.progress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-border">
            <motion.div
              className="h-full bg-primary"
              initial={{ width: 0 }}
              animate={{ width: `${stats.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <div className="mt-2 flex gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="size-3" />
              {formatDuration(stats.totalDuration)} total
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 className="size-3" />
              {stats.completedItems} / {stats.totalItems} completed
            </span>
          </div>
        </div>

        {sortedItems.length === 0 ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>This study plan has no items.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedItems.map((item, idx) => {
              const isCompleted = completedItems.has(item.id);
              const isCurrent = currentItemIndex === idx;

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "rounded-xl border border-border bg-card p-4 shadow-sm transition-all",
                    isCompleted && "border-green-500/50 bg-green-500/5",
                    isCurrent && "border-primary bg-primary/5"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-2">
                        <span className="text-xs font-medium text-muted-foreground">
                          {item.order + 1}.
                        </span>
                        <h3 className={cn("font-semibold", isCompleted && "line-through text-muted-foreground")}>
                          {item.title}
                        </h3>
                      </div>

                      <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="size-3" />
                        {formatDuration(item.duration)}
                      </div>

                      {item.topics.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {item.topics.map((topic) => (
                            <span
                              key={topic}
                              className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startItem(idx)}
                        className={isCurrent ? "bg-primary text-primary-foreground" : ""}
                      >
                        <Play className="size-3" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleItemComplete(item.id)}
                        className={isCompleted ? "bg-green-500 text-white" : ""}
                      >
                        <CheckCircle2 className="size-3" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
