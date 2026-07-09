import { ToastProvider, ToastViewport } from "@classmate/ui";
import { Component, type ErrorInfo, type ReactNode } from "react";
import { Workspace } from "../features/workspace";
import { settingsRepository } from "../adapters/chrome/storage";
import { healthSnapshot, writeSafeLog } from "../infrastructure/logging/logger";
import { useProviderStore } from "../stores/provider-store";
import { useEffect } from "react";

interface AppErrorBoundaryState {
  failed: boolean;
  errorId?: string | undefined;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, AppErrorBoundaryState> {
  override state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true, errorId: crypto.randomUUID() };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    writeSafeLog({
      level: "error",
      event: "app.error_boundary",
      component: "AppErrorBoundary",
      errorCode: "APP_RENDER_FAILURE",
      metadata: {
        errorName: error.name,
        componentStack: (info.componentStack ?? "unavailable").slice(0, 300),
        ...healthSnapshot(),
      },
    });
  }

  override render() {
    return this.state.failed ? (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="max-w-sm rounded-3xl border border-white/10 bg-white/[0.04] p-6 text-center shadow-2xl">
          <h1 className="text-xl font-semibold">ClassMate AI needs a refresh</h1>
          <p className="mt-2 text-muted-foreground">
            Your saved work is safe. Try reopening the workspace; if it happens again, include this diagnostic ID.
          </p>
          {this.state.errorId ? (
            <p className="mt-3 rounded-full bg-white/[0.06] px-3 py-2 text-xs text-muted-foreground">
              Diagnostic ID: {this.state.errorId}
            </p>
          ) : null}
          <button
            className="mt-4 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            type="button"
            onClick={() => {
              this.setState({ failed: false, errorId: undefined });
            }}
          >
            Retry workspace
          </button>
        </div>
      </main>
    ) : (
      this.props.children
    );
  }
}

function ProviderBootstrap() {
  useEffect(() => {
    void settingsRepository.get().then((settings) => {
      useProviderStore.getState().setProviderId(settings.defaultProvider);
    });
  }, []);

  return null;
}

export function App() {
  return (
    <ToastProvider>
      <AppErrorBoundary>
        <ProviderBootstrap />
        <Workspace />
        <ToastViewport />
      </AppErrorBoundary>
    </ToastProvider>
  );
}
