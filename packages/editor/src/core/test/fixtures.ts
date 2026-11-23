import type { Plugin } from "prosemirror-state";

import type { Command, Extension } from "../types";

declare module "../types" {
  interface Commands {
    testCommand: Command;
  }
}

export const documentExtension: Extension<unknown> = {
  name: "document",
  nodes: {
    doc: { content: "block+" },
    text: { group: "inline" },
  },
};

export const paragraphExtension: Extension<unknown> = {
  name: "paragraph",
  priority: 0,
  nodes: {
    paragraph: { group: "block", content: "inline*", toDOM: () => ["p", 0] },
  },
};

export const withCommand = (
  command: Command,
  extraPlugins: Plugin[] = [],
): Extension<unknown>[] => [
  documentExtension,
  paragraphExtension,
  { name: "command", commands: () => ({ testCommand: command }) },
  { name: "extra", plugins: () => extraPlugins },
];
