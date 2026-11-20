import type {
  BlockContent,
  Root,
  RootContent as Content,
  PhrasingContent,
  Text as MdastText,
} from "mdast";
import type { InputRule } from "prosemirror-inputrules";
import type { Mark, MarkSpec, Node as PmNode, NodeSpec, Schema } from "prosemirror-model";
import type { EditorState, Plugin as PmPlugin, Transaction } from "prosemirror-state";
import type { EditorView, NodeViewConstructor } from "prosemirror-view";
import type { Plugin as UnifiedPlugin } from "unified";

/**
 * A ProseMirror command.
 *
 * Commands are pure: they inspect the given state and either apply themselves
 * through `dispatch` or only report whether they could apply. They must never
 * mutate the state or the view directly.
 */
export type Command = (
  state: EditorState,
  dispatch?: (transaction: Transaction) => void,
  view?: EditorView,
) => boolean;

/**
 * Declaration-merging surface for typed commands.
 *
 * Extensions add their commands by augmenting this interface, for example:
 *
 * ```ts
 * declare module "@rk/editor" {
 *   interface Commands {
 *     toggleBold: Command;
 *   }
 * }
 * ```
 *
 * The manager registers each entry and exposes it through
 * {@link CommandRegistry}, so callers get completion and type checking for the
 * commands that are actually shipped.
 */
export interface Commands {}

/**
 * Read-only view of the commands registered by the active extensions.
 *
 * Lookups are keyed by the names contributed through {@link Commands}, which
 * makes a typo in a command name a compile-time error.
 */
export interface CommandRegistry {
  /** Return the command registered under `name`, or `undefined`. */
  get<Name extends keyof Commands>(name: Name): Command | undefined;

  /** Whether a command is registered under `name`. */
  has(name: keyof Commands): boolean;

  /** Every registered command name. */
  keys(): Array<keyof Commands>;
}

/**
 * State shared with an extension while the editor is created.
 *
 * The context is only valid during extension setup and for the lifetime of the
 * editor it was created for. It gives extensions access to the assembled schema
 * and to the live editor state and view without importing the manager itself.
 */
export interface ExtensionContext {
  /** The schema assembled from every extension's nodes and marks. */
  readonly schema: Schema;

  /** Read the current editor state. */
  getState(): EditorState;

  /** Read the mounted editor view, or `undefined` before it is attached. */
  getView(): EditorView | undefined;

  /** Typed access to the commands registered by all extensions. */
  readonly commands: CommandRegistry;
}

/**
 * Helpers passed to markdown handlers for converting the node they receive.
 *
 * The four helpers delegate back to the registry, so handlers stay declarative:
 * they describe the shape of one node while the pipeline recurses into children.
 * `TOutput` is the node type produced by the conversion direction.
 */
export interface MarkdownState<TBlock, TInline, TText, TOutput> {
  /** The schema the conversion runs against. */
  readonly schema: Schema;

  /** Convert block-level source nodes and their children. */
  block(nodes: readonly TBlock[]): TOutput[];

  /** Convert inline source nodes and their children. */
  inline(nodes: readonly TInline[]): TOutput[];

  /** Convert a text source node. */
  text(node: TText): TOutput;

  /** Return a copy of `node` with the given ProseMirror marks applied. */
  withMarks(node: TOutput, marks: readonly Mark[]): TOutput;
}

/**
 * Markdown state for the mdast to ProseMirror direction: children come from
 * mdast and the handler produces ProseMirror nodes.
 */
export type FromMdastState = MarkdownState<BlockContent, PhrasingContent, MdastText, PmNode>;

/**
 * Markdown state for the ProseMirror to mdast direction: children come from
 * ProseMirror and the handler produces mdast content.
 */
export type ToMdastState = MarkdownState<PmNode, PmNode, PmNode, Content>;

/**
 * Convert one mdast node into ProseMirror content.
 *
 * The `root` node is included so a document extension can handle it with the
 * same signature. Return `null` to let the pipeline fall back to the configured
 * unknown-node strategy. Handlers are registered per mdast node `type` in
 * {@link MarkdownContributions}.
 */
export type MdastHandler = (
  node: Root | Content,
  state: FromMdastState,
) => PmNode | readonly PmNode[] | null;

/**
 * Convert one ProseMirror node into mdast content.
 *
 * Return `null` to let the pipeline fall back to its default handling. Handlers
 * are registered per ProseMirror node type in {@link MarkdownContributions}.
 */
export type PmHandler = (node: PmNode, state: ToMdastState) => Content | readonly Content[] | null;

/**
 * Convert one mdast mark node into a ProseMirror mark.
 *
 * Registered under {@link MarkdownContributions.markFromMdast} by mdast node
 * type, so extensions can support marks beyond the built-in
 * strong/emphasis/code/link set.
 */
export type MdastMarkHandler = (node: Content, schema: Schema) => Mark | null;

/**
 * Serialize a ProseMirror mark to mdast.
 *
 * Registered under {@link MarkdownContributions.markToMdast} by mark name. The
 * handler receives the serialized children and returns the wrapper node.
 */
export type PmMarkHandler = (mark: Mark, children: readonly Content[]) => Content;

/**
 * Markdown contributions attached to an extension.
 *
 * The pipeline is registry based: each extension names the mdast and
 * ProseMirror node types it can convert, so no hard-coded conversion table is
 * needed.
 */
