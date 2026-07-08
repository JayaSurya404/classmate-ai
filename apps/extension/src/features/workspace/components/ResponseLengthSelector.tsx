import { Select } from "@classmate/ui";
import { useWorkspaceStore } from "../../../stores/workspace-store";
import { RESPONSE_LENGTHS } from "../constants";
import type { ResponseLength } from "../types";

export function ResponseLengthSelector() {
  const responseLength = useWorkspaceStore((state) => state.responseLength);
  const setResponseLength = useWorkspaceStore((state) => state.setResponseLength);

  return (
    <Select
      aria-label="Response length"
      value={responseLength}
      className="h-8 w-auto min-w-[6.5rem] border-0 bg-transparent text-xs"
      onChange={(event) => {
        setResponseLength(event.target.value as ResponseLength);
      }}
    >
      {RESPONSE_LENGTHS.map((item) => (
        <option key={item.id} value={item.id}>
          {item.label}
        </option>
      ))}
    </Select>
  );
}
