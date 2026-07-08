import type { ProviderId } from "@classmate/contracts";
import { create } from "zustand";
import type { ProviderStatus } from "../features/workspace/types";

interface ProviderStoreState {
  providerId: ProviderId;
  status: ProviderStatus;
  setProviderId(providerId: ProviderId): void;
  setStatus(status: ProviderStatus): void;
}

export const useProviderStore = create<ProviderStoreState>((set) => ({
  providerId: "gemini",
  status: "ready",
  setProviderId: (providerId) => {
    set({ providerId });
  },
  setStatus: (status) => {
    set({ status });
  },
}));
