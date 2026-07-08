import { Button } from "../primitives/Button";
import { Tooltip } from "../primitives/Tooltip";
import { useTheme, type Theme } from "../theme/ThemeProvider";

const themes: readonly { value: Theme; label: string; icon: string }[] = [
  { value: "dark", label: "Dark", icon: "🌙" },
  { value: "light", label: "Light", icon: "☀️" },
  { value: "system", label: "System", icon: "💻" },
] as const;

export interface ThemeToggleProps {
  className?: string | undefined;
  showLabels?: boolean | undefined;
}

export function ThemeToggle({ className, showLabels = false }: ThemeToggleProps) {
  const themeState = useTheme();
  const { theme } = themeState;

  if (showLabels) {
    return (
      <div className={className} role="group" aria-label="Theme">
        {themes.map((item) => (
          <Button
            key={item.value}
            variant={theme === item.value ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={theme === item.value}
            onClick={() => {
              themeState.setTheme(item.value);
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            {item.label}
          </Button>
        ))}
      </div>
    );
  }

  const currentIndex = themes.findIndex((item) => item.value === theme);
  const next = themes[(currentIndex + 1) % themes.length];
  if (!next) return null;

  return (
    <Tooltip content={`Theme: ${theme}. Click for ${next.label}.`}>
      <Button
        variant="ghost"
        size="icon"
        className={className}
        aria-label={`Current theme: ${theme}. Switch to ${next.label}.`}
        onClick={() => {
          themeState.setTheme(next.value);
        }}
      >
        <span aria-hidden="true">{themes.find((item) => item.value === theme)?.icon ?? "🌙"}</span>
      </Button>
    </Tooltip>
  );
}

export function ThemeSelect({ className }: { className?: string | undefined }) {
  const themeState = useTheme();
  const { theme } = themeState;

  return (
    <select
      className={className}
      value={theme}
      aria-label="Theme"
      onChange={(event) => {
        themeState.setTheme(event.target.value as Theme);
      }}
    >
      {themes.map((item) => (
        <option key={item.value} value={item.value}>
          {item.label}
        </option>
      ))}
    </select>
  );
}
