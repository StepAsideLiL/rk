import { HColumn, HColumnCell } from "@rk/ui/react";

import { UiPage } from "../components/ui-page";

const cells = [
  { label: "Default", h: "start", v: "stretch" },
  { label: "center / top", h: "center", v: "top" },
  { label: "end / bottom", h: "end", v: "bottom" },
] as const;

export default function HColumnPage() {
  return (
    <UiPage
      title="HColumn"
      description="A horizontal column layout. Each cell aligns its content horizontally with h and vertically with v."
    >
      <section className="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6">
        <HColumn className="ui-h-column">
          {cells.map((cell) => (
            <HColumnCell
              key={cell.label}
              h={cell.h}
              v={cell.v}
              className="ui-h-column-cell h-40 p-4"
            >
              <span className="text-sm font-medium">{cell.label}</span>
              <span className="text-muted-foreground text-xs">Cell content</span>
            </HColumnCell>
          ))}
        </HColumn>
      </section>

      <section className="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6">
        <h2 className="text-sm font-semibold">Evenly spaced cells</h2>
        <HColumn className="ui-h-column">
          {Array.from({ length: 5 }, (_, index) => (
            <HColumnCell
              key={index}
              h="center"
              v="center"
              className="ui-h-column-cell border-border h-24 border p-3"
            >
              <span className="text-sm">{index + 1}</span>
            </HColumnCell>
          ))}
        </HColumn>
      </section>
    </UiPage>
  );
}
