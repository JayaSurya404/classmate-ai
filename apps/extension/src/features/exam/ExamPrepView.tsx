import { motion } from "framer-motion";
import { BarChart3, CalendarDays, ClipboardCheck, History, Lightbulb, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AnalyticsService, ExamService, RevisionService } from "@classmate/learning-tools";
import { Badge, Button, Card, Input, Progress, Select, cn } from "@classmate/ui";
import type { AnalyticsActivity, Exam, ExamResult, LearningAnalytics, RevisionPlan } from "@classmate/contracts";
import { localRepositories } from "../../adapters/local-db/database";
import { recordEntityChange } from "../sync/syncIntegration";

export type ExamPanelMode = "exam" | "analytics" | "revision" | "progress" | "history" | "recommendations";

export interface ExamPrepViewProps {
  initialMode: ExamPanelMode;
  sourceId?: string | undefined;
  sourceTitle?: string | undefined;
}

export function ExamPrepView({ initialMode, sourceId, sourceTitle }: ExamPrepViewProps) {
  const [mode, setMode] = useState<ExamPanelMode>(initialMode);
  const [exams, setExams] = useState<Exam[]>([]);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [analytics, setAnalytics] = useState<LearningAnalytics>(() => AnalyticsService.create());
  const [revisionPlan, setRevisionPlan] = useState<RevisionPlan | undefined>();
  const [topicText, setTopicText] = useState(sourceTitle ?? "Core concepts, definitions, examples");
  const activeExam = exams[0];
  const summary = useMemo(() => AnalyticsService.summarize(analytics), [analytics]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      localRepositories.exams.list(),
      localRepositories.examResults.list(),
      localRepositories.analytics.latest(),
      localRepositories.revisionPlans.latest(),
    ]).then(([storedExams, storedResults, storedAnalytics, storedRevision]) => {
      if (!active) return;
      setExams(storedExams);
      setResults(storedResults);
      setAnalytics(storedAnalytics ?? AnalyticsService.create());
      setRevisionPlan(storedRevision);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const topics = topicText.split(",").map((topic) => topic.trim()).filter(Boolean);

  const createExam = async (): Promise<void> => {
    const exam = ExamService.generateExam({
      title: sourceTitle ? `${sourceTitle} Mock Exam` : "Mock Exam",
      type: "mock_exam",
      subject: sourceTitle,
      topics,
      sourceIds: sourceId ? [sourceId] : [],
    });
    await localRepositories.exams.save(exam);
    await recordEntityChange({
      entityType: "quiz",
      entityId: exam.id,
      after: { title: exam.title, type: exam.type, questions: exam.questions.length, totalMarks: exam.totalMarks },
      operation: "create",
      label: exam.title,
    });
    setExams((current) => [exam, ...current]);
  };

  const submitSampleAttempt = async (): Promise<void> => {
    if (!activeExam) return;
    const answers = Object.fromEntries(activeExam.questions.map((question) => [question.id, Array.isArray(question.correctAnswer) ? question.correctAnswer.join(" ") : question.correctAnswer]));
    const result = ExamService.evaluate(activeExam, answers);
    const activity: Omit<AnalyticsActivity, "id"> = {
      kind: "exam_attempt",
      topic: activeExam.questions[0]?.topic,
      subject: activeExam.subject,
      durationMinutes: activeExam.durationMinutes,
      accuracy: result.score,
      completed: true,
      occurredAt: result.completedAt,
    };
    const nextAnalytics = AnalyticsService.record(analytics, activity);
    await Promise.all([localRepositories.examResults.save(result), localRepositories.analytics.save(nextAnalytics)]);
    await recordEntityChange({
      entityType: "quiz",
      entityId: activeExam.id,
      before: { score: results[0]?.score ?? 0 },
      after: { score: result.score, weakTopics: result.weakTopics, strongTopics: result.strongTopics },
      operation: "update",
      label: `${activeExam.title} result`,
    });
    setResults((current) => [result, ...current]);
    setAnalytics(nextAnalytics);
  };

  const createRevisionPlan = async (): Promise<void> => {
    const latest = results[0];
    const plan = RevisionService.createPlan({
      topics,
      examTitle: activeExam?.title,
      examDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      weakTopics: latest?.weakTopics,
    });
    await localRepositories.revisionPlans.save(plan);
    await recordEntityChange({
      entityType: "study_plan",
      entityId: plan.id,
      after: { examTitle: plan.examTitle, items: plan.items.length, recommendations: plan.recommendations },
      operation: "create",
      label: plan.examTitle ?? "Revision plan",
    });
    setRevisionPlan(plan);
  };

  const completeRevision = async (itemId: string): Promise<void> => {
    if (!revisionPlan) return;
    const nextPlan = RevisionService.complete(revisionPlan, itemId);
    const nextAnalytics = AnalyticsService.record(analytics, {
      kind: "revision",
      durationMinutes: 20,
      completed: true,
      occurredAt: new Date().toISOString(),
    });
    await Promise.all([localRepositories.revisionPlans.save(nextPlan), localRepositories.analytics.save(nextAnalytics)]);
    setRevisionPlan(nextPlan);
    setAnalytics(nextAnalytics);
  };

  return (
    <motion.section initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex h-full flex-col gap-3 p-[var(--panel-px)]">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-title font-bold">Exam Preparation</h2>
          <p className="text-sm text-muted-foreground">Mock exams, scoring, analytics, progress, revision queues, history, and recommendations.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={createExam}>Generate Exam</Button>
          <Button size="sm" variant="secondary" onClick={submitSampleAttempt} disabled={!activeExam}>Score Attempt</Button>
          <Button size="sm" variant="outline" onClick={createRevisionPlan}>Plan Revision</Button>
        </div>
      </header>

      <nav aria-label="Exam panels" className="flex flex-wrap gap-2">
        {(["exam", "analytics", "revision", "progress", "history", "recommendations"] as const).map((item) => (
          <button key={item} type="button" onClick={() => setMode(item)} className={cn("rounded-lg px-3 py-2 text-sm capitalize outline-none focus-visible:ring-2 focus-visible:ring-ring", mode === item ? "bg-primary text-primary-foreground" : "bg-accent text-muted-foreground")}>{item}</button>
        ))}
      </nav>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {mode === "exam" && <ExamPanel topicText={topicText} onTopicText={setTopicText} exam={activeExam} onCreate={createExam} />}
        {mode === "analytics" && <AnalyticsPanel analytics={analytics} />}
        {mode === "revision" && <RevisionPanel plan={revisionPlan} onCreate={createRevisionPlan} onComplete={(id) => { void completeRevision(id); }} />}
        {mode === "progress" && <ProgressPanel summary={summary} analytics={analytics} />}
        {mode === "history" && <HistoryPanel exams={exams} results={results} />}
        {mode === "recommendations" && <RecommendationsPanel plan={revisionPlan} results={results} />}
      </div>
    </motion.section>
  );
}

function ExamPanel({ topicText, onTopicText, exam, onCreate }: { topicText: string; onTopicText: (value: string) => void; exam: Exam | undefined; onCreate: () => Promise<void> }) {
  return (
    <div className="grid gap-3 lg:grid-cols-[18rem_1fr]">
      <Card className="p-4">
        <label className="text-sm font-medium" htmlFor="exam-topics">Topics</label>
        <Input id="exam-topics" className="mt-2" value={topicText} onChange={(event) => onTopicText(event.target.value)} />
        <Select className="mt-3" aria-label="Exam type" value="mock_exam" onChange={() => undefined}>
          <option value="mock_exam">Mock exam</option>
        </Select>
        <Button className="mt-3 w-full" onClick={() => { void onCreate(); }}>Generate</Button>
      </Card>
      <Card className="p-4">
        {!exam && <p className="text-sm text-muted-foreground">Generate an exam to see questions.</p>}
        {exam && <div className="space-y-3"><h3 className="font-semibold">{exam.title}</h3><p className="text-sm text-muted-foreground">{exam.durationMinutes} minutes · {exam.totalMarks} marks · {exam.questions.length} questions</p>{exam.questions.slice(0, 12).map((question, index) => <div key={question.id} className="rounded-lg border border-border p-3"><span className="text-xs text-muted-foreground">{String(index + 1)} · {question.type} · {question.marks} marks</span><p className="mt-1">{question.prompt}</p></div>)}</div>}
      </Card>
    </div>
  );
}

function AnalyticsPanel({ analytics }: { analytics: LearningAnalytics }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <MetricCard icon={Timer} label="Study Time" value={`${analytics.studyTimeMinutes} min`} />
      <MetricCard icon={CalendarDays} label="Streak" value={`${analytics.streakDays} days`} />
      <MetricCard icon={ClipboardCheck} label="Accuracy" value={`${analytics.accuracy}%`} />
      <MetricCard icon={BarChart3} label="Completion" value={`${analytics.completion}%`} />
      <MasteryCard title="Topic Mastery" values={analytics.topicMastery} />
      <MasteryCard title="Subject Mastery" values={analytics.subjectMastery} />
    </div>
  );
}

