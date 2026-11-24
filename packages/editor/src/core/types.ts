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

export type Command = (
  state: EditorState,
  dispatch?: (transaction: Transaction) => void,
  view?: EditorView,
) => boolean;

export interface Commands {}

export interface CommandRegistry {
  get<Name extends keyof Commands>(name: Name): Command | undefined;

  has(name: keyof Commands): boolean;

  keys(): Array<keyof Commands>;
}

export interface ExtensionContext {
  readonly schema: Schema;

  getState(): EditorState;

  getView(): EditorView | undefined;

  readonly commands: CommandRegistry;
}

export interface MarkdownState<TBlock, TInline, TText, TOutput> {
  readonly schema: Schema;

  block(nodes: readonly TBlock[]): TOutput[];

  inline(nodes: readonly TInline[]): TOutput[];

  text(node: TText): TOutput;

  withMarks(node: TOutput, marks: readonly Mark[]): TOutput;
}

export type FromMdastState = MarkdownState<BlockContent, PhrasingContent, MdastText, PmNode>;

export type ToMdastState = MarkdownState<PmNode, PmNode, PmNode, Content>;

export type MdastHandler = (
  node: Root | Content,
  state: FromMdastState,
) => PmNode | readonly PmNode[] | null;

export type PmHandler = (node: PmNode, state: ToMdastState) => Content | readonly Content[] | null;

export type MdastMarkHandler = (node: Content, schema: Schema) => Mark | null;

export type PmMarkHandler = (mark: Mark, children: readonly Content[]) => Content;

export interface MarkdownContributions {
  readonly remarkPlugins?: readonly UnifiedPlugin[];

  readonly fromMdast?: Readonly<Record<string, MdastHandler>>;

  readonly toMdast?: Readonly<Record<string, PmHandler>>;

  readonly markFromMdast?: Readonly<Record<string, MdastMarkHandler>>;

  readonly markToMdast?: Readonly<Record<string, PmMarkHandler>>;
}

export type ContentType = "markdown" | "html" | "json";

export interface ContentCodec {
  parse(content: string, schema: Schema): PmNode;

  serialize(doc: PmNode): string;
}

export type HtmlAttributeDefinition = string | readonly [string, ...string[]];

export interface HtmlSanitizeContributions {
  readonly tagNames?: readonly string[];

  readonly attributes?: Readonly<Record<string, readonly HtmlAttributeDefinition[]>>;

  readonly protocols?: Readonly<Record<string, readonly string[]>>;
}

export interface HtmlContributions {
  readonly sanitize?: HtmlSanitizeContributions;
}

export interface Extension<Options = void> {
  readonly name: string;

  readonly priority?: number;

  readonly requires?: readonly string[];

  readonly extensions?: readonly Extension<unknown>[];

  readonly nodes?: Readonly<Record<string, NodeSpec>>;

  readonly marks?: Readonly<Record<string, MarkSpec>>;

  readonly plugins?: (context: ExtensionContext) => readonly PmPlugin[];

  readonly keymap?: (context: ExtensionContext) => Readonly<Record<string, Command>>;

  readonly commands?: (context: ExtensionContext) => Partial<Commands>;

  readonly nodeViews?: Readonly<Record<string, NodeViewConstructor>>;

  readonly inputRules?: (context: ExtensionContext) => readonly InputRule[];

  readonly markdown?: MarkdownContributions;

  readonly html?: HtmlContributions;

  readonly options?: Options;
}

export type ExtensionFactory<Options> = (options: Options) => Extension<Options>;

export function defineExtension(factory: () => Extension): () => Extension;
export function defineExtension<Options>(
  factory: (options: Options) => Extension<Options>,
): (options: Options) => Extension<Options>;
export function defineExtension(factory: unknown): unknown {
  return factory;
}
