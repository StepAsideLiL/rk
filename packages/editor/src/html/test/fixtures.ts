import { parseHTML } from "linkedom";

import type { Extension } from "../../core/types";
import { ExtensionManager } from "../../core/extension-manager";
import { StarterKit } from "../../extensions/index";
import { HtmlCodec } from "../codec";

export const extensions = [StarterKit()];

export const document = parseHTML("<!doctype html><html><body></body></html>")
  .document as unknown as Document;

export const codec = new HtmlCodec({ extensions, document });

export function roundTripHtml(
  html: string,
  customExtensions: readonly Extension<unknown>[] = extensions,
): string {
  const manager = new ExtensionManager(customExtensions);
  const customCodec =
    customExtensions === extensions
      ? codec
      : new HtmlCodec({ extensions: customExtensions, document, schema: manager.schema });
  const doc = customCodec.parse(html, manager.schema);

  doc.check();

  return customCodec.serialize(doc);
}
