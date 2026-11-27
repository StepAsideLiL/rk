"use client";

import type { ComponentProps } from "react";
import { createParts } from "@ui-sdk/react/primitive";
import { dialog } from "../../primitive/dialog";

const parts = createParts(dialog, {
  trigger: "button",
  backdrop: "div",
  content: "div",
  title: "h2",
  close: "button",
  header: "div",
  body: "div",
  footer: "div",
});

const Dialog = parts.Root;
const DialogTrigger = parts.Trigger;
const DialogBackdrop = parts.Backdrop;
const DialogContent = parts.Content;
const DialogClose = parts.Close;
const DialogHeader = parts.Header;
const DialogBody = parts.Body;
const DialogFooter = parts.Footer;

function DialogHeaderTitle({ children, ...props }: ComponentProps<typeof parts.Title>) {
  return <parts.Title {...props}>{children ?? ((state) => state.name)}</parts.Title>;
}

export {
  Dialog,
  DialogBackdrop,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogHeaderTitle,
  DialogTrigger,
};
