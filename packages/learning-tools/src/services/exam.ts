import {
  ExamResultSchema,
  ExamSchema,
  type Exam,
  type ExamAnswerEvaluation,
  type ExamQuestion,
  type ExamResult,
  type ExamType,
  type QuestionType,
} from "@classmate/contracts";

export interface ExamGenerationInput {
  title: string;
  type: ExamType;
  subject?: string | undefined;
  topics: readonly string[];
  sourceIds?: readonly string[] | undefined;
  durationMinutes?: number | undefined;
  difficulty?: "easy" | "medium" | "hard" | undefined;
}

export interface ExamAnalysis {
  score: number;
  weakTopics: readonly string[];
  strongTopics: readonly string[];
  mistakes: readonly string[];
  difficultyAnalysis: Record<"easy" | "medium" | "hard", number>;
  coverageAnalysis: readonly string[];
  confidenceScore: number;
}

const QUESTION_TYPES: readonly QuestionType[] = [
  "multiple_choice",
  "true_false",
  "fill_blank",
  "short_answer",
  "long_answer",
  "essay",
  "one_word",
  "matching",
  "assertion_reason",
  "case_study",
];

export class ExamService {
  static generateExam(input: ExamGenerationInput): Exam {
    const now = new Date().toISOString();
    const topics = input.topics.length > 0 ? input.topics : ["General Revision"];
    const questionCount = input.type === "timed_exam" || input.type === "mock_exam" ? 20 : 12;
    const questions = Array.from({ length: questionCount }, (_, index) =>
      createQuestion(index, topics[index % topics.length] ?? topics[0] ?? "General Revision", input.difficulty ?? difficultyForIndex(index)),
    );
    const totalMarks = questions.reduce((sum, question) => sum + question.marks, 0);
    return ExamSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title: input.title,
      type: input.type,
      subject: input.subject,
      sourceIds: [...(input.sourceIds ?? [])],
      questions,
      durationMinutes: input.durationMinutes ?? durationForType(input.type),
      totalMarks,
      createdAt: now,
      updatedAt: now,
    });
  }

  static evaluate(exam: Exam, answers: Readonly<Record<string, string>>): ExamResult {
    const evaluations = exam.questions.map((question: ExamQuestion) => evaluateQuestion(question, answers[question.id] ?? ""));
    const totalEarned = evaluations.reduce((sum: number, evaluation: ExamAnswerEvaluation) => sum + evaluation.earnedMarks, 0);
    const score = exam.totalMarks === 0 ? 0 : Math.round((totalEarned / exam.totalMarks) * 100);
    const analysis = ExamService.analyze(exam, evaluations, score);
    return ExamResultSchema.parse({
      schemaVersion: 1,
      id: crypto.randomUUID(),
      examId: exam.id,
      answers,
      evaluations,
      score,
      weakTopics: analysis.weakTopics,
      strongTopics: analysis.strongTopics,
      difficultyAnalysis: analysis.difficultyAnalysis,
      coverageAnalysis: analysis.coverageAnalysis,
      completedAt: new Date().toISOString(),
    });
  }

  static analyze(exam: Exam, evaluations: readonly ExamAnswerEvaluation[], score?: number): ExamAnalysis {
    const topicScores = new Map<string, { earned: number; total: number; mistakes: string[] }>();
    const difficultyTotals: Record<"easy" | "medium" | "hard", { earned: number; total: number }> = {
      easy: { earned: 0, total: 0 },
      medium: { earned: 0, total: 0 },
      hard: { earned: 0, total: 0 },
    };
    for (const question of exam.questions) {
      const evaluation = evaluations.find((item) => item.questionId === question.id);
      const topic = question.topic ?? "General";
      const current = topicScores.get(topic) ?? { earned: 0, total: 0, mistakes: [] };
      current.earned += evaluation?.earnedMarks ?? 0;
      current.total += question.marks;
      current.mistakes.push(...(evaluation?.mistakes ?? []));
      topicScores.set(topic, current);
      const difficultyTotal = difficultyTotals[question.difficulty];
      difficultyTotal.earned += evaluation?.earnedMarks ?? 0;
      difficultyTotal.total += question.marks;
    }
    const weakTopics = [...topicScores.entries()].filter(([, value]) => ratio(value.earned, value.total) < 60).map(([topic]) => topic);
    const strongTopics = [...topicScores.entries()].filter(([, value]) => ratio(value.earned, value.total) >= 80).map(([topic]) => topic);
    const difficultyAnalysis = {
      easy: ratio(difficultyTotals.easy.earned, difficultyTotals.easy.total),
      medium: ratio(difficultyTotals.medium.earned, difficultyTotals.medium.total),
      hard: ratio(difficultyTotals.hard.earned, difficultyTotals.hard.total),
    };
    const coverageAnalysis = [...new Set(exam.questions.map((question: ExamQuestion) => question.topic ?? "General"))].map((topic: string) => `${topic}: covered`);
    const mistakes = evaluations.flatMap((evaluation: ExamAnswerEvaluation) => evaluation.mistakes);
    return {
      score: score ?? ratio(evaluations.reduce((sum: number, evaluation: ExamAnswerEvaluation) => sum + evaluation.earnedMarks, 0), exam.totalMarks),
      weakTopics,
      strongTopics,
      mistakes,
      difficultyAnalysis,
      coverageAnalysis,
      confidenceScore: Math.min(1, evaluations.length / Math.max(1, exam.questions.length)),
    };
  }

  static exportExam(exam: Exam, format: "markdown" | "json" | "csv"): string {
    if (format === "json") return JSON.stringify(exam, null, 2);
    if (format === "csv") {
      return [
        "type,prompt,answer,marks,difficulty,topic",
        ...exam.questions.map((question: ExamQuestion) =>
          [question.type, question.prompt, normalizedAnswer(question.correctAnswer), String(question.marks), question.difficulty, question.topic ?? ""].map(csvCell).join(","),
        ),
      ].join("\n");
    }
    return [
      `# ${exam.title}`,
      "",
      `Type: ${exam.type}`,
      `Duration: ${exam.durationMinutes} minutes`,
      `Total marks: ${exam.totalMarks}`,
      "",
      ...exam.questions.flatMap((question: ExamQuestion, index: number) => [
        `## ${String(index + 1)}. ${question.prompt}`,
        `Type: ${question.type}`,
        `Marks: ${question.marks}`,
        `Difficulty: ${question.difficulty}`,
        `Answer: ${normalizedAnswer(question.correctAnswer)}`,
        "",
      ]),
    ].join("\n");
  }
}

