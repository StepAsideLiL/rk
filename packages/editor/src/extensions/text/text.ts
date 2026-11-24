import { defineExtension } from "../../core/types";
import { EXTENSION_NAMES, NODE_NAMES } from "../shared/schema";

export const Text = defineExtension(() => ({
  name: EXTENSION_NAMES.text,
  priority: 10,
  requires: [EXTENSION_NAMES.document],
  nodes: {
    [NODE_NAMES.text]: { group: "inline" },
  },
}));
