import { defineExtension } from "../../core/types";

/** Inline text node required by every textblock schema. */
export const Text = defineExtension(() => ({
  name: "text",
  priority: 10,
  requires: ["document"],
  nodes: {
    text: { group: "inline" },
  },
}));
