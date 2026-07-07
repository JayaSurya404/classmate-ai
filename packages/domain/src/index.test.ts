import { describe, expect, it } from "vitest";
import { canTransition, classifyReview } from "./index";

describe("operation policy", () => { it("allows only documented transitions", () => { expect(canTransition("queued", "preparing")).toBe(true); expect(canTransition("completed", "streaming")).toBe(false); }); });
describe("review policy", () => { it("resets failed recall and expands successful intervals", () => { expect(classifyReview("again", 8)).toBe(1); expect(classifyReview("good", 4)).toBe(10); }); });
