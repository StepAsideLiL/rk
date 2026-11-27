"use client";

import type { ComponentProps, ReactNode } from "react";
import { createParts } from "@ui-sdk/react/primitive";
import { sidebar } from "../../primitive/sidebar";

const parts = createParts(sidebar, {
  root: "div",
  toggle: "button",
  container: "div",
  handle: "div",
});

function Sidebar({
  children,
  resizeLabel = "Resize sidebar",
  ...props
}: Omit<ComponentProps<typeof parts.Root>, "children"> & {
  children?: ReactNode;
  resizeLabel?: string;
}) {
  return (
    <parts.Root {...props}>
      {children}
      <parts.Handle aria-label={resizeLabel} />
    </parts.Root>
  );
}

const SidebarContainer = parts.Container;

function SidebarToggleButton({
  "aria-label": label = "Toggle sidebar",
  ...props
}: ComponentProps<typeof parts.Toggle>) {
  return <parts.Toggle aria-label={label} {...props} />;
}

export { Sidebar, SidebarContainer, SidebarToggleButton };
