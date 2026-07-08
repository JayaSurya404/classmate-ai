import { ExtensionMessageSchema } from "@classmate/contracts";
import { extractFromBrowserContext } from "@classmate/content-core";

chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  const parsed = ExtensionMessageSchema.safeParse(raw);
  if (!parsed.success || parsed.data.type !== "CAPTURE_CONTEXT") return false;

  void capture(parsed.data.scope)
    .then((source) => {
      sendResponse({ ok: true, source });
    })
    .catch(() => {
      sendResponse({ ok: false, code: "CAPTURE_FAILED" });
    });

  return true;
});

async function capture(scope: "selection" | "page"): Promise<unknown> {
  const selection = scope === "selection" ? window.getSelection()?.toString() ?? "" : "";
  const result = await extractFromBrowserContext(
    {
      url: location.href,
      title: document.title || location.hostname,
      html: document.documentElement.outerHTML,
      language: document.documentElement.lang || undefined,
      selection: selection.trim() ? selection : undefined,
      scope: selection.trim() ? "selection" : "page",
    },
    crypto.randomUUID(),
  );

  if (result.snapshot.blocks.length === 0) {
    throw new Error("No visible text found");
  }

  return result.snapshot;
}
