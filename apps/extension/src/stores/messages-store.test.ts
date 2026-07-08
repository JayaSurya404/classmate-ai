import { describe, expect, it } from "vitest";
import { useMessagesStore } from "./messages-store";

describe("messages-store", () => {
  it("adds and retrieves session messages", () => {
    const sessionId = "session-1";
    useMessagesStore.setState({ messages: [], streamingMessageId: undefined });

    useMessagesStore.getState().addMessage({
      id: "m1",
      sessionId,
      role: "user",
      content: "Hello",
      status: "complete",
    });

    useMessagesStore.getState().addMessage({
      id: "m2",
      sessionId,
      role: "assistant",
      content: "Hi there",
      status: "complete",
    });

    const messages = useMessagesStore.getState().getSessionMessages(sessionId);
    expect(messages).toHaveLength(2);
    expect(useMessagesStore.getState().getLastAssistantMessage(sessionId)?.content).toBe("Hi there");
  });

  it("pins and saves messages", () => {
    useMessagesStore.setState({ messages: [], streamingMessageId: undefined });
    useMessagesStore.getState().addMessage({
      id: "m3",
      sessionId: "s2",
      role: "assistant",
      content: "Pinned",
      status: "complete",
    });

    useMessagesStore.getState().pinMessage("m3", true);
    useMessagesStore.getState().saveMessage("m3", true);

    const message = useMessagesStore.getState().messages.find((item) => item.id === "m3");
    expect(message?.pinned).toBe(true);
    expect(message?.saved).toBe(true);
  });
});
