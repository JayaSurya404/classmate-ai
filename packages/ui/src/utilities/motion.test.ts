import { describe, expect, it } from "vitest";
import { fadeInUp, reducedMotionTransition, reducedMotionVariants, transitions } from "./motion";

describe("motion utilities", () => {
  it("provides fade-in-up variants", () => {
    expect(fadeInUp.visible).toEqual({ opacity: 1, y: 0 });
  });

  it("reduces motion variants when requested", () => {
    expect(reducedMotionVariants(fadeInUp, true).visible).toEqual({ opacity: 1 });
  });

  it("reduces motion transition duration to zero", () => {
    expect(reducedMotionTransition(transitions.normal, true)).toEqual({ duration: 0 });
  });
});
