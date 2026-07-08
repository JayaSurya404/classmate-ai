import { describe, expect, it } from "vitest";
import { useSessionsStore } from "./sessions-store";

describe("sessions-store", () => {
  it("creates and selects active sessions", () => {
    useSessionsStore.setState({ sessions: [], activeSessionId: undefined });

    const id = useSessionsStore.getState().createSession("Operating Systems");
    expect(useSessionsStore.getState().activeSessionId).toBe(id);
    expect(useSessionsStore.getState().getActiveSession()?.title).toBe("Operating Systems");
  });

  it("updates session metadata", () => {
    useSessionsStore.setState({ sessions: [], activeSessionId: undefined });
    const id = useSessionsStore.getState().createSession("Session A");

    useSessionsStore.getState().updateSession(id, { messageCount: 4, title: "Session B" });
    const session = useSessionsStore.getState().sessions.find((item) => item.id === id);
    expect(session?.messageCount).toBe(4);
    expect(session?.title).toBe("Session B");
  });
});
