// import {
//   Dialog,
//   DialogBackdrop,
//   DialogBody,
//   DialogClose,
//   DialogContent,
//   DialogFooter,
//   DialogHeader,
//   DialogHeaderTitle,
//   DialogTrigger,
// } from "@rk/ui/react";

import { UiPage } from "./ui-page";

// function XIcon() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="size-4">
//       <path
//         d="m6 6 12 12M18 6 6 18"
//         stroke="currentColor"
//         strokeWidth="1.75"
//         strokeLinecap="round"
//       />
//     </svg>
//   );
// }

export function TempPage() {
  return (
    <UiPage
      title="Dialog"
      description="A dialog that keeps the aspect ratio of its content. Its header title prints the dialog name, and closeOnOutsidePress can be turned off."
    >
      <section className="border-border bg-card text-card-foreground flex flex-col gap-4 rounded-xl border p-6">
        {/* <Dialog name="Setting" closeOnOutsidePress={false}>
          <DialogTrigger className="border">Open settings dialog</DialogTrigger>

          <DialogBackdrop className="" />

          <DialogContent className="bg-background border p-10 w-96 h-96 fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <DialogHeader className="">
              <DialogHeaderTitle className="" />
              <DialogClose aria-label="Close" className="">
                <XIcon />
              </DialogClose>
            </DialogHeader>

            <DialogBody className="">hello</DialogBody>

            <DialogFooter className="">footer</DialogFooter>
          </DialogContent>
        </Dialog> */}
      </section>
    </UiPage>
  );
}
