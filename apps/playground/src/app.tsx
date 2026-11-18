import { ThemeToggleButton } from "@rk/ui/react";
import { useTheme } from "./utils/theme";

export default function App() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col items-center justify-center gap-8">
      <h1 className="text-center text-6xl font-bold tracking-tight">
        Hello, Playground
      </h1>
      <ThemeToggleButton
        aria-label="Dark theme"
        pressed={dark}
        onPressedChange={() => toggle()}
        className="border-border hover:bg-accent focus-visible:outline-ring data-pressed:bg-primary data-pressed:text-primary-foreground inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        <span aria-hidden="true">{dark ? "☀️" : "🌙"}</span>
        {dark ? "Light" : "Dark"}
      </ThemeToggleButton>
    </div>
  );
}
