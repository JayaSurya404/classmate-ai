import { describe, expect, it } from "vitest";
import { createSourceSnapshot } from "@classmate/test-kit";
import { chunkSource, normalizeVisibleText, validateCitationIds } from "./index";

describe("content pipeline", () => { it("normalizes, chunks, and validates citation IDs", () => { expect(normalizeVisibleText(" a   b \n\n\n c ")).toBe("a b\n\n c"); const chunks = chunkSource(createSourceSnapshot()); expect(chunks).toHaveLength(1); expect(validateCitationIds(["S1-C1", "invented"], chunks)).toEqual(["S1-C1"]); }); });
