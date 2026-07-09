import { motion } from "framer-motion";
import { lazy, Suspense, useEffect, useMemo } from "react";
import { useToast } from "@classmate/ui";
import { useMessagesStore } from "../../../stores/messages-store";
import { useSessionsStore } from "../../../stores/sessions-store";
import { useUiStore } from "../../../stores/ui-store";
import { useWorkspaceStore } from "../../../stores/workspace-store";
import type { ExamPanelMode } from "../../exam/ExamPrepView";
import type { NotebookPanelMode } from "../../notebook/NotebookView";
import type { SyncPanelMode } from "../../sync/SyncCenterView";
import { useAutoScroll } from "../hooks/useAutoScroll";
import { useWorkspaceActions } from "../hooks/useWorkspaceActions";
import { useWorkspaceShortcuts } from "../hooks/useWorkspaceShortcuts";
import { BottomToolbar } from "./BottomToolbar";
import { ChatContainer } from "./ChatContainer";
import { Composer } from "./Composer";
import { ContextCard } from "./ContextCard";
import { PromptSuggestions } from "./PromptSuggestions";
import { QuickActions } from "./QuickActions";
import { StatusBar } from "./StatusBar";
import { StudySessionCard } from "./StudySessionCard";
import { SourceDocumentPanel } from "./SourceDocumentPanel";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkspaceMobileNav, WorkspaceNavigation } from "./WorkspaceNavigation";

const ExamPrepView = lazy(() => import("../../exam/ExamPrepView").then((module) => ({ default: module.ExamPrepView })));
const NotebookView = lazy(() => import("../../notebook/NotebookView").then((module) => ({ default: module.NotebookView })));
const PracticeView = lazy(() => import("../../practice").then((module) => ({ default: module.PracticeView })));
const SemanticSearchView = lazy(() =>
  import("../../semantic/SemanticSearchView").then((module) => ({ default: module.SemanticSearchView })),
);
const SettingsView = lazy(() => import("../../settings/SettingsView").then((module) => ({ default: module.SettingsView })));
const SyncCenterView = lazy(() => import("../../sync/SyncCenterView").then((module) => ({ default: module.SyncCenterView })));

function PanelFallback({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground" role="status">
      Loading {label}…
    </div>
  );
}