function RevisionPanel({ plan, onCreate, onComplete }: { plan: RevisionPlan | undefined; onCreate: () => Promise<void>; onComplete: (id: string) => void }) {
  const queue = plan ? RevisionService.queue(plan) : [];
  return <Card className="p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Revision Queue</h3><Button size="sm" onClick={() => { void onCreate(); }}>Build Queue</Button></div>{!plan && <p className="mt-4 text-sm text-muted-foreground">Create a revision plan to see daily and weekly revision tasks.</p>}{plan && <div className="mt-4 space-y-2">{queue.length === 0 && <p className="text-sm text-muted-foreground">No revision items due right now.</p>}{plan.items.slice(0, 12).map((item) => <div key={item.id} className="flex items-center justify-between gap-2 rounded-lg border border-border p-3"><div><p className="font-medium">{item.title}</p><p className="text-xs text-muted-foreground">{item.priority} · due {item.dueAt.slice(0, 10)}</p></div><Button size="sm" variant="secondary" onClick={() => onComplete(item.id)}>{item.completedAt ? "Done" : "Complete"}</Button></div>)}</div>}</Card>;
}

function ProgressPanel({ summary, analytics }: { summary: ReturnType<typeof AnalyticsService.summarize>; analytics: LearningAnalytics }) {
  return <div className="grid gap-3 lg:grid-cols-2"><Card className="p-4"><h3 className="font-semibold">Progress Timeline</h3><div className="mt-3 space-y-2">{summary.progressTimeline.slice(-10).map((point) => <div key={`${point.label}-${String(point.value)}`}><div className="flex justify-between text-xs"><span>{point.label}</span><span>{point.value}%</span></div><Progress value={point.value} /></div>)}</div></Card><Card className="p-4"><h3 className="font-semibold">Activity</h3>{summary.dailyActivity.length === 0 && <p className="mt-3 text-sm text-muted-foreground">No activity recorded yet.</p>}{summary.dailyActivity.map((point) => <p key={point.label} className="mt-2 text-sm">{point.label}: {point.value} minutes</p>)}<p className="mt-4 text-xs text-muted-foreground">Revision frequency: {analytics.revisionFrequency.toFixed(2)}</p></Card></div>;
}

