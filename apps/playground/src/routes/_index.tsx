import { Link } from "react-router";

const pages = [
  {
    to: "/editor",
    title: "@rk/editor",
    description:
      "Extensible ProseMirror editor with bold, italic, headings and live Markdown and HTML output.",
  },
  {
    to: "/ui/react",
    title: "React components",
    description: "Index of every component exported by @rk/ui/react.",
  },
  {
    to: "/ui/react/button",
    title: "Button",
    description: "A button with a built-in tooltip that only appears when a tooltip is given.",
  },
  {
    to: "/ui/react/sidebar",
    title: "Sidebar",
    description: "A resizable sidebar that collapses to 0 width from its toggle button.",
  },
  {
    to: "/ui/react/dialog",
    title: "Dialog",
    description: "A dialog with a header, body and footer that keeps its aspect ratio.",
  },
  {
    to: "/ui/react/h-column",
    title: "HColumn",
    description: "A horizontal column layout with horizontal and vertical cell alignment.",
  },
] as const;

export default function HomePage() {
  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-bold tracking-tight">Playground</h1>
        <p className="text-muted-foreground">
          Experiments and demos for packages in the rk monorepo.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2">
        {pages.map((page) => (
          <li key={page.to}>
            <Link
              to={page.to}
              className="border-border bg-card text-card-foreground hover:bg-accent focus-visible:outline-ring flex h-full flex-col gap-2 rounded-lg border p-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="font-semibold">{page.title}</span>
              <span className="text-muted-foreground text-sm leading-relaxed">
                {page.description}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
