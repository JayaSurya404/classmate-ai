import { useCallback, useState, type KeyboardEvent } from "react";

export interface UseKeyboardNavigationOptions {
  itemCount: number;
  loop?: boolean;
  orientation?: "horizontal" | "vertical";
  onSelect?: (index: number) => void;
}

export interface UseKeyboardNavigationResult {
  activeIndex: number;
  setActiveIndex: (index: number) => void;
  getItemProps: (index: number) => {
    tabIndex: number;
    onKeyDown: (event: KeyboardEvent) => void;
    onFocus: () => void;
  };
}

export function useKeyboardNavigation({
  itemCount,
  loop = true,
  orientation = "horizontal",
  onSelect,
}: UseKeyboardNavigationOptions): UseKeyboardNavigationResult {
  const [activeIndex, setActiveIndex] = useState(0);

  const move = useCallback(
    (delta: number): void => {
      if (itemCount <= 0) return;
      setActiveIndex((current) => {
        let next = current + delta;
        if (loop) {
          next = (next + itemCount) % itemCount;
        } else {
          next = Math.max(0, Math.min(itemCount - 1, next));
        }
        return next;
      });
    },
    [itemCount, loop],
  );

  const getItemProps = useCallback(
    (index: number) => ({
      tabIndex: index === activeIndex ? 0 : -1,
      onFocus: (): void => {
        setActiveIndex(index);
      },
      onKeyDown: (event: KeyboardEvent): void => {
        const prevKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
        const nextKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";

        switch (event.key) {
          case prevKey:
            event.preventDefault();
            move(-1);
            break;
          case nextKey:
            event.preventDefault();
            move(1);
            break;
          case "Home":
            event.preventDefault();
            setActiveIndex(0);
            break;
          case "End":
            event.preventDefault();
            setActiveIndex(Math.max(0, itemCount - 1));
            break;
          case "Enter":
          case " ":
            event.preventDefault();
            onSelect?.(index);
            break;
          default:
            break;
        }
      },
    }),
    [activeIndex, itemCount, move, onSelect, orientation],
  );

  return { activeIndex, setActiveIndex, getItemProps };
}
