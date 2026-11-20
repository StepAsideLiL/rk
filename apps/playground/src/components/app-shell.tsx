import { ThemeToggleButton } from "@rk/ui/react";
import { Link, Outlet } from "react-router";

import { useTheme } from "../utils/theme";

export function AppShell() {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";

  return (
    <div className="bg-background text-foreground flex min-h-screen flex-col">
      <header className="border-border flex items-center justify-between gap-4 border-b px-6 py-4">
        <Link to="/" className="text-sm font-semibold tracking-tight">
          rk playground
        </Link>
        <ThemeToggleButton
          aria-label="Dark theme"
          pressed={dark}
          onPressedChange={() => toggle()}
          className="border-border hover:bg-accent focus-visible:outline-ring data-pressed:bg-primary data-pressed:text-primary-foreground inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          <span aria-hidden="true">{dark ? "☀️" : "🌙"}</span>
          {dark ? "Light" : "Dark"}
        </ThemeToggleButton>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-10">
        <Outlet />
      </main>
    </div>
  );
}
