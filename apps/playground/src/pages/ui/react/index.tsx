import { Link } from "react-router";

import { UiPage } from "./ui-page";

type ComponentGroup = {
  name: string;
  description: string;
  to?: string;
  parts: readonly string[];
};

const groups: ComponentGroup[] = [
  {
    name: "Button",
    description: "A button with an optional built-in tooltip.",
    to: "/ui/react/button",
    parts: [],
  },
  {
    name: "Dialog",
    description: "A modal dialog with a header, body, footer and a content aspect ratio.",
    to: "/ui/react/dialog",
    parts: [
      "DialogTrigger",
      "DialogBackdrop",
      "DialogContent",
      "DialogHeader",
      "DialogHeaderTitle",
      "DialogBody",
      "DialogFooter",
      "DialogClose",
    ],
  },
  {
    name: "HColumn",
    description: "A horizontal column layout with horizontal and vertical cell alignment.",
    to: "/ui/react/h-column",
    parts: ["HColumnCell"],
  },
  {
    name: "Sidebar",
    description: "A resizable sidebar that collapses to 0 width from its toggle button.",
    to: "/ui/react/sidebar",
    parts: ["SidebarToggleButton", "SidebarContainer"],
  },
  {
    name: "ThemeToggleButton",
    description: "A pressed-state toggle used by the playground app header.",
    parts: [],
  },
];

const count = groups.reduce((total, group) => total + 1 + group.parts.length, 0);

const cardClass =
  "border-border bg-card text-card-foreground hover:bg-accent focus-visible:outline-ring flex h-full flex-col gap-3 rounded-lg border p-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2";

export function ReactComponentsPage() {
  return (
    <UiPage
      title="React components"
      description={`Every component exported by @rk/ui/react (${count} components).`}
    >
      <ul className="grid gap-4 sm:grid-cols-2">
        {groups.map((group) => {
          const content = (
            <>
              <div className="flex items-start justify-between gap-3">
                <span className="font-semibold">{group.name}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {group.to ? "Open demo →" : "App shell"}
                </span>
              </div>
              <span className="text-muted-foreground text-sm leading-relaxed">
                {group.description}
              </span>
              {group.parts.length > 0 ? (
                <div className="mt-auto flex flex-wrap gap-1.5 pt-1">
                  {group.parts.map((part) => (
                    <code
                      key={part}
                      className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 text-xs"
                    >
                      {part}
                    </code>
                  ))}
                </div>
              ) : null}
            </>
          );

          return (
            <li key={group.name}>
              {group.to ? (
                <Link to={group.to} className={cardClass}>
                  {content}
                </Link>
              ) : (
                <div className={cardClass}>{content}</div>
              )}
            </li>
          );
        })}
      </ul>
    </UiPage>
  );
}
