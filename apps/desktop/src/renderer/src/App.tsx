import type { JSX } from "react";
import { StatusCard } from "./components/status-card";
import { useAppVersion } from "./hooks/use-app-version";

export const App = (): JSX.Element => {
  const { version, error, isLoading } = useAppVersion();

  return (
    <main className="flex min-h-screen items-center justify-center bg-surface-950 p-8 font-sans text-surface-100">
      <section className="w-full max-w-2xl rounded-3xl border border-surface-800 bg-surface-900/80 p-8 shadow-2xl shadow-brand-500/10">
        <p className="text-xs font-semibold tracking-[0.24em] text-brand-400 uppercase">
          rk Desktop
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Electron, wired end to end
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-surface-400">
          Vite builds the main, preload, and renderer bundles. React talks to main through a typed
          preload bridge, and Tailwind v4 tokens style this window.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <StatusCard
            hint="via app:get-version"
            label="App version"
            tone={error ? "error" : "default"}
            value={version ? `v${version}` : isLoading ? "Loading..." : "Unavailable"}
          />
          <StatusCard hint="typed contextBridge API" label="IPC channel" value="app:get-version" />
        </div>

        {error ? <p className="mt-4 text-sm text-red-400">{error}</p> : null}

        <a
          className="mt-8 inline-flex text-sm font-medium text-brand-300 underline-offset-4 hover:text-brand-400 hover:underline"
          href="https://www.electronjs.org/docs/latest/tutorial/security"
          rel="noreferrer"
          target="_blank"
        >
          Read Electron security guidance
        </a>
      </section>
    </main>
  );
};
