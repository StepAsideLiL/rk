import { DOMSerializer, DOMParser as PmDOMParser } from "prosemirror-model";
import { describe, expect, it } from "vitest";

import { createExtensionManager } from "../../core/extension-manager";
import { Document } from "../document/document";
import { Paragraph } from "../paragraph/paragraph";
import { Text } from "../text/text";
import { Italic } from "./italic";

const extensions = () => [Document(), Text(), Paragraph(), Italic()];

const createSchema = () => createExtensionManager(extensions()).schema;

describe("Italic DOM", () => {
  it("serializes emphasis and parses it back", () => {
    const schema = createSchema();
    const emphasis = schema.marks.emphasis;

    if (!emphasis) {
      throw new Error("Missing emphasis mark.");
    }

    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, schema.text("a", [emphasis.create()])),
    ]);
    const serializer = DOMSerializer.fromSchema(schema);
    const container = document.createElement("div");
    container.append(serializer.serializeFragment(doc.content));

    expect(container.innerHTML).toBe("<p><em>a</em></p>");

    const parsed = PmDOMParser.fromSchema(schema).parse(container);
    expect(parsed.eq(doc)).toBe(true);
  });

  it("parses <i> as an emphasis mark", () => {
    const schema = createSchema();
    const container = document.createElement("div");
    container.innerHTML = "<p><i>b</i></p>";

    const parsed = PmDOMParser.fromSchema(schema).parse(container);

    expect(parsed.firstChild?.firstChild?.marks[0]?.type.name).toBe("emphasis");
  });
});
