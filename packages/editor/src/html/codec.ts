import type { Schema } from "prosemirror-model";
import { DOMSerializer, DOMParser as PmDOMParser } from "prosemirror-model";
import type { Node as PmNode } from "prosemirror-model";
import rehypeParse from "rehype-parse";
import rehypeSanitize, { type Options as SanitizeSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { unified, type PluggableList } from "unified";

import { ExtensionManager } from "../core/extension-manager";
import type { ContentCodec, Extension } from "../core/types";
import { buildSanitizeSchema, rehypeDropDisallowed, type UnknownElementStrategy } from "./sanitize";

export interface HtmlCodecConfig {
  readonly document?: Document;

  readonly unknownElement?: UnknownElementStrategy;
}

export interface HtmlCodecOptions extends HtmlCodecConfig {
  readonly extensions: readonly Extension<unknown>[];

  readonly schema?: Schema;
}

export class HtmlCodec implements ContentCodec {
  private readonly document: Document | undefined;
  private readonly sanitizeSchema: SanitizeSchema;
  private readonly processor: ReturnType<typeof createSanitizeProcessor>;
  private readonly parsers = new Map<Schema, PmDOMParser>();
  private readonly serializers = new Map<Schema, DOMSerializer>();

  constructor(options: HtmlCodecOptions) {
    const schema = options.schema ?? new ExtensionManager(options.extensions).schema;

    this.document = options.document;
    this.sanitizeSchema = buildSanitizeSchema(options.extensions);
    this.processor = createSanitizeProcessor(this.sanitizeSchema, options.unknownElement);
    this.parsers.set(schema, PmDOMParser.fromSchema(schema));
    this.serializers.set(schema, DOMSerializer.fromSchema(schema));
  }

  parse(html: string, targetSchema: Schema): PmNode {
    const windowDocument = resolveDocument(this.document);
    const container = windowDocument.createElement("div");

    container.innerHTML = sanitizeHtml(this.processor, html);

    return this.parserFor(targetSchema).parse(container);
  }

  serialize(doc: PmNode): string {
    const windowDocument = resolveDocument(this.document);
    const container = windowDocument.createElement("div");
    const fragment = this.serializerFor(doc.type.schema).serializeFragment(doc.content, {
      document: windowDocument,
    });

    container.append(fragment);

    return sanitizeHtml(this.processor, container.innerHTML);
  }

  private parserFor(targetSchema: Schema): PmDOMParser {
    let parser = this.parsers.get(targetSchema);

    if (!parser) {
      parser = PmDOMParser.fromSchema(targetSchema);
      this.parsers.set(targetSchema, parser);
    }

    return parser;
  }

  private serializerFor(targetSchema: Schema): DOMSerializer {
    let serializer = this.serializers.get(targetSchema);

    if (!serializer) {
      serializer = DOMSerializer.fromSchema(targetSchema);
      this.serializers.set(targetSchema, serializer);
    }

    return serializer;
  }
}

function createSanitizeProcessor(
  schema: SanitizeSchema,
  strategy: UnknownElementStrategy | undefined,
) {
  const plugins: PluggableList = [];

  if ((strategy ?? "unwrap") === "drop") {
    plugins.push(rehypeDropDisallowed(schema.tagNames!));
  }

  plugins.push([rehypeSanitize, schema], rehypeStringify);

  return unified().use(rehypeParse, { fragment: true }).use(plugins);
}

function sanitizeHtml(processor: ReturnType<typeof createSanitizeProcessor>, html: string): string {
  return String(processor.processSync(html));
}

function resolveDocument(injected: Document | undefined): Document {
  const document = injected ?? globalThis.document;

  if (!document) {
    throw new Error(
      "HTML codec requires a DOM document. Pass `document` to HtmlCodec or run in a browser.",
    );
  }

  return document;
}
