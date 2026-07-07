import { SourceSnapshotSchema, type SourceSnapshot } from "@classmate/contracts";

export type CaptureResult = { ok: true; source: SourceSnapshot } | { ok: false; code: "RESTRICTED" | "PERMISSION" | "EMPTY" | "FAILED"; message: string };
type CaptureFailureCode = "RESTRICTED" | "PERMISSION" | "EMPTY" | "FAILED";
export async function captureActiveTab(): Promise<CaptureResult> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || /^(chrome|edge|about|chrome-extension):/.test(tab.url)) return failure("RESTRICTED", "Chrome does not allow page access here. Paste text instead.");
  try {
    const permission = { origins: [`${new URL(tab.url).origin}/*`] }; const hasPermission = await chrome.permissions.contains(permission);
    if (!hasPermission && !(await chrome.permissions.request(permission))) return failure("PERMISSION", "Page access was not granted. Your existing draft is safe.");
    const message = { version: 1 as const, type: "CAPTURE_CONTEXT" as const, requestId: crypto.randomUUID(), scope: "selection" as const };
    let raw: unknown;
    try { raw = await chrome.tabs.sendMessage(tab.id, message); } catch { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["assets/content-script.js"] }); raw = await chrome.tabs.sendMessage(tab.id, message); }
    if (typeof raw !== "object" || raw === null || !("ok" in raw) || raw.ok !== true || !("source" in raw)) return failure("EMPTY", "No readable text was found. Try selecting text or paste it here.");
    const parsed = SourceSnapshotSchema.safeParse(raw.source); return parsed.success ? { ok: true, source: parsed.data } : failure("FAILED", "The captured page did not pass safety validation.");
  } catch { return failure("FAILED", "The page could not be read. Your draft is safe; retry or paste text."); }
}
function failure(code: CaptureFailureCode, message: string): CaptureResult { return { ok: false, code, message }; }
