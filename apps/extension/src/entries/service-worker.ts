import { ExtensionMessageSchema } from "@classmate/contracts";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    for (const [id, title] of [["summary", "Summarize selection"], ["explain_simple", "Explain selection simply"], ["flashcards", "Make flashcards from selection"], ["chat", "Ask ClassMate AI"]] as const) chrome.contextMenus.create({ id, title, contexts: ["selection"] });
  });
});
chrome.action.onClicked.addListener((tab) => { if (tab.windowId !== undefined) void chrome.sidePanel.open({ windowId: tab.windowId }); });
chrome.contextMenus.onClicked.addListener((_info, tab) => { if (tab?.windowId !== undefined) void chrome.sidePanel.open({ windowId: tab.windowId }); });
chrome.commands.onCommand.addListener((command, tab) => { if ((command === "capture-selection" || command === "_execute_action") && tab?.windowId !== undefined) void chrome.sidePanel.open({ windowId: tab.windowId }); });
chrome.runtime.onMessage.addListener((raw: unknown, sender, sendResponse) => {
  const parsed = ExtensionMessageSchema.safeParse(raw);
  if (!parsed.success || sender.id !== chrome.runtime.id) { sendResponse({ ok: false, code: "INVALID_MESSAGE" }); return false; }
  if (parsed.data.type === "OPEN_SIDE_PANEL" && sender.tab?.windowId !== undefined) void chrome.sidePanel.open({ windowId: sender.tab.windowId });
  return false;
});
