import { motion } from "framer-motion";
import { useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle, Download, RotateCcw, Shuffle, XCircle } from "lucide-react";
import { Button } from "@classmate/ui";
import { cn } from "@classmate/ui";
import type { Quiz, QuizQuestion, QuestionType } from "@classmate/contracts";

interface QuizViewProps {
  quiz: Quiz;
  onUpdateQuiz: (quiz: Quiz) => void;
  onExport: (format: "markdown" | "json" | "csv") => void;
}

export function QuizView({ quiz, onUpdateQuiz, onExport }: QuizViewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, string | string[]>>({});
  const [showResults, setShowResults] = useState(false);
  const [filterType, setFilterType] = useState<QuestionType | "all">("all");

  const filteredQuestions = quiz.questions.filter((q) => {
    if (filterType !== "all" && q.type !== filterType) return false;
    return true;
  });

  const currentQuestion = filteredQuestions[currentIndex];
  const hasQuestions = filteredQuestions.length > 0;

  const handleNext = () => {
    if (!hasQuestions) return;
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev + 1) % filteredQuestions.length);
  };

  const handlePrevious = () => {
    if (!hasQuestions) return;
    setShowAnswer(false);
    setCurrentIndex((prev) => (prev - 1 + filteredQuestions.length) % filteredQuestions.length);
  };

  const handleShuffle = () => {
    const shuffled = [...filteredQuestions].sort(() => Math.random() - 0.5);
    onUpdateQuiz({ ...quiz, questions: shuffled });
    setCurrentIndex(0);
    setShowAnswer(false);
  };

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion) return;
    setUserAnswers({ ...userAnswers, [currentQuestion.id]: answer });
  };

  const handleMultipleChoiceSelect = (answer: string) => {
    if (!currentQuestion) return;
    const current = userAnswers[currentQuestion.id];
    const selected = Array.isArray(current) ? current : [];
    const newSelected = selected.includes(answer)
      ? selected.filter((a) => a !== answer)
      : [...selected, answer];
    setUserAnswers({ ...userAnswers, [currentQuestion.id]: newSelected });
  };

  const calculateScore = () => {
    let correct = 0;
    quiz.questions.forEach((q) => {
      const userAnswer = userAnswers[q.id];
      const correctAnswer = q.correctAnswer;
      
      if (Array.isArray(correctAnswer)) {
        if (Array.isArray(userAnswer)) {
          if (userAnswer.length === correctAnswer.length && userAnswer.every((a) => correctAnswer.includes(a))) {
            correct++;
          }
        }
      } else {
        if (userAnswer === correctAnswer) {
          correct++;
        }
      }
    });
    return Math.round((correct / quiz.questions.length) * 100);
  };

  const isCorrect = () => {
    if (!currentQuestion) return false;
    const userAnswer = userAnswers[currentQuestion.id];
    const correctAnswer = currentQuestion.correctAnswer;
    
    if (Array.isArray(correctAnswer)) {
      if (Array.isArray(userAnswer)) {
        return userAnswer.length === correctAnswer.length && userAnswer.every((a) => correctAnswer.includes(a));
      }
      return false;
    }
    
    return userAnswer === correctAnswer;
  };

  const stats = {
    total: quiz.questions.length,
    answered: Object.keys(userAnswers).length,
    attempts: quiz.attempts.length,
    bestScore: quiz.attempts.length > 0 ? Math.max(...quiz.attempts.map((a) => a.score)) : 0,
  };

  const handleSubmit = () => {
    const score = calculateScore();
    const attempt = {
      id: crypto.randomUUID(),
      quizId: quiz.id,
      answers: userAnswers,
      score,
      completedAt: new Date().toISOString(),
    };
    onUpdateQuiz({ ...quiz, attempts: [...quiz.attempts, attempt] });
    setShowResults(true);
  };

  const handleRetry = () => {
    setUserAnswers({});
    setShowResults(false);
    setCurrentIndex(0);
    setShowAnswer(false);
  };

  if (showResults) {
    const score = calculateScore();
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-title font-bold">{quiz.title} - Results</h2>
          <Button variant="outline" size="sm" onClick={() => onExport("markdown")}>
            <Download className="size-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-auto max-w-2xl text-center"
          >
            <div className="mb-6">
              <div className="text-6xl font-bold text-primary">{score}%</div>
              <div className="text-muted-foreground">Your Score</div>
            </div>

            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-muted-foreground">Total Questions</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-2xl font-bold">{stats.answered}</div>
                <div className="text-sm text-muted-foreground">Answered</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-2xl font-bold">{stats.bestScore}%</div>
                <div className="text-sm text-muted-foreground">Best Score</div>
              </div>
            </div>

            <div className="flex gap-4 justify-center">
              <Button onClick={handleRetry} size="lg">
                <RotateCcw className="mr-2 size-4" />
                Try Again
              </Button>
              <Button variant="outline" onClick={() => setShowResults(false)} size="lg">
                Review Answers
              </Button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-title font-bold">{quiz.title}</h2>
        <div className="flex gap-2">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as QuestionType | "all")}
            className="rounded-md border border-border bg-background px-3 py-1.5 text-sm"
          >
            <option value="all">All Types</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True/False</option>
            <option value="fill_blank">Fill in the Blank</option>
            <option value="matching">Matching</option>
            <option value="one_word">One Word</option>
            <option value="short_answer">Short Answer</option>
            <option value="long_answer">Long Answer</option>
          </select>
          <Button variant="outline" size="sm" onClick={handleShuffle}>
            <Shuffle className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => onExport("markdown")}>
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
          <span>Total: {stats.total}</span>
          <span>Answered: {stats.answered}</span>
          <span>Attempts: {stats.attempts}</span>
        </div>

        {!hasQuestions ? (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <p>No questions match the current filters.</p>
          </div>
        ) : (
          <div className="mx-auto max-w-2xl">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
              className="rounded-xl border border-border bg-card p-6 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between">
                <span className="text-xs font-medium uppercase text-muted-foreground">
                  {currentQuestion?.type.replace("_", " ")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {currentIndex + 1} / {filteredQuestions.length}
                </span>
              </div>

              <p className="mb-6 text-lg font-medium">{currentQuestion?.prompt}</p>

              {currentQuestion?.type === "multiple_choice" && currentQuestion.choices && (
                <div className="space-y-2">
                  {currentQuestion.choices.map((choice, idx) => {
                    const currentAnswer = userAnswers[currentQuestion.id];
                    const isSelected = Array.isArray(currentAnswer)
                      ? currentAnswer.includes(choice)
                      : currentAnswer === choice;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleMultipleChoiceSelect(choice)}
                        className={cn(
                          "w-full rounded-lg border border-border p-3 text-left transition-colors",
                          isSelected
                            ? "border-primary bg-primary/10"
                            : "hover:bg-accent"
                        )}
                      >
                        {choice}
                      </button>
                    );
                  })}
                </div>
              )}

              {currentQuestion?.type === "true_false" && (
                <div className="flex gap-4">
                  {["True", "False"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => handleAnswerSelect(option)}
                      className={cn(
                        "flex-1 rounded-lg border border-border p-3 font-medium transition-colors",
                        userAnswers[currentQuestion.id] === option
                          ? "border-primary bg-primary/10"
                          : "hover:bg-accent"
                      )}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {(currentQuestion?.type === "one_word" ||
                currentQuestion?.type === "short_answer" ||
                currentQuestion?.type === "long_answer") && (
                <input
                  type="text"
                  value={userAnswers[currentQuestion.id] as string || ""}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                  placeholder="Type your answer..."
                  className="w-full rounded-lg border border-border bg-background px-4 py-3"
                />
              )}

              {currentQuestion?.type === "fill_blank" && (
                <input
                  type="text"
                  value={userAnswers[currentQuestion.id] as string || ""}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                  placeholder="Fill in the blank..."
                  className="w-full rounded-lg border border-border bg-background px-4 py-3"
                />
              )}

              {showAnswer && currentQuestion && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-lg bg-accent p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    {isCorrect() ? (
                      <CheckCircle className="size-5 text-green-500" />
                    ) : (
                      <XCircle className="size-5 text-red-500" />
                    )}
                    <span className="font-medium">
                      {isCorrect() ? "Correct!" : "Incorrect"}
                    </span>
                  </div>
                  <p className="text-sm">
                    <span className="font-medium">Answer: </span>
                    {Array.isArray(currentQuestion.correctAnswer)
                      ? currentQuestion.correctAnswer.join(", ")
                      : currentQuestion.correctAnswer}
                  </p>
                  {currentQuestion.explanation && (
                    <p className="mt-2 text-sm text-muted-foreground">
                      <span className="font-medium">Explanation: </span>
                      {currentQuestion.explanation}
                    </p>
                  )}
                </motion.div>
              )}

              <div className="mt-4 text-xs text-muted-foreground">
                Difficulty: {currentQuestion?.difficulty}
              </div>
            </motion.div>

            <div className="mt-6 flex items-center justify-center gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={handlePrevious}
                disabled={!hasQuestions}
                className="flex-1"
              >
                <ArrowLeft className="mr-2 size-4" />
                Previous
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={() => setShowAnswer(!showAnswer)}
                disabled={!hasQuestions}
                className="flex-1"
              >
                {showAnswer ? "Hide" : "Show"} Answer
              </Button>

              <Button
                variant="outline"
                size="lg"
                onClick={handleNext}
                disabled={!hasQuestions}
                className="flex-1"
              >
                Next
                <ArrowRight className="ml-2 size-4" />
              </Button>
            </div>

            <div className="mt-4 flex items-center justify-center">
              <Button onClick={handleSubmit} size="lg" className="w-full max-w-xs">
                Submit Quiz
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
