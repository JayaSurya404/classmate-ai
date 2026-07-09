import { afterEach, describe, expect, it, vi } from "vitest";
import { measurePerformance, writeSafeLog } from "./logger";

describe("extension logger", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("redacts secret metadata and URL-like values", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    writeSafeLog({
      level: "info",
      event: "provider.request https://example.com",
      metadata: {
        apiKey: "sk-live-value",
        sourceUrl: "https://example.com/article",
        count: 3,
      },
    });

    const record = info.mock.calls[0]?.[0] as {
      event: string;
      metadata: Record<string, string | number | boolean>;
    };

    expect(record.event).toBe("provider.request [url]");
    expect(record.metadata.apiKey).toBe("[redacted]");
    expect(record.metadata.sourceUrl).toBe("[url]");
    expect(record.metadata.count).toBe(3);
  });

  it("records performance metrics for successful operations", () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = measurePerformance("unit.operation", () => "ok", "unit-test");

    expect(result).toBe("ok");
    expect(info).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "performance.metric",
        component: "unit-test",
        metadata: { name: "unit.operation", success: true },
      }),
    );
  });
});
