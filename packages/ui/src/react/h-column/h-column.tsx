"use client";

import { createParts } from "@ui-sdk/react/primitive";
import { hColumn } from "../../primitive/h-column";

const { Root: HColumn, Cell: HColumnCell } = createParts(hColumn, {
  root: "div",
  cell: "div",
});

export { HColumn, HColumnCell };
