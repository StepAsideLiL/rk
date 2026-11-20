import type { Schema } from "prosemirror-model";
import { DOMSerializer, DOMParser as PmDOMParser } from "prosemirror-model";
import type { Node as PmNode } from "prosemirror-model";
import rehypeParse from "rehype-parse";
import rehypeSanitize from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { unified, type PluggableList } from "unified";

import { createExtensionManager } from "../core/extension-manager";
import type { ContentCodec, Extension } from "../core/types";
import { buildSanitizeSchema, rehypeDropDisallowed, type UnknownElementStrategy } from "./sanitize";

/** Options shared by the HTML codec. */
export interface HtmlCodecConfig {
  /** Document used to create and parse DOM nodes. Resolved lazily. */
  readonly document?: Document;

  /** What to do with elements outside the allowlist. Defaults to `unwrap`. */
  readonly unknownElement?: UnknownElementStrategy;
}

/** Options for {@link createHtmlCodec}. */
export interface CreateHtmlCodecOptions extends HtmlCodecConfig {
  /** Extensions whose `toDOM`/`parseDOM` specs and allowlists drive the codec. */
  readonly extensions: readonly Extension<unknown>[];

  /** Prebuilt schema. Derived from `extensions` when omitted. */
  readonly schema?: Schema;
}

/**
 * Build an HTML codec once per editor.
 *
 * Input is parsed to hast, sanitized, stringified, then handed to
 * `prosemirror-model`'s DOMParser. Output comes from the shared DOMSerializer
 * and is sanitized again as defense in depth.
 */
export function createHtmlCodec(options: CreateHtmlCodecOptions): ContentCodec {
  const schema = options.schema ?? createExtensionManager(options.extensions).schema;
  const sanitizeSchema = buildSanitizeSchema(options.extensions);
  const processor = createSanitizeProcessor(sanitizeSchema, options.unknownElement);

  const parsers = new Map<Schema, PmDOMParser>([[schema, PmDOMParser.fromSchema(schema)]]);
  const serializers = new Map<Schema, DOMSerializer>([[schema, DOMSerializer.fromSchema(schema)]]);

  return {
    parse(html: string, targetSchema: Schema): PmNode {
      const windowDocument = resolveDocument(options.document);
      const container = windowDocument.createElement("div");

      // The string is sanitized before it reaches `innerHTML`.
      container.innerHTML = sanitizeHtml(processor, html);

      return parserFor(targetSchema).parse(container);
    },
    serialize(doc: PmNode): string {
      const windowDocument = resolveDocument(options.document);
      const container = windowDocument.createElement("div");
      const fragment = serializerFor(doc.type.schema).serializeFragment(doc.content, {
        document: windowDocument,
      });

      container.append(fragment);

      return sanitizeHtml(processor, container.innerHTML);
    },
  };

  function parserFor(targetSchema: Schema): PmDOMParser {
    let parser = parsers.get(targetSchema);

    if (!parser) {
      parser = PmDOMParser.fromSchema(targetSchema);
      parsers.set(targetSchema, parser);
    }

    return parser;
  }

  function serializerFor(targetSchema: Schema): DOMSerializer {
    let serializer = serializers.get(targetSchema);

    if (!serializer) {
      serializer = DOMSerializer.fromSchema(targetSchema);
      serializers.set(targetSchema, serializer);
    }

    return serializer;
  }
}

/** Create the parse → sanitize → stringify processor once per codec. */
function createSanitizeProcessor(
  schema: Parameters<typeof rehypeSanitize>[0],
  strategy: UnknownElementStrategy | undefined,
) {
  const plugins: PluggableList = [];

  if ((strategy ?? "unwrap") === "drop") {
    plugins.push(rehypeDropDisallowed(schema?.tagNames ?? []));
  }

  plugins.push([rehypeSanitize, schema], rehypeStringify);

  return unified().use(rehypeParse, { fragment: true }).use(plugins);
}

/** Sanitize a string through the shared processor. */
function sanitizeHtml(processor: ReturnType<typeof createSanitizeProcessor>, html: string): string {
  return String(processor.processSync(html));
}

/** Resolve the document lazily so the codec can be created in Node. */
function resolveDocument(injected: Document | undefined): Document {
  const document = injected ?? globalThis.document;

  if (!document) {
    throw new Error(
      "HTML codec requires a DOM document. Pass `document` to createHtmlCodec or run in a browser.",
    );
  }

  return document;
}
