import { StarterKit } from "../../extensions/index";

export const extensions = [StarterKit()];

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
