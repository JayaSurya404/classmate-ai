import { ToastProvider, ToastViewport } from "@classmate/ui";
import { Component, type ReactNode } from "react";
import { Workspace } from "../features/workspace";
import { settingsRepository } from "../adapters/chrome/storage";
import { useProviderStore } from "../stores/provider-store";
import { useEffect } from "react";

export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  override state = { failed: false };

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  override render() {
    return this.state.failed ? (
      <main className="grid min-h-screen place-items-center p-6">
        <div>
          <h1 className="text-xl font-semibold">ClassMate AI needs a refresh</h1>
          <p className="mt-2 text-muted-foreground">
            Your saved work is safe. Close and reopen the Side Panel.
          </p>
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
