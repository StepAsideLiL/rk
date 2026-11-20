import { parseHTML } from "linkedom";

import type { Extension } from "../core/types";
import { createExtensionManager } from "../core/extension-manager";
import { starterKit } from "../extensions/index";
import { createHtmlCodec } from "./codec";

/** Shared extensions for HTML tests. */
export const extensions = starterKit();

/** Linkedom document injected into the codec. */
export const document = parseHTML("<!doctype html><html><body></body></html>")
  .document as unknown as Document;

/** Shared codec for the starter kit. */
export const codec = createHtmlCodec({ extensions, document });

/** Build an HTML round-trip helper for a custom extension set. */
export function roundTripHtml(
  html: string,
  customExtensions: readonly Extension<unknown>[] = extensions,
): string {
  const manager = createExtensionManager(customExtensions);
  const customCodec =
    customExtensions === extensions
      ? codec
      : createHtmlCodec({ extensions: customExtensions, document, schema: manager.schema });
  const doc = customCodec.parse(html, manager.schema);

  doc.check();

  return customCodec.serialize(doc);
}
