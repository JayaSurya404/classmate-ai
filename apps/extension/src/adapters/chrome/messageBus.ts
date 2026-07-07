import { ExtensionMessageSchema, type ExtensionMessage } from "@classmate/contracts";

export class ChromeMessageBus {
  async send<T>(message: ExtensionMessage, validate: (value: unknown) => T): Promise<T> { const validated = ExtensionMessageSchema.parse(message); const response: unknown = await chrome.runtime.sendMessage(validated); return validate(response); }
  listen(handler: (message: ExtensionMessage, sender: chrome.runtime.MessageSender) => Promise<unknown>): () => void { const listener = (raw: unknown, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void): true | false => { const parsed = ExtensionMessageSchema.safeParse(raw); if (!parsed.success || sender.id !== chrome.runtime.id) return false; void handler(parsed.data, sender).then(sendResponse).catch(() => sendResponse({ ok: false, code: "INTERNAL_ERROR" })); return true; }; chrome.runtime.onMessage.addListener(listener); return () => chrome.runtime.onMessage.removeListener(listener); }
}
