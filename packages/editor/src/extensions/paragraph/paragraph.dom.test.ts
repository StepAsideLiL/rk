import { DOMSerializer, DOMParser as PmDOMParser } from "prosemirror-model";
import { describe, expect, it } from "vitest";

import { createExtensionManager } from "../../core/extension-manager";
import { Document } from "../document/document";
import { Text } from "../text/text";
import { Paragraph } from "./paragraph";

const extensions = () => [Document(), Text(), Paragraph()];

const createSchema = () => createExtensionManager(extensions()).schema;

describe("Paragraph DOM", () => {
  it("serializes paragraphs and parses them back", () => {
    const schema = createSchema();
    const doc = schema.node("doc", null, [schema.node("paragraph", null, schema.text("text"))]);
    const serializer = DOMSerializer.fromSchema(schema);
    const container = document.createElement("div");
    container.append(serializer.serializeFragment(doc.content));

    expect(container.innerHTML).toBe("<p>text</p>");

    const parsed = PmDOMParser.fromSchema(schema).parse(container);
    expect(parsed.eq(doc)).toBe(true);
  });
});
