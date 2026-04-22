import { useTheme } from "../context/useTheme";

const LABELS: Record<"system" | "light" | "dark", string> = {
  system: "Match system theme",
  light: "Light theme",
  dark: "Dark theme",
};

/**
 * Cycles system → light → dark. Persists preference (see ThemeProvider).
 */
export default function ThemeToggle() {
  const { preference, cyclePreference } = useTheme();

  const icon = preference === "system" ? "◐" : preference === "light" ? "☀" : "☾";
  const short =
    preference === "system" ? "Auto" : preference === "light" ? "Light" : "Dark";

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={cyclePreference}
      aria-label={LABELS[preference]}
      title={`Theme: ${short} (click to change)`}
    >
      <span className="theme-toggle__icon" aria-hidden>
        {icon}
      </span>
      <span className="theme-toggle__text">{short}</span>
    </button>
  );
}
