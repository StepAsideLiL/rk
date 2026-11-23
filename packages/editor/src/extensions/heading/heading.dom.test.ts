import { DOMSerializer, DOMParser as PmDOMParser } from "prosemirror-model";
import { describe, expect, it } from "vitest";

import { ExtensionManager } from "../../core/extension-manager";
import { Document } from "../document/document";
import { Paragraph } from "../paragraph/paragraph";
import { Text } from "../text/text";
import { Heading } from "./heading";

const extensions = () => [Document(), Text(), Paragraph(), Heading({ levels: [1, 2, 3] })];

const createSchema = () => new ExtensionManager(extensions()).schema;

describe("Heading DOM", () => {
  it("serializes the configured heading level and parses it back", () => {
    const schema = createSchema();
    const doc = schema.node("doc", null, [
      schema.node("heading", { level: 2 }, schema.text("Title")),
    ]);
    const serializer = DOMSerializer.fromSchema(schema);
    const container = document.createElement("div");
    container.append(serializer.serializeFragment(doc.content));

    expect(container.innerHTML).toBe("<h2>Title</h2>");

    const parsed = PmDOMParser.fromSchema(schema).parse(container);
    expect(parsed.eq(doc)).toBe(true);
  });

  it("parses each configured heading tag with its level", () => {
    const schema = createSchema();
    const container = document.createElement("div");
    container.innerHTML = "<h1>one</h1><h3>three</h3>";

    const parsed = PmDOMParser.fromSchema(schema).parse(container);

    expect(parsed.childCount).toBe(2);
    expect(parsed.child(0).attrs.level).toBe(1);
    expect(parsed.child(1).attrs.level).toBe(3);
  });
});
