"use client";

import { usePart, usePrimitive, type PartProps } from "@ui-sdk/react/primitive";
import { button, type ButtonOptions } from "../../primitive/button";

type ButtonProps = ButtonOptions & Omit<PartProps<"button">, "type">;

function Button({
  tooltip,
  tooltipSide,
  type,
  open,
  defaultOpen,
  onOpenChange,
  onOpenChangeComplete,
  ...props
}: ButtonProps) {
  const handle = usePrimitive(button, {
    tooltip,
    tooltipSide,
    type,
    open,
    defaultOpen,
    onOpenChange,
    onOpenChangeComplete,
  });

  const root = usePart(handle, "root", {}, props, "button");
  const content = usePart(handle, "content", { side: tooltipSide }, { children: tooltip }, "div");

  return (
    <>
      {root}
      {content}
    </>
  );
}

export { Button };
export type { ButtonProps };