function createQuestion(index: number, topic: string, difficulty: "easy" | "medium" | "hard"): ExamQuestion {
  const type = QUESTION_TYPES[index % QUESTION_TYPES.length] ?? "multiple_choice";
  const marks = type === "essay" || type === "case_study" ? 10 : type === "long_answer" ? 5 : 2;
  return {
    id: crypto.randomUUID(),
    type,
    prompt: promptForType(type, topic),
    choices: type === "multiple_choice" ? [`${topic} concept`, "Unrelated option", "None of these", "All of these"] : undefined,
    correctAnswer: answerForType(type, topic),
    explanation: `This checks understanding of ${topic}.`,
    difficulty,
    citations: [],
    marks,
    topic,
    expectedTimeMinutes: Math.max(1, marks * 2),
  };
}

function promptForType(type: QuestionType, topic: string): string {
  const prompts: Record<QuestionType, string> = {
    multiple_choice: `Which option best describes ${topic}?`,
    true_false: `${topic} can be explained using evidence from the source. True or false?`,
    fill_blank: `${topic} is important because ________.`,
    matching: `Match ${topic} terms with their meanings.`,
    one_word: `Give one key term related to ${topic}.`,
    short_answer: `Write a short answer on ${topic}.`,
    long_answer: `Explain ${topic} with examples.`,
    essay: `Write an essay-style answer about ${topic}.`,
    assertion_reason: `Assertion: ${topic} is important. Reason: It connects to source evidence. Evaluate both statements.`,
    case_study: `Read a case about ${topic} and explain the best response.`,
  };
  return prompts[type] ?? prompts.multiple_choice;
}

function answerForType(type: QuestionType, topic: string): string | string[] {
  if (type === "true_false") return "True";
  if (type === "matching") return [`${topic} -> key concept`];
  return `${topic} concept`;
}

function evaluateQuestion(question: ExamQuestion, answer: string): ExamAnswerEvaluation {
  const normalized = answer.trim().toLowerCase();
  const expected = normalizedAnswer(question.correctAnswer).toLowerCase();
  const containsExpected = normalized.length > 0 && expected.split(/\s+/).some((word) => word.length > 3 && normalized.includes(word));
  const lengthScore = question.type === "essay" || question.type === "long_answer" ? Math.min(1, normalized.length / 160) : Math.min(1, normalized.length / 30);
  const score = Math.round((containsExpected ? 70 : 25) + lengthScore * 30);
  const boundedScore = Math.max(0, Math.min(100, score));
  return {
    questionId: question.id,
    score: boundedScore,
    earnedMarks: Math.round((boundedScore / 100) * question.marks),
    feedback: containsExpected ? "Answer includes the expected concept." : "Answer needs stronger evidence and the expected concept.",
    mistakes: containsExpected ? [] : [`Missing or weak coverage of ${question.topic ?? "the topic"}`],
    confidence: normalized.length > 0 ? 0.75 : 0.25,
  };
}

function difficultyForIndex(index: number): "easy" | "medium" | "hard" {
  if (index % 5 === 0) return "hard";
  if (index % 2 === 0) return "medium";
  return "easy";
}

function durationForType(type: ExamType): number {
  const durations: Record<ExamType, number> = {
    practice_test: 30,
    mock_exam: 180,
    previous_year_style: 120,
    topic_exam: 45,
    subject_exam: 90,
    mixed_exam: 90,
    timed_exam: 60,
  };
  return durations[type] ?? 60;
}

function ratio(earned: number, total: number): number {
  return total === 0 ? 0 : Math.round((earned / total) * 100);
}

function normalizedAnswer(answer: string | string[]): string {
  return Array.isArray(answer) ? answer.join(" | ") : answer;
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}
