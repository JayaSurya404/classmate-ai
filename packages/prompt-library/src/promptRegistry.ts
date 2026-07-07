import type { StudyAction } from "@classmate/contracts";

export interface PromptTemplate {
  id: string;
  version: "1.0.0";
  action: StudyAction;
  status: "active";
  instruction: string;
}

export const promptRegistry: Readonly<Record<StudyAction, PromptTemplate>> = {
  summary: template("study.summary", "summary", "Create a faithful structured summary with overview, key points, key terms, takeaways, coverage, and citations."),
  explain_simple: template("study.explain_simple", "explain_simple", "Explain in plain language with definitions, one labeled analogy, a concrete example, caveat, and check question."),
  explain_deep: template("study.explain_deep", "explain_deep", "Give a precise definition, prerequisites, mechanism, worked example, edge cases, misconceptions, and recap."),
  flashcards: template("practice.flashcards", "flashcards", "Create at least 10 atomic active-recall flashcards with front, back, difficulty, tags, and citations."),
  quiz: template("practice.quiz", "quiz", "Create at least 10 questions with varied types, plausible distractors, correct answers, explanations, difficulty, and citations."),
  memory_tricks: template("study.memory_tricks", "memory_tricks", "Create labeled memory aids and explicitly map each aid to facts without replacing understanding."),
  exam_answer: template("exam.answer_by_marks", "exam_answer", "Create a proportionate mark-based study answer with introduction, logical headings, example, and conclusion. State that it is a study aid."),
  university_answer: template("exam.university_answer", "university_answer", "Create a structured university study answer without claiming knowledge of an unsupplied rubric."),
  lab_record: template("lab.record", "lab_record", "Return Aim, Requirements, Theory, Algorithm, Flow, Procedure, Observations, Result, Precautions, and Viva. Never fabricate observations or results."),
  viva: template("practice.viva", "viva", "Create progressive oral questions with concise answers, probes, key concepts, and citations."),
  chat: template("chat.grounded", "chat", "Answer the current question from the supplied evidence, identify uncertainty, and suggest non-repetitive study follow-ups."),
};

function template(id: string, action: StudyAction, instruction: string): PromptTemplate {
  return { id, version: "1.0.0", action, status: "active", instruction };
}