function HistoryPanel({ exams, results }: { exams: readonly Exam[]; results: readonly ExamResult[] }) {
  return <Card className="p-4"><h3 className="flex items-center gap-2 font-semibold"><History className="size-4" />History</h3><div className="mt-3 space-y-2">{results.map((result) => <div key={result.id} className="rounded-lg border border-border p-3"><p className="font-medium">{exams.find((exam) => exam.id === result.examId)?.title ?? "Exam attempt"}</p><p className="text-sm text-muted-foreground">{result.score}% · {result.completedAt}</p></div>)}{results.length === 0 && <p className="text-sm text-muted-foreground">No exam attempts yet.</p>}</div></Card>;
}

function RecommendationsPanel({ plan, results }: { plan: RevisionPlan | undefined; results: readonly ExamResult[] }) {
  const latest = results[0];
  const recommendations = [...(plan?.recommendations ?? []), ...(latest?.weakTopics.map((topic) => `Practice more questions on ${topic}.`) ?? [])];
  return <Card className="p-4"><h3 className="flex items-center gap-2 font-semibold"><Lightbulb className="size-4" />Smart Recommendations</h3><div className="mt-3 space-y-2">{recommendations.map((recommendation) => <p key={recommendation} className="rounded-lg bg-accent p-3 text-sm">{recommendation}</p>)}{recommendations.length === 0 && <p className="text-sm text-muted-foreground">Generate and score an exam to receive recommendations.</p>}</div></Card>;
}

function MetricCard({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) {
  return <Card className="p-4"><Icon className="size-5 text-primary" /><p className="mt-3 text-sm text-muted-foreground">{label}</p><p className="text-2xl font-bold">{value}</p></Card>;
}

function MasteryCard({ title, values }: { title: string; values: Record<string, number> }) {
  const entries = Object.entries(values);
  return <Card className="p-4 md:col-span-2"><h3 className="font-semibold">{title}</h3><div className="mt-3 flex flex-wrap gap-2">{entries.map(([label, value]) => <Badge key={label}>{label}: {value}%</Badge>)}{entries.length === 0 && <p className="text-sm text-muted-foreground">No mastery data yet.</p>}</div></Card>;
}
