import { SourceSnapshotSchema, type SourceSnapshot } from "@classmate/contracts";

export function createSourceSnapshot(overrides: Partial<SourceSnapshot> = {}): SourceSnapshot {
  const text = overrides.blocks?.[0]?.text ?? "A deterministic source fixture.";
  return SourceSnapshotSchema.parse({ schemaVersion: 1, id: "00000000-0000-4000-8000-000000000001", title: "Fixture source", sourceType: "article", capturedAt: "2026-01-01T00:00:00.000Z", contentHash: "0123456789abcdef", language: "en", scope: "selection", sensitivity: "clear", blocks: [{ id: "b1", type: "paragraph", text, headingPath: [], startOffset: 0, endOffset: text.length }], ...overrides });
}
