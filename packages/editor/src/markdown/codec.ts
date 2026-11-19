import type { Root } from "mdast";
import type { Schema } from "prosemirror-model";
import type { Node as PmNode } from "prosemirror-model";
import remarkParse from "remark-parse";
import type { Options as RemarkStringifyOptions } from "remark-stringify";
import remarkStringify from "remark-stringify";
import { unified } from "unified";

import { createExtensionManager } from "../core/extension-manager";
import type { Extension, MarkdownCodec } from "../core/types";
import { fromMdastRoot, toMdastRoot } from "./convert";
import type { UnknownNodeStrategy } from "./types";

/**
 * Unknown-node strategy used when none is configured.
 *
 * Development is strict so missing handlers are caught in tests; production
 * keeps unknown content instead of throwing in front of users.
 */
const DEFAULT_UNKNOWN: UnknownNodeStrategy = import.meta.env.DEV ? "throw" : "preserve";

/**
 * Formatting defaults chosen to be stable and canonical.
 *
 * `*` for emphasis/strong and `-` for bullets match the normalization contract,
 * and callers can override any of them through {@link MarkdownCodecConfig.stringify}.
 */
const STRINGIFY_DEFAULTS = {
  emphasis: "*",
  strong: "*",
  bullet: "-",
} as const satisfies Readonly<RemarkStringifyOptions>;

/** Options shared by the markdown codec. */
export interface MarkdownCodecConfig {
  /** What to do with nodes that have no registered handler. */
  readonly unknownNode?: UnknownNodeStrategy;

  /** Options forwarded to remark-stringify. */
  readonly stringify?: Readonly<RemarkStringifyOptions>;
}

/** Options for {@link createMarkdownCodec}. */
export interface CreateMarkdownCodecOptions extends MarkdownCodecConfig {
  /** Extensions whose schema and markdown handlers drive the codec. */
  readonly extensions: readonly Extension<unknown>[];
}

/**
 * Build a markdown codec once per editor.
 *
 * Parsing and stringifying processors are created here and reused for every
 * call, including the remark plugins contributed by extensions.
 */
export function createMarkdownCodec(options: CreateMarkdownCodecOptions): MarkdownCodec {
  const manager = createExtensionManager(options.extensions);
  const strategy = options.unknownNode ?? DEFAULT_UNKNOWN;
  const remarkPlugins = manager.markdown.remarkPlugins;

  const parseProcessor = unified().use(remarkParse);
  const stringifyProcessor = unified().use(remarkStringify, {
    ...STRINGIFY_DEFAULTS,
    ...options.stringify,
  });

  for (const plugin of remarkPlugins) {
    parseProcessor.use(plugin);
    stringifyProcessor.use(plugin);
  }

  return {
    parse(markdown: string, schema: Schema): PmNode {
      const tree = parseProcessor.parse(markdown) as Root;
      const transformed = parseProcessor.runSync(tree) as Root;

      return fromMdastRoot(transformed, schema, manager.markdown, strategy);
    },
    serialize(doc: PmNode): string {
      const root = toMdastRoot(doc, manager.markdown, strategy);
      const transformed = stringifyProcessor.runSync(root) as Root;

      return stringifyProcessor.stringify(transformed).replace(/\n$/, "");
    },
  };
}
