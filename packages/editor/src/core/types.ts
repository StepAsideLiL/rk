import type {
  BlockContent,
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

  /** Convert a block-level source node and its children. */
  block(node: TBlock): TOutput[];

  /** Convert an inline source node and its children. */
  inline(node: TInline): TOutput[];

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
 * Return `null` to let the pipeline fall back to its default handling. Handlers
 * are registered per mdast node `type` in {@link MarkdownContributions}.
 */
export type MdastHandler = (
  node: Content,
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
}

/**
 * A self-contained editor feature.
 *
 * Extensions are plain objects. Every part is optional except the `name`, which
 * identifies the extension for ordering and {@link Extension.requires}.
 * Contributions are merged by the manager into a schema, a plugin list, a
 * keymap, a command registry and a markdown handler registry.
 */
export interface Extension<Options = void> {
  /** Unique extension name, used by {@link Extension.requires}. */
  readonly name: string;

  /** Ordering hint: higher values are applied before lower ones. */
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
 * preserve the options type so callers get the same signature back.
 */
export function defineExtension<Options>(
  factory: ExtensionFactory<Options>,
): ExtensionFactory<Options> {
  return factory;
}
