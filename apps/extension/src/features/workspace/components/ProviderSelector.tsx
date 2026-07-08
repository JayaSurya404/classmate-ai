import { Select } from "@classmate/ui";
import { ProviderIdSchema, type ProviderId } from "@classmate/contracts";
import { useProviderStore } from "../../../stores/provider-store";
import { PROVIDER_LABELS } from "../constants";

export interface ProviderSelectorProps {
  compact?: boolean | undefined;
}

export function ProviderSelector({ compact }: ProviderSelectorProps) {
  const providerId = useProviderStore((state) => state.providerId);
  const status = useProviderStore((state) => state.status);
  const setProviderId = useProviderStore((state) => state.setProviderId);

  if (compact) {
    return (
      <Select
        aria-label="AI provider"
        value={providerId}
        className="h-8 w-auto min-w-[7rem] border-0 bg-transparent text-xs"
        onChange={(event) => {
          setProviderId(event.target.value as ProviderId);
        }}
      >
        {ProviderIdSchema.options.map((id) => (
          <option key={id} value={id}>
            {PROVIDER_LABELS[id]}
          </option>
        ))}
      </Select>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Select
        aria-label="AI provider"
        value={providerId}
        onChange={(event) => {
          setProviderId(event.target.value as ProviderId);
        }}
      >
        {ProviderIdSchema.options.map((id) => (
          <option key={id} value={id}>
            {PROVIDER_LABELS[id]}
          </option>
        ))}
      </Select>
      <span className="text-caption capitalize text-muted-foreground">{status}</span>
    </div>
  );
}
