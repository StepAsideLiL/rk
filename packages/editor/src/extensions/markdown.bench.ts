import { test } from "vitest";

import { createExtensionManager } from "../core/extension-manager";
import { starterKit } from "../extensions/index";
import { createMarkdownCodec } from "../markdown/index";

const extensions = starterKit();
const manager = createExtensionManager(extensions);
const codec = createMarkdownCodec({ extensions });
const markdown = Array.from(
  { length: 5_000 },
  (_, index) => `## Section ${index}\n\nParagraph ${index} with **bold** and *italic* text.`,
).join("\n\n");
const doc = codec.parse(markdown, manager.schema);

test("markdown codec, 5,000 blocks", { timeout: 300_000 }, async ({ bench }) => {
  await bench("parse", { writeResult: "coverage/bench-parse-${projectName}.json" }, () => {
    codec.parse(markdown, manager.schema);
  }).run({ iterations: 2, warmupIterations: 0, time: 1 });

  await bench("serialize", { writeResult: "coverage/bench-serialize-${projectName}.json" }, () => {
    codec.serialize(doc);
  }).run({ iterations: 2, warmupIterations: 0, time: 1 });
});
