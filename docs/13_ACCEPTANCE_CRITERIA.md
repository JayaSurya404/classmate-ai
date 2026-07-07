# ClassMate AI

**Document:** Acceptance Criteria

**Version:** 1.0.0

**Status:** Approved

---

# Purpose

This document defines the minimum acceptance criteria for every feature in ClassMate AI.

A feature is considered complete only when all listed criteria are satisfied.

---

# General Acceptance Criteria

Every feature must satisfy the following:

- Builds successfully without errors.
- No TypeScript errors.
- No ESLint errors.
- Responsive UI.
- Keyboard accessible.
- Loading state implemented.
- Error state implemented.
- Empty state implemented.
- Success feedback implemented.
- Mobile Chrome compatibility where applicable.
- Chrome Manifest V3 compatible.
- Dark theme supported.
- Documentation updated.
- Unit tests added where practical.

---

# AI Features

Every AI feature must:

- Read page context correctly.
- Use provider abstraction.
- Work with Gemini.
- Work with Groq.
- Work with OpenRouter.
- Work with Ollama.
- Stream responses when supported.
- Render Markdown.
- Support Copy.
- Support Save.
- Support Retry.

---

# Summary

Acceptance

- Reads webpage.
- Generates summary.
- Displays markdown.
- Copy works.
- Save works.

---

# Flashcards

Acceptance

- Minimum 10 flashcards.
- Question and answer format.
- Copy works.
- Save works.

---

# Quiz

Acceptance

- Minimum 10 MCQs.
- Correct answers shown.
- Difficulty supported.

---

# Exam Answers

Acceptance

- 2 Marks
- 5 Marks
- 10 Marks
- 16 Marks

All formatted correctly.

---

# PDF

Acceptance

- Opens PDF.
- Extracts text.
- Generates AI response.

---

# YouTube

Acceptance

- Detects video.
- Reads transcript.
- Generates summary.

---

# OCR

Acceptance

- Extracts text from image.
- AI understands extracted content.

---

# History

Acceptance

- Saves locally.
- Search works.
- Delete works.

---

# Settings

Acceptance

- Theme.
- AI Provider.
- Language.
- Prompt Style.
- Export Options.

---

# Performance

- Initial load < 2 seconds.
- AI request starts < 500 ms after action.
- No UI freezing.
- Lazy loading enabled.

---

# Final Acceptance

The project is complete only when every feature listed in the project specification satisfies these criteria.