import { describe, expect, it } from "vitest";
import { createSourceSnapshot } from "@classmate/test-kit";
import { assemblePrompt, loadPromptTemplate } from "./index";

const baseRequest = {
  schemaVersion: 1 as const,
  operationId: "00000000-0000-4000-8000-000000000002",
  prompt: "Help",
  source: createSourceSnapshot(),
  settings: { depth: "standard" as const, locale: "en", allowPaid: false },
};

describe("prompt engine", () => {
  it("delimits untrusted source and retains template provenance", () => {
    const prompt = assemblePrompt({ ...baseRequest, action: "summary" });
    expect(prompt.user).toContain("<SOURCE");
    expect(prompt.system).toContain("untrusted evidence");
    expect(prompt.template.id).toBe("study.summary");
    expect(loadPromptTemplate("summary").status).toBe("active");
  });

  it("supports rewrite and simplify transformation templates", () => {
    expect(loadPromptTemplate("rewrite").id).toBe("transform.rewrite");
    expect(loadPromptTemplate("simplify").id).toBe("transform.simplify");
  });

  it("maps response depth to explicit length instructions", () => {
    const shortPrompt = assemblePrompt({
      ...baseRequest,
      action: "explain_simple",
      settings: { ...baseRequest.settings, depth: "brief" },
    });
    const detailedPrompt = assemblePrompt({
      ...baseRequest,
      action: "explain_deep",
      settings: { ...baseRequest.settings, depth: "deep" },
    });

    expect(shortPrompt.system).toContain("Response length: short");
    expect(detailedPrompt.system).toContain("Response length: detailed");
  });
});
