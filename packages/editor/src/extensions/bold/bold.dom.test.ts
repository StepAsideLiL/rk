import { DOMSerializer, DOMParser as PmDOMParser } from "prosemirror-model";
import { describe, expect, it } from "vitest";

import { createExtensionManager } from "../../core/extension-manager";
import { Document } from "../document/document";
import { Paragraph } from "../paragraph/paragraph";
import { Text } from "../text/text";
import { Bold } from "./bold";

const extensions = () => [Document(), Text(), Paragraph(), Bold()];

const createSchema = () => createExtensionManager(extensions()).schema;

describe("Bold DOM", () => {
  it("serializes strong and parses it back", () => {
    const schema = createSchema();
    const strong = schema.marks.strong;

    if (!strong) {
      throw new Error("Missing strong mark.");
    }

    const doc = schema.node("doc", null, [
      schema.node("paragraph", null, schema.text("a", [strong.create()])),
    ]);
    const serializer = DOMSerializer.fromSchema(schema);
    const container = document.createElement("div");
    container.append(serializer.serializeFragment(doc.content));

    expect(container.innerHTML).toBe("<p><strong>a</strong></p>");

    const parsed = PmDOMParser.fromSchema(schema).parse(container);
    expect(parsed.eq(doc)).toBe(true);
  });

  it("parses <b> as a strong mark", () => {
    const schema = createSchema();
    const container = document.createElement("div");
    container.innerHTML = "<p><b>b</b></p>";

    const parsed = PmDOMParser.fromSchema(schema).parse(container);

    expect(parsed.firstChild?.firstChild?.marks[0]?.type.name).toBe("strong");
  });
});
