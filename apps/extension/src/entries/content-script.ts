import { ExtensionMessageSchema, SourceSnapshotSchema } from "@classmate/contracts";
import { normalizeVisibleText } from "@classmate/content-core";

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  const parsed = ExtensionMessageSchema.safeParse(raw); if (!parsed.success || parsed.data.type !== "CAPTURE_CONTEXT") return false;
  void capture(parsed.data.scope).then((source) => sendResponse({ ok: true, source })).catch(() => sendResponse({ ok: false, code: "CAPTURE_FAILED" })); return true;
});
async function capture(scope: "selection" | "page"): Promise<unknown> {
  const selection = normalizeVisibleText(window.getSelection()?.toString() ?? "");
  const root = document.querySelector("main, article, [role='main']") ?? document.body;
  const text = selection || extractSafeText(root);
  if (!text) throw new Error("No visible text found");
  const id = crypto.randomUUID(); const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return SourceSnapshotSchema.parse({ schemaVersion: 1, id, title: document.title || location.hostname, canonicalUrl: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? location.href.split("#")[0], sourceType: classifySource(), capturedAt: new Date().toISOString(), contentHash: Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, "0")).join(""), language: document.documentElement.lang || "und", scope: selection ? "selection" : "page", sensitivity: "clear", blocks: [{ id: "b1", type: "paragraph", text, headingPath: [], startOffset: 0, endOffset: text.length }] });
}
function extractSafeText(root: Element): string { const clone = root.cloneNode(true) as Element; clone.querySelectorAll("script,style,noscript,nav,aside,footer,form,input,textarea,select,button,[hidden],[aria-hidden='true'],[contenteditable='true']").forEach((node) => node.remove()); return normalizeVisibleText(clone.textContent ?? "").slice(0, 500_000); }
function classifySource(): "article" | "documentation" | "repository" | "pdf" | "youtube" | "lms" | "generic" { if (location.pathname.toLowerCase().endsWith(".pdf")) return "pdf"; if (location.hostname.includes("youtube.com")) return "youtube"; if (location.hostname.includes("github.com")) return "repository"; if (document.querySelector("article")) return "article"; if (document.querySelector("pre code")) return "documentation"; if (/canvas|moodle|blackboard/.test(location.hostname)) return "lms"; return "generic"; }
