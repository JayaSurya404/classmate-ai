import {
  LearningAnalyticsSchema,
  RevisionPlanSchema,
  type AnalyticsActivity,
  type LearningAnalytics,
  type RevisionItem,
  type RevisionPlan,
} from "@classmate/contracts";

export interface AnalyticsSummary {
  dailyActivity: readonly TimelinePoint[];
  weeklyActivity: readonly TimelinePoint[];
  monthlyActivity: readonly TimelinePoint[];
  progressTimeline: readonly TimelinePoint[];
  studyTimeMinutes: number;
  streakDays: number;
  accuracy: number;
  completion: number;
}

export interface TimelinePoint {
  label: string;
  value: number;
}

export class AnalyticsService {
  static create(activities: readonly AnalyticsActivity[] = []): LearningAnalytics {
    return AnalyticsService.fromActivities(activities);
  }

  static record(analytics: LearningAnalytics, activity: Omit<AnalyticsActivity, "id">): LearningAnalytics {
    return AnalyticsService.fromActivities([...analytics.activities, { ...activity, id: crypto.randomUUID() }]);
  }

  static fromActivities(activities: readonly AnalyticsActivity[]): LearningAnalytics {
    const completed = activities.filter((activity) => activity.completed).length;
    const accuracyValues = activities.map((activity) => activity.accuracy).filter((value): value is number => value !== undefined);
    const topicMastery = masteryBy(activities, "topic");
    const subjectMastery = masteryBy(activities, "subject");
    const revisions = activities.filter((activity) => activity.kind === "revision").length;
    return LearningAnalyticsSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      activities: [...activities],
      studyTimeMinutes: activities.reduce((sum, activity) => sum + activity.durationMinutes, 0),
      streakDays: calculateStreak(activities),
      accuracy: average(accuracyValues),
      completion: activities.length === 0 ? 0 : Math.round((completed / activities.length) * 100),
      revisionFrequency: activities.length === 0 ? 0 : revisions / activities.length,
      topicMastery,
      subjectMastery,
      updatedAt: new Date().toISOString(),
    });
  }

  static summarize(analytics: LearningAnalytics): AnalyticsSummary {
    return {
      dailyActivity: bucketByDate(analytics.activities, "day"),
      weeklyActivity: bucketByDate(analytics.activities, "week"),
      monthlyActivity: bucketByDate(analytics.activities, "month"),
      progressTimeline: analytics.activities.map((activity: AnalyticsActivity) => ({
        label: activity.occurredAt.slice(0, 10),
        value: activity.accuracy ?? (activity.completed ? 100 : 0),
      })),
      studyTimeMinutes: analytics.studyTimeMinutes,
      streakDays: analytics.streakDays,
      accuracy: analytics.accuracy,
      completion: analytics.completion,
    };
  }
}

export class RevisionService {
  static createPlan(args: {
    topics: readonly string[];
    examTitle?: string | undefined;
    examDate?: string | undefined;
    weakTopics?: readonly string[] | undefined;
  }): RevisionPlan {
    const weakSet = new Set((args.weakTopics ?? []).map((topic) => topic.toLowerCase()));
    const items = args.topics.map((topic, index): RevisionItem => {
      const priority = weakSet.has(topic.toLowerCase()) ? "high" : index % 3 === 0 ? "medium" : "low";
      return {
        id: crypto.randomUUID(),
        title: `Revise ${topic}`,
        topic,
        priority,
        dueAt: addDays(index === 0 ? 0 : index).toISOString(),
        intervalDays: priority === "high" ? 1 : priority === "medium" ? 3 : 7,
      };
    });
    return RevisionPlanSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      examTitle: args.examTitle,
      examDate: args.examDate,
      items,
      recommendations: recommendations(items, args.examDate),
      updatedAt: new Date().toISOString(),
    });
  }

  static queue(plan: RevisionPlan, now = new Date()): RevisionItem[] {
    return plan.items
      .filter((item: RevisionItem) => !item.completedAt && Date.parse(item.dueAt) <= now.getTime())
      .sort((left: RevisionItem, right: RevisionItem) => priorityRank(right.priority) - priorityRank(left.priority));
  }

  static complete(plan: RevisionPlan, itemId: string, completedAt = new Date().toISOString()): RevisionPlan {
    return RevisionPlanSchema.parse({
      ...plan,
      items: plan.items.map((item: RevisionItem) =>
        item.id === itemId
          ? {
              ...item,
              completedAt,
              dueAt: addDays(item.intervalDays, new Date(completedAt)).toISOString(),
            }
          : item,
      ),
      updatedAt: new Date().toISOString(),
    });
  }

  static examCountdown(plan: RevisionPlan, now = new Date()): number | undefined {
    if (!plan.examDate) return undefined;
    return Math.max(0, Math.ceil((Date.parse(plan.examDate) - now.getTime()) / 86_400_000));
  }
}

function masteryBy(activities: readonly AnalyticsActivity[], field: "topic" | "subject"): Record<string, number> {
  const grouped = new Map<string, number[]>();
  for (const activity of activities) {
    const key = activity[field];
    if (!key) continue;
    grouped.set(key, [...(grouped.get(key) ?? []), activity.accuracy ?? (activity.completed ? 100 : 0)]);
  }
  return Object.fromEntries([...grouped.entries()].map(([key, values]) => [key, average(values)]));
}

function calculateStreak(activities: readonly AnalyticsActivity[]): number {
  const days = new Set(activities.map((activity) => activity.occurredAt.slice(0, 10)));
  let streak = 0;
  const cursor = new Date();
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function bucketByDate(activities: readonly AnalyticsActivity[], unit: "day" | "week" | "month"): TimelinePoint[] {
  const buckets = new Map<string, number>();
  for (const activity of activities) {
    const label = labelFor(activity.occurredAt, unit);
    buckets.set(label, (buckets.get(label) ?? 0) + activity.durationMinutes);
  }
  return [...buckets.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([label, value]) => ({ label, value }));
}

function labelFor(iso: string, unit: "day" | "week" | "month"): string {
  const date = new Date(iso);
  if (unit === "day") return iso.slice(0, 10);
  if (unit === "month") return iso.slice(0, 7);
  const weekStart = new Date(date);
  weekStart.setDate(date.getDate() - date.getDay());
  return weekStart.toISOString().slice(0, 10);
}

function average(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function addDays(days: number, from = new Date()): Date {
  const date = new Date(from);
  date.setDate(date.getDate() + days);
  return date;
}

function priorityRank(priority: RevisionItem["priority"]): number {
  return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
}

function recommendations(items: readonly RevisionItem[], examDate: string | undefined): string[] {
  const highPriority = items.filter((item) => item.priority === "high").map((item) => item.topic);
  return [
    ...(highPriority.length > 0 ? [`Start with weak topics: ${highPriority.join(", ")}.`] : ["Maintain steady revision across all topics."]),
    ...(examDate ? [`Exam countdown is ${String(Math.max(0, Math.ceil((Date.parse(examDate) - Date.now()) / 86_400_000)))} days.`] : []),
    "Use active recall before rereading notes.",
  ];
}
