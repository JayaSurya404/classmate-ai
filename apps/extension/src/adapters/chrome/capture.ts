import { SourceSnapshotSchema, type SourceSnapshot } from "@classmate/contracts";
import { writeSafeLog } from "../../infrastructure/logging/logger";

export type CaptureResult =
  | { ok: true; source: SourceSnapshot }
  | {
      ok: false;
      code: "RESTRICTED" | "PERMISSION" | "EMPTY" | "FAILED";
      message: string;
      diagnostics?: CaptureDiagnostics | undefined;
    };

type CaptureFailureCode = "RESTRICTED" | "PERMISSION" | "EMPTY" | "FAILED";

interface CaptureDiagnostics {
  stage: "query_tab" | "permission" | "send_message_initial" | "execute_script" | "send_message_after_injection" | "response" | "validation";
  chromeError?: string | undefined;
  message?: string | undefined;
  stack?: string | undefined;
  responseCode?: string | undefined;
}

interface CaptureSuccessResponse {
  ok: true;
  source: unknown;
}

interface CaptureFailureResponse {
  ok: false;
  code?: string | undefined;
  message?: string | undefined;
  stack?: string | undefined;
  stage?: string | undefined;
}

type CaptureResponse = CaptureSuccessResponse | CaptureFailureResponse;

export async function captureActiveTab(): Promise<CaptureResult> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id || !tab.url || /^(chrome|edge|about|chrome-extension):/.test(tab.url)) {
    return failure("RESTRICTED", "Chrome does not allow page access here. Paste text instead.", {
      stage: "query_tab",
      message: tab?.url ? `Restricted URL: ${tab.url}` : "No active readable tab was found.",
    });
  }

  try {
    const permission = { origins: [`${new URL(tab.url).origin}/*`] };
    const hasPermission = await chrome.permissions.contains(permission);
    if (!hasPermission && !(await chrome.permissions.request(permission))) {
      return failure("PERMISSION", "Page access was not granted. Your existing draft is safe.", {
        stage: "permission",
        message: `Permission denied for ${permission.origins[0] ?? "active origin"}.`,
      });
    }

    const message = {
      version: 1 as const,
      type: "CAPTURE_CONTEXT" as const,
      requestId: crypto.randomUUID(),
      scope: "selection" as const,
    };

    let raw: unknown;
    try {
      raw = await sendCaptureMessage(tab.id, message, "send_message_initial");
    } catch (initialError) {
      logCaptureError("send_message_initial", initialError);
      try {
        await injectContentScriptModule(tab.id);
      } catch (injectionError) {
        const diagnostics = diagnosticsFromError("execute_script", injectionError);
        logCaptureError("execute_script", injectionError);
        return failure("FAILED", "The page could not be prepared for reading. Your draft is safe.", diagnostics);
      }
      try {
        raw = await sendCaptureMessage(tab.id, message, "send_message_after_injection");
      } catch (sendAfterInjectionError) {
        const diagnostics = diagnosticsFromError("send_message_after_injection", sendAfterInjectionError);
        logCaptureError("send_message_after_injection", sendAfterInjectionError);
        return failure("FAILED", "The page could not be read after loading the content script. Your draft is safe.", diagnostics);
      }
    }

    const response = parseCaptureResponse(raw);
    if (!response) {
      const diagnostics: CaptureDiagnostics = { stage: "response", message: "Content script returned an invalid response envelope." };
      logCaptureDiagnostics("capture.invalid_response", diagnostics);
      return failure("EMPTY", "No readable text was found. Try selecting text or paste it here.", diagnostics);
    }

    if (!response.ok) {
      const diagnostics: CaptureDiagnostics = {
        stage: normalizeResponseStage(response.stage),
        responseCode: response.code,
        message: response.message,
        stack: response.stack,
      };
      logCaptureDiagnostics("capture.content_script_failure", diagnostics);
      return failure("FAILED", response.message ?? "The content script could not read this page.", diagnostics);
    }

    const parsed = SourceSnapshotSchema.safeParse(response.source);
    if (!parsed.success) {
      const diagnostics: CaptureDiagnostics = {
        stage: "validation",
        message: parsed.error.issues.map((issue) => issue.message).join("; "),
      };
      logCaptureDiagnostics("capture.snapshot_validation_failed", diagnostics);
      return failure("FAILED", "The captured page did not pass safety validation.", diagnostics);
    }

    writeSafeLog({
      level: "info",
      event: "capture.success",
      component: "captureActiveTab",
      operationId: message.requestId,
      metadata: {
        blockCount: parsed.data.blocks.length,
        sourceType: parsed.data.sourceType,
        scope: parsed.data.scope,
      },
    });
    return { ok: true, source: parsed.data };
  } catch (error) {
    const diagnostics = diagnosticsFromError("response", error);
    logCaptureError("response", error);
    return failure("FAILED", "The page could not be read. Your draft is safe; retry or paste text.", diagnostics);
  }
}