export function Workspace() {
  const panel = useUiStore((state) => state.panel);
  const sidebarCollapsed = useUiStore((state) => state.sidebarCollapsed);

  const mode = useWorkspaceStore((state) => state.mode);
  const source = useWorkspaceStore((state) => state.source);
  const composerDraft = useWorkspaceStore((state) => state.composerDraft);
  const isThinking = useWorkspaceStore((state) => state.isThinking);
  const isCapturing = useWorkspaceStore((state) => state.isCapturing);
  const showJumpToLatest = useWorkspaceStore((state) => state.showJumpToLatest);
  const activeQuickAction = useWorkspaceStore((state) => state.activeQuickAction);

  const sessions = useSessionsStore((state) => state.sessions);
  const activeSessionId = useSessionsStore((state) => state.activeSessionId);

  const messages = useMessagesStore((state) => state.messages);
  const streamingMessageId = useMessagesStore((state) => state.streamingMessageId);

  const {
    captureSource,
    sendMessage,
    stopGeneration,
    retryMessage,
    regenerateMessage,
    continueMessage,
    applySuggestion,
    copyMessage,
    copyLastResponse,
    saveAssistantMessage,
    loadDraft,
    removeSource,
    suggestions,
  } = useWorkspaceActions();

  const { toast } = useToast();
  const activeSession = useSessionsStore((state) =>
    state.sessions.find((session) => session.id === state.activeSessionId),
  );
  const sessionMessages = useMemo(
    () => (activeSessionId ? messages.filter((message) => message.sessionId === activeSessionId) : []),
    [activeSessionId, messages],
  );
  const isStreaming = Boolean(streamingMessageId) || isThinking;

  const { containerRef, scrollToBottom } = useAutoScroll([
    sessionMessages.length,
    sessionMessages.at(-1)?.content,
    isThinking,
  ]);

  useEffect(() => {
    void loadDraft();
  }, [loadDraft]);

  useWorkspaceShortcuts({
    isStreaming,
    onSend: () => {
      sendMessage();
    },
    onStop: stopGeneration,
    onFocusComposer: () => {
      document.querySelector<HTMLTextAreaElement>('textarea[aria-label="Message composer"]')?.focus();
    },
    onCopyLastResponse: copyLastResponse,
  });

  const handleCopy = (content: string): void => {
    void copyMessage(content).then(() => {
      toast({ title: "Copied to clipboard", variant: "success" });
    });
  };

  const handleSave = (messageId: string, saved: boolean): void => {
    void saveAssistantMessage(messageId, saved).then(() => {
      toast({
        title: saved ? "Response saved locally" : "Removed from saved",
        variant: saved ? "success" : "default",
      });
    });
  };

  if (panel === "settings") {
    return (
      <div className="flex h-[calc(100vh-4.5rem)] flex-col">
        <WorkspaceHeader
          source={source}
          session={activeSession}
          onToggleNav={() => {
            useUiStore.getState().toggleSidebar();
          }}
        />
        <div className="flex-1 overflow-y-auto p-[var(--panel-px)]">
          <Suspense fallback={<PanelFallback label="settings" />}>
            <SettingsView />
          </Suspense>
        </div>
        <StatusBar />
        <WorkspaceMobileNav
          activePanel={panel}
          onSelect={(next) => {
            useUiStore.getState().setPanel(next);
          }}
        />
      </div>
    );
  }

  if (panel === "practice") {
    return (
      <div className="flex h-[calc(100vh-4.5rem)] flex-col">
        <WorkspaceHeader
          source={source}
          session={activeSession}
          onToggleNav={() => {
            useUiStore.getState().toggleSidebar();
          }}
        />
        <div className="flex-1 overflow-hidden">
          <Suspense fallback={<PanelFallback label="practice tools" />}>
            <PracticeView
              onExport={(tool, format) => {
                toast({ title: `Exporting ${tool} as ${format}`, variant: "default" });
              }}
            />
          </Suspense>
        </div>
        <StatusBar />
        <WorkspaceMobileNav
          activePanel={panel}
          onSelect={(next) => {
            useUiStore.getState().setPanel(next);
          }}
        />
      </div>
    );
  }

  if (panel === "pdf" || panel === "ocr" || panel === "video") {
    const sourceKind = panel === "pdf" ? "pdf" : panel === "video" ? "youtube" : "image";
    return (
      <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden">
        <WorkspaceHeader
          source={source}
          session={activeSession}
          onToggleNav={() => {
            useUiStore.getState().toggleSidebar();
          }}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <SourceDocumentPanel kind={sourceKind} sourceId={source?.id} />
        </div>
        <StatusBar />
        <WorkspaceMobileNav
          activePanel={panel}
          onSelect={(next) => {
            useUiStore.getState().setPanel(next);
          }}
        />
      </div>
    );
  }

  if (panel === "search") {
    return (
      <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden">
        <WorkspaceHeader
          source={source}
          session={activeSession}
          onToggleNav={() => {
            useUiStore.getState().toggleSidebar();
          }}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <Suspense fallback={<PanelFallback label="semantic search" />}>
            <SemanticSearchView source={source} />
          </Suspense>
        </div>
        <StatusBar />
        <WorkspaceMobileNav
          activePanel={panel}
          onSelect={(next) => {
            useUiStore.getState().setPanel(next);
          }}
        />
      </div>
    );
  }

  if (panel === "notebook" || panel === "editor" || panel === "graph") {
    const mode: NotebookPanelMode = panel === "editor" || panel === "graph" ? panel : "notebook";
    return (
      <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden">
        <WorkspaceHeader
          source={source}
          session={activeSession}
          onToggleNav={() => {
            useUiStore.getState().toggleSidebar();
          }}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <Suspense fallback={<PanelFallback label="notebook" />}>
            <NotebookView initialMode={mode} sourceId={source?.id} sourceTitle={source?.title} />
          </Suspense>
        </div>
        <StatusBar />
        <WorkspaceMobileNav
          activePanel={panel}
          onSelect={(next) => {
            useUiStore.getState().setPanel(next);
          }}
        />
      </div>
    );
  }

  if (panel === "exam" || panel === "analytics" || panel === "revision" || panel === "progress" || panel === "history" || panel === "recommendations") {
    const mode: ExamPanelMode = panel;
    return (
      <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden">
        <WorkspaceHeader
          source={source}
          session={activeSession}
          onToggleNav={() => {
            useUiStore.getState().toggleSidebar();
          }}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <Suspense fallback={<PanelFallback label="exam preparation" />}>
            <ExamPrepView initialMode={mode} sourceId={source?.id} sourceTitle={source?.title} />
          </Suspense>
        </div>
        <StatusBar />
        <WorkspaceMobileNav
          activePanel={panel}
          onSelect={(next) => {
            useUiStore.getState().setPanel(next);
          }}
        />
      </div>
    );
  }

  if (panel === "sync" || panel === "collaboration" || panel === "activity" || panel === "versions" || panel === "conflicts") {
    const mode: SyncPanelMode = panel;
    return (
      <div className="flex h-[calc(100vh-4.5rem)] flex-col overflow-hidden">
        <WorkspaceHeader
          source={source}
          session={activeSession}
          onToggleNav={() => {
            useUiStore.getState().toggleSidebar();
          }}
        />
        <div className="min-h-0 flex-1 overflow-hidden">
          <Suspense fallback={<PanelFallback label="sync center" />}>
            <SyncCenterView initialMode={mode} />
          </Suspense>
        </div>
        <StatusBar />
        <WorkspaceMobileNav
          activePanel={panel}
          onSelect={(next) => {
            useUiStore.getState().setPanel(next);
          }}
        />
      </div>
    );
  }

  if (panel !== "study") {
    return (
      <div className="flex h-[calc(100vh-4.5rem)] flex-col">
        <WorkspaceHeader
          source={source}
          session={activeSession}
          onToggleNav={() => {
            useUiStore.getState().toggleSidebar();
          }}
        />
        <div className="flex flex-1 items-center justify-center p-6 text-center text-muted-foreground">
          <p>{panel.charAt(0).toUpperCase() + panel.slice(1)} opens in a later milestone.</p>
        </div>
        <StatusBar />
        <WorkspaceMobileNav
          activePanel={panel}
          onSelect={(next) => {
            useUiStore.getState().setPanel(next);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-4.5rem)] overflow-hidden">
      <WorkspaceNavigation
        activePanel={panel}
        collapsed={sidebarCollapsed}
        onSelect={(next) => {
          useUiStore.getState().setPanel(next);
        }}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <WorkspaceHeader
          source={source}
          session={activeSession}
          onToggleNav={() => {
            useUiStore.getState().toggleSidebar();
          }}
        />

        {mode === "home" ? (
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 overflow-y-auto px-[var(--panel-px)] py-4"
          >
            <section aria-labelledby="workspace-heading" className="space-y-5">
              <div>
                <h2 id="workspace-heading" className="text-title font-bold">
                  What are you studying?
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Capture context, ask questions, and keep momentum in one focused workspace.
                </p>
              </div>

              <ContextCard
                source={source}
                isCapturing={isCapturing}
                onCapture={() => {
                  void captureSource();
                }}
                onRemove={removeSource}
              />

              <QuickActions
                activeAction={activeQuickAction}
                onSelect={(action, prompt) => {
                  useWorkspaceStore.getState().setActiveQuickAction(action);
                  applySuggestion(prompt);
                }}
              />

              <PromptSuggestions
                suggestions={suggestions}
                onSelect={(prompt) => {
                  applySuggestion(prompt);
                }}
              />

              {sessions.length > 0 && (
                <section aria-label="Recent sessions" className="space-y-2">
                  <h3 className="text-label font-medium text-muted-foreground">Recent sessions</h3>
                  <div className="grid gap-2">
                    {sessions.slice(0, 3).map((session) => (
                      <StudySessionCard
                        key={session.id}
                        session={session}
                        isActive={session.id === activeSessionId}
                        onSelect={() => {
                          useSessionsStore.getState().setActiveSession(session.id);
                          useWorkspaceStore.getState().setMode("chat");
                        }}
                      />
                    ))}
                  </div>
                </section>
              )}
            </section>
          </motion.div>
        ) : (
          <ChatContainer
            messages={sessionMessages}
            isThinking={isThinking}
            showJumpToLatest={showJumpToLatest}
            containerRef={containerRef}
            onScrollToBottom={() => {
              scrollToBottom();
            }}
            onCopy={handleCopy}
            onRetry={retryMessage}
            onRegenerate={regenerateMessage}
            onContinue={continueMessage}
            onPin={(messageId, pinned) => {
              useMessagesStore.getState().pinMessage(messageId, pinned);
            }}
            onSave={handleSave}
          />
        )}

        <Composer
          value={composerDraft}
          isStreaming={isStreaming}
          onChange={(value) => {
            useWorkspaceStore.getState().setComposerDraft(value);
          }}
          onSend={() => {
            sendMessage();
          }}
          onStop={stopGeneration}
          onAttach={() => {
            void captureSource();
          }}
          onBlurPersist={() => {
            void chrome.storage.local.set({ draft: composerDraft });
          }}
        />

        <BottomToolbar
          onNewSession={() => {
            useSessionsStore
              .getState()
              .createSession(source?.title ?? "New study session", source?.title, source?.id);
            useWorkspaceStore.getState().setMode("chat");
          }}
        />

        <StatusBar />
        <WorkspaceMobileNav
          activePanel={panel}
          onSelect={(next) => {
            useUiStore.getState().setPanel(next);
          }}
        />
      </div>
    </div>
  );
}
