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
  rewrite: template("transform.rewrite", "rewrite", "Rewrite the supplied source into clearer study notes while preserving meaning, claims, citations, headings, and technical accuracy."),
  simplify: template("transform.simplify", "simplify", "Simplify the supplied source for easier reading. Preserve factual meaning, define jargon, keep citations, and avoid adding unsupported facts."),
  flashcards: template("practice.flashcards", "flashcards", "Create at least 10 atomic active-recall flashcards with front, back, difficulty, tags, and citations. Include varied types: Q/A, cloze, definition, concept, and formula."),
  quiz: template("practice.quiz", "quiz", "Create at least 10 questions with varied types (multiple choice, true/false, fill in blanks, matching, one word, short answer, long answer), plausible distractors, correct answers, explanations, difficulty, and citations."),
  memory_tricks: template("study.memory_tricks", "memory_tricks", "Create labeled memory aids including mnemonics, acronyms, analogies, story method, and Feynman explanations. Explicitly map each aid to facts without replacing understanding."),
  mind_map: template("study.mind_map", "mind_map", "Create a hierarchical mind map with nested nodes showing relationships between concepts. Structure as a tree with main topic, branches, and sub-branches. Use clear labels and logical grouping."),
  study_plan: template("study.study_plan", "study_plan", "Create a structured study plan with time-bound sessions. Break down topics into manageable chunks with specific durations. Include focus areas, practice intervals, and review sessions."),
  exam_answer: template("exam.answer_by_marks", "exam_answer", "Create a proportionate mark-based study answer with introduction, logical headings, example, and conclusion. State that it is a study aid."),
  university_answer: template("exam.university_answer", "university_answer", "Create a structured university study answer without claiming knowledge of an unsupplied rubric."),
  lab_record: template("lab.record", "lab_record", "Return Aim, Requirements, Theory, Algorithm, Flow, Procedure, Observations, Result, Precautions, and Viva. Never fabricate observations or results."),
  viva: template("practice.viva", "viva", "Create progressive oral questions with concise answers, probes, key concepts, and citations."),
  chat: template("chat.grounded", "chat", "Answer the current question from the supplied evidence, identify uncertainty, and suggest non-repetitive study follow-ups."),
  smart_note: template("notes.smart_note", "smart_note", "Create a cited study note in Markdown with headings, key concepts, definitions, examples, revision prompts, backlinks candidates, and source citations. Preserve uncertainty and do not invent sources."),
  exam: template("exam.generator", "exam", "Create an exam-preparation artifact with varied question types, marks, answers, scoring guidance, weak-topic analysis, coverage notes, and adaptive revision recommendations grounded in the supplied source."),
};

function template(id: string, action: StudyAction, instruction: string): PromptTemplate {
  return { id, version: "1.0.0", action, status: "active", instruction };
}
