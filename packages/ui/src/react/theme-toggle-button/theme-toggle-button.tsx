"use client";

import { createParts } from "@ui-sdk/react/primitive";
import { themeToggleButton } from "../../primitive/theme-toggle-button";

const { Root: ThemeToggleButton } = createParts(themeToggleButton, {
  root: "button",
});

export { ThemeToggleButton };