export interface MarkdownContributions {
  /** unified/remark plugins added to the parse and stringify pipelines. */
  readonly remarkPlugins?: readonly UnifiedPlugin[];

  /** Handlers keyed by mdast node type, used when parsing markdown. */
  readonly fromMdast?: Readonly<Record<string, MdastHandler>>;

  /** Handlers keyed by ProseMirror node type, used when serializing markdown. */
  readonly toMdast?: Readonly<Record<string, PmHandler>>;

  /** Mark parsers keyed by mdast node type (for extension-defined marks). */
  readonly markFromMdast?: Readonly<Record<string, MdastMarkHandler>>;

  /** Mark serializers keyed by ProseMirror mark name. */
  readonly markToMdast?: Readonly<Record<string, PmMarkHandler>>;
}

/** Content formats the editor can parse and serialize. */
export type ContentType = "markdown" | "html" | "json";

/**
 * A parser/serializer pair for one content format.
 *
 * Core owns no conversion dependency: codecs are injected so the editor only
 * depends on this small contract.
 */
export interface ContentCodec {
  /** Parse content into a ProseMirror document for the given schema. */
  parse(content: string, schema: Schema): PmNode;

  /** Serialize a ProseMirror document to this content format. */
  serialize(doc: PmNode): string;
}

/** Markdown codec, kept as an alias for the shared codec contract. */
export type MarkdownCodec = ContentCodec;

/** Attribute allowlist entry used by the HTML sanitizer. */
export type HtmlAttributeDefinition = string | readonly [string, ...string[]];

/** Sanitizer data contributed by an extension for the HTML codec. */
export interface HtmlSanitizeContributions {
  /** Elements this extension reads and writes. */
  readonly tagNames?: readonly string[];

  /** Attributes allowed on specific elements, keyed by tag name. */
  readonly attributes?: Readonly<Record<string, readonly HtmlAttributeDefinition[]>>;

  /** URL protocols allowed for specific attributes, keyed by attribute name. */
  readonly protocols?: Readonly<Record<string, readonly string[]>>;
}

/**
 * HTML contributions attached to an extension.
 *
 * Extensions never implement per-node HTML handlers: the HTML codec is driven
 * by the same `parseDOM`/`toDOM` specs as ProseMirror and only needs allowlist
 * data here.
 */
export interface HtmlContributions {
  /** Sanitizer allowlist data for elements this extension renders. */
  readonly sanitize?: HtmlSanitizeContributions;
}

/**
 * A self-contained editor feature.
 *
 * Extensions are plain objects. Every part is optional except the `name`, which
 * identifies the extension for ordering and {@link Extension.requires}.
 * Contributions are merged by the manager into a schema, a plugin list, a
 * keymap, a command registry and markdown/HTML registries.
 */
export interface Extension<Options = void> {
  /** Unique extension name, used by {@link Extension.requires}. */
  readonly name: string;

  /**
   * Ordering hint, default 100.
   *
   * Extensions are merged into the schema in ascending order, so a block node
   * with the lowest value (typically paragraph at 0) becomes the default block.
   * Keymaps and input rules are evaluated in descending order, so higher values
   * win key and rule conflicts.
   */
  readonly priority?: number;

  /** Names of extensions that must also be present. */
  readonly requires?: readonly string[];

  /** Schema nodes contributed by this extension, keyed by node type. */
  readonly nodes?: Readonly<Record<string, NodeSpec>>;

  /** Schema marks contributed by this extension, keyed by mark type. */
  readonly marks?: Readonly<Record<string, MarkSpec>>;

  /** ProseMirror plugins created once the schema and context are available. */
  readonly plugins?: (context: ExtensionContext) => readonly PmPlugin[];

  /** Key bindings merged into the editor keymap, keyed by key name. */
  readonly keymap?: (context: ExtensionContext) => Readonly<Record<string, Command>>;

  /** Typed commands contributed to the {@link CommandRegistry}. */
  readonly commands?: (context: ExtensionContext) => Partial<Commands>;

  /** Node views keyed by node type. Must clean up in `destroy`. */
  readonly nodeViews?: Readonly<Record<string, NodeViewConstructor>>;

  /** Input rules (markdown-style shortcuts) contributed to the editor. */
  readonly inputRules?: (context: ExtensionContext) => readonly InputRule[];

  /** Markdown parsing and serialization contributions. */
  readonly markdown?: MarkdownContributions;

  /** HTML sanitizer allowlist contributions. */
  readonly html?: HtmlContributions;

  /**
   * Type-level marker that ties the extension to the options its factory
   * accepts. Factories close over their options, so this is never set at
   * runtime.
   */
  readonly options?: Options;
}

/**
 * Factory that turns options into an extension.
 *
 * Extensions are configured by calling the factory, which keeps option types
 * inferred and lets each instance capture its own configuration.
 */
export type ExtensionFactory<Options> = (options: Options) => Extension<Options>;

/**
 * Identity helper for declaring an extension factory.
 *
 * The implementation returns `factory` unchanged; its only job is to infer and
 * preserve the options type so callers get the same signature back. Factories
 * without options are returned as zero-argument functions.
 */
export function defineExtension(factory: () => Extension): () => Extension;
export function defineExtension<Options>(
  factory: (options: Options) => Extension<Options>,
): (options: Options) => Extension<Options>;
export function defineExtension(factory: unknown): unknown {
  return factory;
}
