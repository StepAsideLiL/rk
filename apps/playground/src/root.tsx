import type { ReactNode } from "react";
import { Links, Meta, Scripts, ScrollRestoration } from "react-router";

import { AppShell } from "./components/app-shell";
import "./global.css";

const themeScript = `document.documentElement.classList.toggle("dark", window.matchMedia("(prefers-color-scheme: dark)").matches);`;

export function meta() {
  return [{ title: "rk playground" }];
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return <AppShell />;
}

export function HydrateFallback() {
  return <p className="text-muted-foreground p-6 text-sm">Loading…</p>;
}
