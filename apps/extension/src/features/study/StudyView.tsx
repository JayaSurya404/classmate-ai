import { ProviderRouter } from "@classmate/ai-core";
import { ArtifactSchema, type Artifact, type GenerationRequest, type StudyAction } from "@classmate/contracts";
import { LoaderCircle, Paperclip, Send, Square, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button, Card, MarkdownRenderer } from "@classmate/ui";
import { captureActiveTab } from "../../adapters/chrome/capture";
import { createProvider } from "../../adapters/ai/providers";
import { credentialVault } from "../../adapters/chrome/storage";
import { localRepositories } from "../../adapters/local-db/database";
import { useProviderStore } from "../../stores/provider-store";
import { useWorkspaceStore } from "../../stores/workspace-store";

const actions: readonly { id: StudyAction; label: string; description: string }[] = [
  { id: "summary", label: "Summarize", description: "Condense the important ideas" },
  { id: "explain_simple", label: "Explain simply", description: "Plain language and an analogy" },
  { id: "flashcards", label: "Flashcards", description: "Make active-recall cards" },
  { id: "quiz", label: "Quiz", description: "Test understanding" },
  { id: "exam_answer", label: "Exam answer", description: "2, 5, 10, or 16 marks" },
  { id: "chat", label: "Ask", description: "Grounded answer from this page" },
];

/** @deprecated Use the Workspace feature instead. Retained for reference during migration. */
export function LegacyStudyView() {
  const source = useWorkspaceStore((state) => state.source);
  const setSource = useWorkspaceStore((state) => state.setSource);
  const providerId = useProviderStore((state) => state.providerId);
  const [draft, setDraft] = useState("");
  const [action, setAction] = useState<StudyAction>("summary");
  const [output, setOutput] = useState("");
  const [status, setStatus] = useState<"idle" | "capturing" | "streaming" | "failed" | "complete">("idle");
  const [message, setMessage] = useState<string>();
  const abortRef = useRef<AbortController>(null);

  useEffect(() => {
    void chrome.storage.local.get("draft").then((value) => {
      if (typeof value.draft === "string" && !draft) setDraft(value.draft);
    });
  }, [draft]);

  const capture = async (): Promise<void> => {
    setStatus("capturing");
    setMessage(undefined);
    const result = await captureActiveTab();
    if (result.ok) {
      setSource(result.source);
      await localRepositories.sources.save(result.source);
      setStatus("idle");
    } else {
      setStatus("failed");
      setMessage(result.message);
    }
  };

  const generate = async (): Promise<void> => {
    if (!source) {
      await capture();
      return;
    }
    setStatus("streaming");
    setMessage(undefined);
    setOutput("");
    const controller = new AbortController();
    abortRef.current = controller;
    const storedCredential = await credentialVault.get(providerId);
    const credential = {
      ...(storedCredential?.apiKey ? { apiKey: storedCredential.apiKey } : {}),
      ...(storedCredential?.baseUrl ? { baseUrl: storedCredential.baseUrl } : {}),
    };
    const request: GenerationRequest = {
      schemaVersion: 1,
      operationId: crypto.randomUUID(),
      action,
      prompt: draft || defaultPrompt(action),
      source,
      providerId,
      settings: {
        depth: "standard",
        locale: navigator.language,
        allowPaid: false,
        ...(action === "exam_answer" ? { marks: 10 as const } : {}),
      },
    };
    await localRepositories.operations.saveIntent(request);
    await chrome.storage.local.set({ draft });
    const routes = new ProviderRouter([createProvider(providerId, credential)]).routes(request);
    const provider = routes[0];
    if (!provider) {
      setStatus("failed");
      setMessage("No eligible free route is configured. Choose a provider in Settings.");
      return;
    }
    const configuration = await provider.validateConfiguration();
    if (!configuration.ok) {
      setStatus("failed");
      setMessage(`${configuration.message} Open Settings to finish provider setup.`);
      return;
    }
    let text = "";
    try {
      for await (const event of provider.stream(request, controller.signal)) {
        if (event.type === "delta") {
          text += event.text;
          setOutput(text);
        }
        if (event.type === "error") throw new Error(event.message);
      }
      const artifact: Artifact = ArtifactSchema.parse({
        schemaVersion: 1,
        id: crypto.randomUUID(),
        type: action,
        title: `${labelFor(action)} · ${source.title}`,
        markdown: text,
        citations: [],
        sourceIds: [source.id],
        createdAt: new Date().toISOString(),
        provenance: {
          provider: provider.id,
          model: provider.models()[0]?.id ?? "unknown",
          templateId: action,
          templateVersion: "1.0.0",
          isAiGenerated: true,
        },
      });
      await localRepositories.artifacts.save(artifact);
      await localRepositories.operations.update(request.operationId, {
        status: "completed",
        completedAt: new Date().toISOString(),
        artifactId: artifact.id,
      });
      setStatus("complete");
    } catch (error) {
      const cancelled = controller.signal.aborted;
      await localRepositories.operations.update(
        request.operationId,
        cancelled
          ? { status: "cancelled", completedAt: new Date().toISOString() }
          : { status: "incomplete", updatedAt: new Date().toISOString(), partialText: text },
      );
      setStatus(cancelled ? "idle" : "failed");
      setMessage(
        cancelled
          ? "Generation stopped. Your partial response is preserved."
          : error instanceof Error
            ? error.message
            : "Generation failed. Your draft is safe.",
      );
    }
  };

  return (
    <section aria-labelledby="study-heading" className="space-y-4">
      <div>
        <h2 id="study-heading" className="text-xl font-bold">
          Legacy study view
        </h2>
      </div>
      {source ? (
        <Card className="flex items-center gap-3 p-3">
          <Paperclip className="size-4 text-primary" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{source.title}</p>
          </div>
          <Button size="icon" variant="ghost" aria-label="Remove source" onClick={() => setSource(undefined)}>
            <X className="size-4" />
          </Button>
        </Card>
      ) : null}
      <Card className="overflow-hidden">
        <textarea
          aria-label="Study request"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-24 w-full resize-y bg-transparent p-3 text-sm outline-none"
        />
        <div className="flex items-center justify-between border-t p-2">
          {status === "streaming" ? (
            <Button variant="secondary" onClick={() => abortRef.current?.abort()}>
              <Square className="size-4" /> Stop
            </Button>
          ) : (
            <Button onClick={() => void generate()}>
              <Send className="size-4" /> Generate
            </Button>
          )}
        </div>
      </Card>
      {message && <div role="alert" className="rounded-xl border p-3 text-sm">{message}</div>}
      {output && (
        <Card className="p-4">
          <MarkdownRenderer markdown={output} />
          {status === "streaming" && <LoaderCircle className="mt-3 size-4 animate-spin" />}
        </Card>
      )}
    </section>
  );
}

function labelFor(action: StudyAction): string {
  return actions.find((item) => item.id === action)?.label ?? "Answer";
}

function defaultPrompt(action: StudyAction): string {
  return action === "summary"
    ? "Summarize the attached source faithfully."
    : `Create a ${labelFor(action).toLocaleLowerCase()} from the attached source.`;
}
