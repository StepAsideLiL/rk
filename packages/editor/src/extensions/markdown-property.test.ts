import fc from "fast-check";
import type { Mark } from "prosemirror-model";
import { describe, expect, it } from "vitest";

import { ExtensionManager } from "../core/extension-manager";
import { MarkdownCodec } from "../markdown/codec";
import { StarterKit } from "./starter-kit/starter-kit";

const extensions = [StarterKit()];
const manager = new ExtensionManager(extensions);
const codec = new MarkdownCodec({ extensions });
const schema = manager.schema;

const strong = schema.marks.strong;
const emphasis = schema.marks.emphasis;

if (!strong || !emphasis) {
  throw new Error("Property tests require the bold and italic marks.");
}

const textArbitrary = fc
  .string({ minLength: 1, maxLength: 24 })
  .filter((value) => value.trim().length > 0 && !/[\r\n]/.test(value));

const segmentArbitrary = fc
  .record({
    text: textArbitrary,
    bold: fc.boolean(),
    italic: fc.boolean(),
  })
  .map(({ text, bold, italic }) => {
    const marks: Mark[] = [];

    if (bold) {
      marks.push(strong.create());
    }

    if (italic) {
      marks.push(emphasis.create());
    }

    return { text, marks };
  });

const blockArbitrary = fc.record({
  kind: fc.constantFrom("paragraph", "heading"),
  level: fc.integer({ min: 1, max: 3 }),
  segments: fc.array(segmentArbitrary, { minLength: 1, maxLength: 4 }),
});

type Block = {
  readonly kind: "paragraph" | "heading";
  readonly level: number;
  readonly segments: ReadonlyArray<{
    readonly text: string;
    readonly marks: readonly Mark[];
  }>;
};

function buildDoc(blocks: readonly Block[]) {
  return schema.node(
    "doc",
    null,
    blocks.map((block) => {
      const content = block.segments.map((segment) => schema.text(segment.text, segment.marks));

      return block.kind === "heading"
        ? schema.node("heading", { level: block.level }, content)
        : schema.node("paragraph", null, content);
    }),
  );
}

describe("markdown property tests", () => {
  it("is idempotent after the first normalization and always valid", () => {
    fc.assert(
      fc.property(fc.array(blockArbitrary, { minLength: 1, maxLength: 5 }), (blocks) => {
        const doc = buildDoc(blocks);
        doc.check();

        const first = codec.serialize(doc);
        const parsed = codec.parse(first, schema);
        parsed.check();

        expect(codec.serialize(parsed)).toBe(first);
      }),
      { numRuns: 50 },
    );
  });
});
