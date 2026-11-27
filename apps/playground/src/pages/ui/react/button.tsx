import { Button } from "@rk/ui/react";

import { UiPage } from "./ui-page";

export function ButtonPage() {
  return (
    <UiPage
      title="Button"
      description="A button with a built-in tooltip. The tooltip only appears when a tooltip is provided."
    >
      <section className="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6">
        <h2 className="text-sm font-semibold">Tooltip</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button tooltip="Click me" className="ui-button">
            Click me
          </Button>
          <Button tooltip="Saves the document" tooltipSide="bottom" className="ui-button">
            Save with a bottom tooltip
          </Button>
          <Button
            tooltip="Opens the release notes"
            tooltipSide="right"
            className="ui-button ui-button-primary"
          >
            Release notes
          </Button>
        </div>
      </section>

      <section className="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6">
        <h2 className="text-sm font-semibold">Without a tooltip</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button className="ui-button">No tooltip</Button>
          <Button className="ui-button ui-button-primary">Also no tooltip</Button>
        </div>
      </section>
    </UiPage>
  );
}
