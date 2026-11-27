import { Sidebar, SidebarContainer, SidebarToggleButton } from "@rk/ui/react";

import { UiPage } from "../components/ui-page";

const items = ["Overview", "Projects", "Components", "Settings"];

function SidebarIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-5">
      <path
        d="M4 6h16M4 12h10M4 18h16"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function SidebarPage() {
  return (
    <UiPage
      title="Sidebar"
      description="A resizable, collapsible sidebar. Drag the handle to resize it, or press the toggle button to collapse it to 0 width."
    >
      <section className="border-border bg-card text-card-foreground flex h-105 overflow-hidden rounded-xl border">
        <Sidebar
          defaultWidth={260}
          minWidth={180}
          maxWidth={420}
          className="ui-sidebar flex h-full shrink-0"
        >
          <SidebarToggleButton className="ui-sidebar-toggle">
            <SidebarIcon />
          </SidebarToggleButton>

          <SidebarContainer className="ui-sidebar-container">
            <nav className="flex flex-col gap-1 p-3">
              <p className="text-muted-foreground px-2 pb-2 text-xs font-semibold tracking-wide uppercase">
                Workspace
              </p>
              {items.map((item) => (
                <a
                  key={item}
                  href="#"
                  className="hover:bg-accent focus-visible:outline-ring rounded-md px-2 py-1.5 text-sm focus-visible:outline-2"
                >
                  {item}
                </a>
              ))}
            </nav>
          </SidebarContainer>
        </Sidebar>

        <div className="text-muted-foreground flex flex-1 flex-col gap-2 border-l border-dashed p-6 text-sm">
          <p className="text-foreground font-medium">Sidebar content area</p>
          <p>Drag the divider on the right edge of the sidebar to resize it.</p>
          <p>Press the toggle button to collapse the sidebar back to 0 width.</p>
        </div>
      </section>
    </UiPage>
  );
}
