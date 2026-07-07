import { describe, expect, it } from "vitest";
import { createSourceSnapshot } from "@classmate/test-kit";
import { assemblePrompt, loadPromptTemplate } from "./index";

describe("prompt engine", () => { it("delimits untrusted source and retains template provenance", () => { const prompt = assemblePrompt({ schemaVersion: 1, operationId: "00000000-0000-4000-8000-000000000002", action: "summary", prompt: "Help", source: createSourceSnapshot(), settings: { depth: "standard", locale: "en", allowPaid: false } }); expect(prompt.user).toContain("<SOURCE"); expect(prompt.system).toContain("untrusted evidence"); expect(prompt.template.id).toBe("study.summary"); expect(loadPromptTemplate("summary").status).toBe("active"); }); });