async function sendCaptureMessage(
  tabId: number,
  message: { version: 1; type: "CAPTURE_CONTEXT"; requestId: string; scope: "selection" | "page" },
  stage: CaptureDiagnostics["stage"],
): Promise<unknown> {
  try {
    return await chrome.tabs.sendMessage(tabId, message);
  } catch (error) {
    throw enrichChromeError(stage, error);
  }
}

async function injectContentScriptModule(tabId: number): Promise<void> {
  const moduleUrl = chrome.runtime.getURL("assets/content-script.js");
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: async (url: string) => {
        await import(url);
      },
      args: [moduleUrl],
    });
  } catch (error) {
    throw enrichChromeError("execute_script", error);
  }
}

function parseCaptureResponse(raw: unknown): CaptureResponse | undefined {
  if (typeof raw !== "object" || raw === null || !("ok" in raw)) return undefined;
  const candidate = raw as { ok: unknown };
  if (candidate.ok === true && "source" in raw) return raw as CaptureSuccessResponse;
  if (candidate.ok === false) return raw as CaptureFailureResponse;
  return undefined;
}

function normalizeResponseStage(stage: string | undefined): CaptureDiagnostics["stage"] {
  return stage === "validation" ? "validation" : "response";
}

function enrichChromeError(stage: CaptureDiagnostics["stage"], error: unknown): Error {
  const chromeMessage = chrome.runtime.lastError?.message;
  const message = [errorMessage(error), chromeMessage].filter(Boolean).join(" | ");
  const enriched = error instanceof Error ? error : new Error(message || "Chrome runtime operation failed.");
  if (chromeMessage && !enriched.message.includes(chromeMessage)) {
    enriched.message = `${enriched.message} | ${chromeMessage}`;
  }
  enriched.name = `${stage}:${enriched.name}`;
  return enriched;
}

function diagnosticsFromError(stage: CaptureDiagnostics["stage"], error: unknown): CaptureDiagnostics {
  return {
    stage,
    chromeError: chrome.runtime.lastError?.message,
    message: errorMessage(error),
    stack: error instanceof Error ? error.stack : undefined,
  };
}

function logCaptureError(stage: CaptureDiagnostics["stage"], error: unknown): void {
  logCaptureDiagnostics("capture.runtime_error", diagnosticsFromError(stage, error));
}

function logCaptureDiagnostics(event: string, diagnostics: CaptureDiagnostics): void {
  writeSafeLog({
    level: "error",
    event,
    component: "captureActiveTab",
    errorCode: diagnostics.responseCode ?? diagnostics.stage,
    metadata: {
      stage: diagnostics.stage,
      ...(diagnostics.chromeError ? { chromeError: diagnostics.chromeError } : {}),
      ...(diagnostics.message ? { message: diagnostics.message } : {}),
      ...(diagnostics.stack ? { stack: diagnostics.stack } : {}),
    },
  });
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : typeof error === "string" ? error : "Unknown capture runtime error.";
}

function failure(code: CaptureFailureCode, message: string, diagnostics?: CaptureDiagnostics): CaptureResult {
  return diagnostics ? { ok: false, code, message, diagnostics } : { ok: false, code, message };
}
