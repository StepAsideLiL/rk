import {
  Dialog,
  DialogBackdrop,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogHeaderTitle,
  DialogTrigger,
} from "@rk/ui/react";

import { UiPage } from "../components/ui-page";

function XIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
      <path
        d="m6 6 12 12M18 6 6 18"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function DialogPage() {
  return (
    <UiPage
      title="Dialog"
      description="A dialog that keeps the aspect ratio of its content. Its header title prints the dialog name, and closeOnOutsidePress can be turned off."
    >
      <section className="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Dialog name="Setting" closeOnOutsidePress={false}>
            <DialogTrigger className="ui-button">Open settings dialog</DialogTrigger>

            <DialogBackdrop className="ui-dialog-backdrop fixed inset-0" />

            <DialogContent
              ratio={16 / 9}
              className="ui-dialog-content fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
            >
              <DialogHeader className="ui-dialog-header">
                <DialogHeaderTitle className="ui-dialog-title" />
                <DialogClose aria-label="Close" className="ui-dialog-close">
                  <XIcon />
                </DialogClose>
              </DialogHeader>

              <DialogBody className="ui-dialog-body">
                <div className="flex flex-col gap-4">
                  <label className="flex flex-col gap-1.5 text-sm">
                    Workspace name
                    <input
                      type="text"
                      defaultValue="Acme design"
                      className="border-input bg-background focus-visible:outline-ring h-9 rounded-md border px-3 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                    />
                  </label>
                  <label className="flex flex-col gap-1.5 text-sm">
                    Description
                    <textarea
                      rows={4}
                      defaultValue="Design system and product work."
                      className="border-input bg-background focus-visible:outline-ring resize-none rounded-md border px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                    />
                  </label>
                  <p className="text-muted-foreground text-sm">
                    Pressing outside will not close this dialog. Use the close button, Cancel, Save,
                    or Escape.
                  </p>
                </div>
              </DialogBody>

              <DialogFooter className="ui-dialog-footer">
                <DialogClose className="ui-button">Cancel</DialogClose>
                <DialogClose className="ui-button ui-button-primary">Save changes</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog name="About this demo">
            <DialogTrigger className="ui-button">Open dismissible dialog</DialogTrigger>
            <DialogBackdrop className="ui-dialog-backdrop" />
            <DialogContent className="ui-dialog-content" ratio={4 / 3}>
              <DialogHeader className="ui-dialog-header">
                <DialogHeaderTitle className="ui-dialog-title" />
                <DialogClose aria-label="Close" className="ui-dialog-close">
                  <XIcon />
                </DialogClose>
              </DialogHeader>
              <DialogBody className="ui-dialog-body">
                <p className="text-sm">
                  This one closes on an outside press. The title above comes from the dialog name.
                </p>
              </DialogBody>
              <DialogFooter className="ui-dialog-footer">
                <DialogClose className="ui-button ui-button-primary">Close</DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </UiPage>
  );
}
