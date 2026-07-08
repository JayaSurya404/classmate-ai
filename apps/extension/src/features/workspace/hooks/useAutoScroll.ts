import { useCallback, useEffect, useRef } from "react";
import { useWorkspaceStore } from "../../../stores/workspace-store";

const BOTTOM_THRESHOLD_PX = 48;

export function useAutoScroll(deps: readonly unknown[]): {
  containerRef: React.RefObject<HTMLDivElement | null>;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
} {
  const containerRef = useRef<HTMLDivElement>(null);
  const setScrollPinnedToBottom = useWorkspaceStore((state) => state.setScrollPinnedToBottom);
  const setShowJumpToLatest = useWorkspaceStore((state) => state.setShowJumpToLatest);
  const scrollPinnedToBottom = useWorkspaceStore((state) => state.scrollPinnedToBottom);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    const container = containerRef.current;
    if (!container) return;
    container.scrollTo({ top: container.scrollHeight, behavior });
    setScrollPinnedToBottom(true);
    setShowJumpToLatest(false);
  }, [setScrollPinnedToBottom, setShowJumpToLatest]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onScroll = (): void => {
      const distanceFromBottom = container.scrollHeight - container.scrollTop - container.clientHeight;
      const atBottom = distanceFromBottom <= BOTTOM_THRESHOLD_PX;
      setScrollPinnedToBottom(atBottom);
      setShowJumpToLatest(!atBottom);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      container.removeEventListener("scroll", onScroll);
    };
  }, [setScrollPinnedToBottom, setShowJumpToLatest]);

  useEffect(() => {
    if (scrollPinnedToBottom) {
      scrollToBottom("auto");
    }
  }, [...deps, scrollPinnedToBottom, scrollToBottom]);

  return { containerRef, scrollToBottom };
}
