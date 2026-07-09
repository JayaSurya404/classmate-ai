import { describe, expect, it } from "vitest";
import type { ExamQuestion } from "@classmate/contracts";
import { AnalyticsService, RevisionService } from "./analytics";
import { ExamService } from "./exam";

describe("ExamService", () => {
  it("generates exam types with extended question coverage and evaluates answers", () => {
    const exam = ExamService.generateExam({
      title: "Operating Systems Mock",
      type: "mock_exam",
      subject: "OS",
      topics: ["Processes", "Scheduling", "Memory"],
      durationMinutes: 120,
    });
    const answers = Object.fromEntries(exam.questions.map((question: ExamQuestion) => [question.id, Array.isArray(question.correctAnswer) ? question.correctAnswer.join(" ") : question.correctAnswer]));
    const result = ExamService.evaluate(exam, answers);
    const analysis = ExamService.analyze(exam, result.evaluations, result.score);

    expect(exam.questions.some((question: ExamQuestion) => question.type === "assertion_reason")).toBe(true);
    expect(exam.questions.some((question: ExamQuestion) => question.type === "case_study")).toBe(true);
    expect(result.score).toBeGreaterThan(50);
    expect(analysis.confidenceScore).toBe(1);
    expect(ExamService.exportExam(exam, "csv")).toContain("type,prompt,answer");
  });
});

describe("AnalyticsService and RevisionService", () => {
  it("summarizes learning analytics and manages adaptive revision", () => {
    const analytics = AnalyticsService.create([
      {
        id: crypto.randomUUID(),
        kind: "study_session",
        topic: "Scheduling",
        subject: "OS",
        durationMinutes: 45,
        accuracy: 80,
        completed: true,
        occurredAt: new Date().toISOString(),
      },
    ]);
    const nextAnalytics = AnalyticsService.record(analytics, {
      kind: "revision",
      topic: "Memory",
      subject: "OS",
      durationMinutes: 20,
      accuracy: 70,
      completed: true,
      occurredAt: new Date().toISOString(),
    });
    const plan = RevisionService.createPlan({
      topics: ["Scheduling", "Memory"],
      examTitle: "OS Exam",
      examDate: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      weakTopics: ["Memory"],
    });
    const completed = RevisionService.complete(plan, plan.items[0]?.id ?? "");

    expect(nextAnalytics.studyTimeMinutes).toBe(65);
    expect(nextAnalytics.topicMastery.Memory).toBe(70);
    expect(RevisionService.queue(plan).length).toBeGreaterThan(0);
    expect(completed.items[0]?.completedAt).toBeDefined();
    expect(RevisionService.examCountdown(plan)).toBeGreaterThan(0);
  });
});
