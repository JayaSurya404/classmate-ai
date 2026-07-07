import { describe, expect, it } from "vitest";
import { isAllowedLoopback } from "./index";

describe("Ollama endpoint policy", () => { it("permits only explicit HTTP loopback addresses", () => { expect(isAllowedLoopback("http://localhost:11434/v1")).toBe(true); expect(isAllowedLoopback("https://example.com")).toBe(false); expect(isAllowedLoopback("file:///tmp/model")).toBe(false); }); });
