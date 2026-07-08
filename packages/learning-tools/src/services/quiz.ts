import type { Quiz, QuizQuestion, QuizAttempt, QuestionType } from "@classmate/contracts";
import { QuizSchema, QuizQuestionSchema, QuizAttemptSchema } from "@classmate/contracts";

export interface QuizServiceOptions {
  shuffle?: boolean;
  filterByType?: QuestionType[];
  filterByDifficulty?: ("easy" | "medium" | "hard")[];
}

export class QuizService {
  private quiz: Quiz;

  constructor(quiz: Quiz) {
    this.quiz = quiz;
  }

  static createQuiz(title: string, sourceId?: string): Quiz {
    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title,
      sourceId,
      questions: [],
      attempts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static addQuestion(quiz: Quiz, question: Omit<QuizQuestion, "id">): Quiz {
    const newQuestion: QuizQuestion = {
      ...question,
      id: crypto.randomUUID(),
    };
    return {
      ...quiz,
      questions: [...quiz.questions, newQuestion],
      updatedAt: new Date().toISOString(),
    };
  }

  static updateQuestion(quiz: Quiz, questionId: string, updates: Partial<QuizQuestion>): Quiz {
    return {
      ...quiz,
      questions: quiz.questions.map((q: QuizQuestion) =>
        q.id === questionId ? { ...q, ...updates } : q
      ),
      updatedAt: new Date().toISOString(),
    };
  }

  static deleteQuestion(quiz: Quiz, questionId: string): Quiz {
    return {
      ...quiz,
      questions: quiz.questions.filter((q: QuizQuestion) => q.id !== questionId),
      updatedAt: new Date().toISOString(),
    };
  }

  getQuestions(options: QuizServiceOptions = {}): QuizQuestion[] {
    let questions = [...this.quiz.questions];

    if (options.filterByType) {
      questions = questions.filter((q: QuizQuestion) => options.filterByType?.includes(q.type));
    }

    if (options.filterByDifficulty) {
      questions = questions.filter((q: QuizQuestion) => options.filterByDifficulty?.includes(q.difficulty));
    }

    if (options.shuffle) {
      questions = this.shuffleArray(questions);
    }

    return questions;
  }

  getQuestionById(questionId: string): QuizQuestion | undefined {
    return this.quiz.questions.find((q: QuizQuestion) => q.id === questionId);
  }

  submitAttempt(answers: Record<string, string | string[]>): QuizAttempt {
    const attempt: QuizAttempt = {
      id: crypto.randomUUID(),
      quizId: this.quiz.id,
      answers,
      score: this.calculateScore(answers),
      completedAt: new Date().toISOString(),
    };

    this.quiz.attempts.push(attempt);
    return attempt;
  }

  static addAttempt(quiz: Quiz, attempt: QuizAttempt): Quiz {
    return {
      ...quiz,
      attempts: [...quiz.attempts, attempt],
      updatedAt: new Date().toISOString(),
    };
  }

  getAttempts(): readonly QuizAttempt[] {
    return this.quiz.attempts;
  }

  getAttemptById(attemptId: string): QuizAttempt | undefined {
    return this.quiz.attempts.find((a: QuizAttempt) => a.id === attemptId);
  }

  getBestAttempt(): QuizAttempt | undefined {
    if (this.quiz.attempts.length === 0) return undefined;
    return this.quiz.attempts.reduce((best: QuizAttempt, current: QuizAttempt) =>
      current.score > best.score ? current : best
    );
  }

  getAverageScore(): number {
    if (this.quiz.attempts.length === 0) return 0;
    const total = this.quiz.attempts.reduce((sum: number, a: QuizAttempt) => sum + a.score, 0);
    return total / this.quiz.attempts.length;
  }

  getStatistics(): {
    totalQuestions: number;
    byType: Record<QuestionType, number>;
    byDifficulty: Record<"easy" | "medium" | "hard", number>;
    totalAttempts: number;
    averageScore: number;
    bestScore: number;
  } {
    const stats = {
      totalQuestions: this.quiz.questions.length,
      byType: {
        multiple_choice: 0,
        true_false: 0,
        fill_blank: 0,
        matching: 0,
        one_word: 0,
        short_answer: 0,
        long_answer: 0,
      } as Record<QuestionType, number>,
      byDifficulty: { easy: 0, medium: 0, hard: 0 } as Record<"easy" | "medium" | "hard", number>,
      totalAttempts: this.quiz.attempts.length,
      averageScore: this.getAverageScore(),
      bestScore: this.getBestAttempt()?.score ?? 0,
    };

    this.quiz.questions.forEach((q: QuizQuestion) => {
      const type = q.type;
      const difficulty = q.difficulty;
      const typeKey = type as keyof typeof stats.byType;
      const difficultyKey = difficulty as keyof typeof stats.byDifficulty;
      const typeValue = stats.byType[typeKey];
      const difficultyValue = stats.byDifficulty[difficultyKey];
      if (typeValue !== undefined) {
        stats.byType[typeKey] = typeValue + 1;
      }
      if (difficultyValue !== undefined) {
        stats.byDifficulty[difficultyKey] = difficultyValue + 1;
      }
    });

    return stats;
  }

  checkAnswer(questionId: string, answer: string | string[]): boolean {
    const question = this.getQuestionById(questionId);
    if (!question) return false;

    const correct = question.correctAnswer;
    if (Array.isArray(correct)) {
      if (Array.isArray(answer)) {
        return (
          answer.length === correct.length &&
          answer.every((a) => correct.includes(a))
        );
      }
      return correct.includes(answer);
    }

    if (Array.isArray(answer)) {
      return answer.includes(correct);
    }

    return answer.toLowerCase().trim() === correct.toLowerCase().trim();
  }

  private calculateScore(answers: Record<string, string | string[]>): number {
    if (this.quiz.questions.length === 0) return 0;

    let correct = 0;
    this.quiz.questions.forEach((q: QuizQuestion) => {
      if (this.checkAnswer(q.id, answers[q.id] ?? "")) {
        correct++;
      }
    });

    return Math.round((correct / this.quiz.questions.length) * 100);
  }

  static parseFromMarkdown(markdown: string): Quiz {
    const lines = markdown.split("\n");
    const questions: QuizQuestion[] = [];
    let currentQuestion: Partial<QuizQuestion> | null = null;

    for (const line of lines) {
      const typeMatch = line.match(/^###\s*(multiple_choice|true_false|fill_blank|matching|one_word|short_answer|long_answer)/i);
      if (typeMatch) {
        if (currentQuestion && currentQuestion.prompt && currentQuestion.correctAnswer) {
          questions.push(QuizService.createQuestionFromPartial(currentQuestion));
        }
        const matchedType = typeMatch[1]?.toLowerCase();
        if (matchedType) {
          currentQuestion = {
            type: matchedType as QuestionType,
            difficulty: "medium",
            citations: [],
          };
        }
        continue;
      }

      if (!currentQuestion) continue;

      const promptMatch = line.match(/^Question:\s*(.*)/i);
      if (promptMatch) {
        currentQuestion.prompt = promptMatch[1]?.trim() ?? "";
        continue;
      }

      const choicesMatch = line.match(/^Choices:\s*(.*)/i);
      if (choicesMatch) {
        currentQuestion.choices = choicesMatch[1]?.split("|").map((c: string) => c.trim()).filter(Boolean) ?? [];
        continue;
      }

      const answerMatch = line.match(/^Answer:\s*(.*)/i);
      if (answerMatch) {
        const answer = answerMatch[1]?.trim() ?? "";
        const choices = currentQuestion.choices;
        if (choices && choices.length > 0) {
          currentQuestion.correctAnswer = choices.includes(answer) ? answer : choices[0] ?? "";
        } else {
          currentQuestion.correctAnswer = answer;
        }
        continue;
      }

      const explanationMatch = line.match(/^Explanation:\s*(.*)/i);
      if (explanationMatch) {
        const explanation = explanationMatch[1]?.trim();
        if (explanation !== undefined) {
          currentQuestion.explanation = explanation;
        }
        continue;
      }

      const difficultyMatch = line.match(/^Difficulty:\s*(easy|medium|hard)/i);
      if (difficultyMatch) {
        const difficulty = difficultyMatch[1]?.toLowerCase();
        if (difficulty === "easy" || difficulty === "medium" || difficulty === "hard") {
          currentQuestion.difficulty = difficulty;
        }
        continue;
      }
    }

    if (currentQuestion && currentQuestion.prompt && currentQuestion.correctAnswer) {
      questions.push(QuizService.createQuestionFromPartial(currentQuestion));
    }

    return {
      schemaVersion: 1,
      id: crypto.randomUUID(),
      title: "Imported Quiz",
      questions,
      attempts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  static exportToMarkdown(quiz: Quiz): string {
    const lines: string[] = [`# ${quiz.title}`, ``, `Total questions: ${quiz.questions.length}`, ``];

    quiz.questions.forEach((q: QuizQuestion) => {
      lines.push(`### ${q.type}`);
      lines.push(`Question: ${q.prompt}`);
      if (q.choices && q.choices.length > 0) {
        lines.push(`Choices: ${q.choices.join(" | ")}`);
      }
      lines.push(`Answer: ${Array.isArray(q.correctAnswer) ? q.correctAnswer.join(", ") : q.correctAnswer}`);
      if (q.explanation) {
        lines.push(`Explanation: ${q.explanation}`);
      }
      lines.push(`Difficulty: ${q.difficulty}`);
      lines.push(``);
    });

    return lines.join("\n");
  }

  static exportToJson(quiz: Quiz): string {
    return JSON.stringify(quiz, null, 2);
  }

  static exportToCsv(quiz: Quiz): string {
    const headers = ["Type", "Question", "Choices", "Answer", "Explanation", "Difficulty"];
    const rows = quiz.questions.map((q: QuizQuestion) => [
      q.type,
      `"${q.prompt.replace(/"/g, '""')}"`,
      q.choices ? `"${q.choices.join(" | ").replace(/"/g, '""')}"` : "",
      Array.isArray(q.correctAnswer)
        ? `"${q.correctAnswer.join(", ").replace(/"/g, '""')}"`
        : `"${q.correctAnswer.replace(/"/g, '""')}"`,
      q.explanation ? `"${q.explanation.replace(/"/g, '""')}"` : "",
      q.difficulty,
    ]);

    return [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");
  }

  private shuffleArray<T>(array: readonly T[]): T[] {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffled[i]!;
      shuffled[i] = shuffled[j]!;
      shuffled[j] = temp;
    }
    return shuffled;
  }

  private static createQuestionFromPartial(partial: Partial<QuizQuestion>): QuizQuestion {
    return QuizQuestionSchema.parse({
      id: crypto.randomUUID(),
      type: partial.type ?? "multiple_choice",
      prompt: partial.prompt ?? "",
      choices: partial.choices,
      correctAnswer: partial.correctAnswer ?? "",
      explanation: partial.explanation,
      difficulty: partial.difficulty ?? "medium",
      citations: partial.citations ?? [],
    });
  }
}
