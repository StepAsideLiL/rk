import { starterKit } from "../extensions/index";

/** Shared extensions for React tests. */
export const extensions = starterKit();

/** Minimal JSON document containing a single paragraph. */
export function jsonDoc(text: string) {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text ? [{ type: "text", text }] : [],
      },
    ],
  };
}
