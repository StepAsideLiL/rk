import type { Mark, MarkType, NodeType, Schema, SchemaSpec } from "prosemirror-model";
import { Node as PmNode } from "prosemirror-model";
import type { Plugin, PluginKey, Transaction } from "prosemirror-state";
import { AllSelection, EditorState, Selection } from "prosemirror-state";
import { EditorView } from "prosemirror-view";
import type { EditorProps } from "prosemirror-view";

import { ExtensionManager } from "./core/extension-manager";
import type {
  Command,
  CommandRegistry,
  Commands,
  ContentCodec,
  ContentType,
  Extension,
  ExtensionContext,
} from "./core/types";
import { HtmlCodec } from "./html/codec";
import { MarkdownCodec } from "./markdown/codec";

/** Content accepted by {@link Editor}. */
export type EditorContent = PmNode | string | { readonly [key: string]: unknown };

/** How string content should be interpreted. */
export type EditorContentType = ContentType;

/** Text direction applied to the editor DOM. */
export type TextDirection = "ltr" | "rtl" | "auto";

/** Where the cursor should go when the editor is mounted. */
export type Autofocus = "start" | "end" | "all" | number | boolean | null;

/** Built-in behavior options that do not belong to a feature extension. */
export interface CoreExtensionOptions {
  /** `tabindex` attribute for the editable element. */
  readonly tabindex?: {
    /** Explicit value. Defaults to `"0"` for editable editors. */
    readonly value?: string;
  };
}

/** Context passed to a custom leaf text serializer. */
export interface TextSerializerContext {
  readonly node: PmNode;
}

/** Serialize a leaf node to plain text. Return `false` to skip it. */
export type TextSerializer = (context: TextSerializerContext) => string | false;

/** Options accepted by {@link Editor.getText}. */
export interface GetTextOptions {
  /** Text inserted between block nodes. Defaults to `"\n\n"`. */
  readonly blockSeparator?: string;

  /** Leaf serializers keyed by node type name. */
  readonly textSerializers?: Readonly<Record<string, TextSerializer>>;
}

/** A node or mark type accepted by {@link Editor.isActive}. */
export type NodeOrMarkType = NodeType | MarkType;

/** A name or type accepted by {@link Editor.isActive}. */
export type IsActiveTarget = string | NodeOrMarkType | null;

/** Chain returned by {@link Editor.chain}. */
export type CommandChain = {
  readonly [Name in keyof Commands]: () => CommandChain;
} & {
  /** Run every queued command in order. */
  run(): boolean;
};

/** JSON codec used when no custom one is injected. */
export class JsonCodec implements ContentCodec {
  parse(content: string, schema: Schema): PmNode {
    return schema.nodeFromJSON(JSON.parse(content));
  }

  serialize(doc: PmNode): string {
    return JSON.stringify(doc.toJSON());
  }
}

/** Shared JSON codec instance. */
export const jsonCodec: ContentCodec = new JsonCodec();

/** Options accepted by {@link Editor}. */
export interface EditorOptions {
  /** Extensions to assemble, in any order. */
  readonly extensions: readonly Extension<unknown>[];

  /** Complete schema spec. Every node and mark needs a matching extension. */
  readonly schemaSpec?: SchemaSpec;

  /** Initial document. Defaults to an empty document from the schema. */
  readonly content?: EditorContent;

  /** Interpretation of string content. Defaults to `"json"`. */
  readonly contentType?: EditorContentType;

  /** Mount the editable view into this element. Omit or pass null to stay headless. */
  readonly element?: HTMLElement | null;

  /** Whether users can edit the document. Defaults to `true`. */
  readonly editable?: boolean;

  /** Text direction applied to the editor element. */
  readonly textDirection?: TextDirection;

  /** Move the cursor or selection when the view is created. */
  readonly autofocus?: Autofocus;

  /** Extra attributes and handlers forwarded to ProseMirror. */
  readonly editorProps?: EditorProps;

  /** Built-in behavior options, currently the editor `tabindex`. */
  readonly coreExtensionOptions?: CoreExtensionOptions;

  /** Whether input rules run, or the extensions whose rules should run. */
  readonly enableInputRules?: boolean | readonly (Extension<unknown> | string)[];

  /**
   * Optional codec overrides keyed by content type.
   *
   * JSON falls back to the built-in codec; markdown and HTML default to codecs
   * built from the extensions.
   */
  readonly codecs?: Partial<Record<ContentType, ContentCodec>>;

  /**
   * Legacy markdown codec override.
   *
   * Prefer `codecs.markdown`; when omitted, a markdown codec is built from the
   * extensions.
   */
  readonly markdown?: ContentCodec;
}

/** A command bound to an editor: state and dispatch are already applied. */
export type BoundCommand = () => boolean;

/** Commands exposed by an editor, keyed by the augmented {@link Commands}. */
export type BoundCommands = { readonly [Name in keyof Commands]: BoundCommand };

/** Events emitted by an editor. */
export interface EditorEvents {
  /** Fired for every transaction, before the `update` event. */
  transaction: Transaction;

  /** Fired after a transaction has been applied to the state. */
  update: EditorState;

  /** Fired once when the editor is destroyed. */
  destroy: undefined;
}

/** Removes a listener previously registered with {@link Editor.on}. */
export type Unsubscribe = () => void;

/** Transaction meta key for content set from outside the editor. */
export const CONTROLLED_UPDATE_META = "rk-editor:controlled-update";

/**
 * Editor with default markdown, HTML and JSON codecs.
 *
 * Defaults can be overridden through `codecs` or the legacy `markdown` option.
 * The ProseMirror view is only created when `element` is provided, so the same
 * class works in Node for tests and on the server.
 */
export class Editor {
  /** The schema assembled from the extensions. */
  readonly schema: Schema;

  /** Commands that dispatch against the current state. */
  readonly commands: BoundCommands;

  /** Dry-run versions of the commands: they never dispatch. */
  readonly can: BoundCommands;

  private readonly manager: ExtensionManager;
  private readonly emitter: EditorEmitter;
  private readonly registry: MutableCommandRegistry;
  private codecs: Record<ContentType, ContentCodec>;
  private options: EditorOptions;
  private editable: boolean;
  private editorState: EditorState | undefined;
  private editorView: EditorView | undefined;
  private destroyed = false;

  constructor(options: EditorOptions) {
    this.options = { ...options };
    this.editable = options.editable ?? true;
    this.manager = new ExtensionManager(options.extensions, {
      schemaSpec: options.schemaSpec,
    });
    this.emitter = new EditorEmitter();
    this.registry = new MutableCommandRegistry();
    this.codecs = resolveCodecs(options);
    this.schema = this.manager.schema;

    const context: ExtensionContext = {
      schema: this.schema,
      getState: () => this.currentState(),
      getView: () => this.editorView,
      commands: this.registry,
    };

    const contributed = this.manager.createCommands(context);
    this.registry.register(contributed);

    const plugins = this.manager.createPlugins(context, {
      inputRules: options.enableInputRules,
    });
    const doc = resolveContent(options.content, options.contentType, this.schema, this.codecs);
    this.editorState = EditorState.create({ schema: this.schema, doc, plugins });

    if (options.element) {
      this.createView(options.element);
    }

    this.commands = this.bindCommands(contributed, false);
    this.can = this.bindCommands(contributed, true);
  }

  /** The mounted ProseMirror view, or `undefined` in headless mode. */
  get view(): EditorView | undefined {
    return this.editorView;
  }

  /** The current editor state. */
  get state(): EditorState {
    return this.currentState();
  }

  /** Whether users can currently edit the document. */
  get isEditable(): boolean {
    return this.editable;
  }

  /** Whether the document has no text content. */
  get isEmpty(): boolean {
    return this.currentState().doc.textContent.length === 0;
  }

  /** Whether the editor view currently owns DOM focus. */
  get isFocused(): boolean {
    return this.editorView?.hasFocus() ?? false;
  }

  /** Whether {@link destroy} has been called. */
  get isDestroyed(): boolean {
    return this.destroyed;
  }

  /** Create and mount a view for this editor, replacing any existing view. */
  createView = (element: HTMLElement): EditorView => {
    if (this.destroyed) {
      throw new Error("Cannot create a view for a destroyed editor.");
    }

    this.editorView?.destroy();
    this.editorView = new EditorView(element, {
      state: this.currentState(),
      dispatchTransaction: (transaction) => this.applyTransaction(transaction),
      nodeViews: this.manager.nodeViews,
      ...this.viewProps(),
    });
    this.applyAutofocus();

    return this.editorView;
  };

  /** Mount the editor into a DOM element. */
  mount = (element: HTMLElement): EditorView => this.createView(element);

  /** Unmount the view while keeping the editor state intact. */
  unmount = (): void => {
    this.destroyView();
  };

  /** Destroy the attached view without destroying the editor itself. */
  destroyView = (): void => {
    this.editorView?.destroy();
    this.editorView = undefined;
  };

  /** Destroy the view and release every listener and plugin resource. */
  destroy = (): void => {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.destroyView();
    this.emitter.emit("destroy", undefined);
    this.emitter.clear();
  };

  /** Apply a transaction to the editor, updating state and view. */
  dispatch = (transaction: Transaction): void => {
    this.applyTransaction(transaction);
  };

  /** Update runtime options whose changes can be applied without rebuilding. */
  setOptions(options: Partial<EditorOptions>): void {
    if (this.destroyed) {
      return;
    }

    this.options = { ...this.options, ...options };

    if (options.editable !== undefined) {
      this.editable = options.editable;
    }

    if (options.codecs !== undefined || options.markdown !== undefined) {
      this.codecs = resolveCodecs(this.options);
    }

    if (options.content !== undefined) {
      this.setContent(options.content, options.contentType);
    }

    this.applyViewProps();
  }

  /** Change the editable state and optionally emit an update event. */
  setEditable(editable: boolean, emitUpdate = true): void {
    if (this.destroyed || this.editable === editable) {
      return;
    }

    this.editable = editable;
    this.applyViewProps();

    if (emitUpdate) {
      this.emitter.emit("update", this.currentState());
    }
  }

  /** Serialize the current document to markdown using the active codec. */
  getMarkdown = (): string => this.codecs.markdown.serialize(this.currentState().doc);

  /** Serialize the current document to HTML using the active codec. */
  getHTML = (): string => this.codecs.html.serialize(this.currentState().doc);

  /** Serialize the current document to JSON. */
  getJSON = (): string => this.codecs.json.serialize(this.currentState().doc);

  /** Serialize the document to plain text. */
  getText(options: GetTextOptions = {}): string {
    const doc = this.currentState().doc;
    const serializers = options.textSerializers ?? {};

    return doc.textBetween(0, doc.content.size, options.blockSeparator ?? "\n\n", (node) => {
      const serializer = serializers[node.type.name];

      if (!serializer) {
        return "";
      }

      const text = serializer({ node });

      return typeof text === "string" ? text : "";
    });
  }

  /** Read the attributes of the active node or mark type. */
  getAttributes(typeOrName: string | NodeOrMarkType): Record<string, unknown> {
    const { state } = this;
    const type = resolveType(state.schema, typeOrName);

    if (!type) {
      return {};
    }

    if (isMarkType(state.schema, type)) {
      const mark = activeMarks(state).find((candidate) => candidate.type === type);

      return mark ? { ...mark.attrs } : {};
    }

    const node = candidateNodes(state).find((candidate) => candidate.type === type);

    return node ? { ...node.attrs } : {};
  }

  /** Whether the selected node or mark is active, optionally matching attributes. */
  isActive(
    nameOrAttributes: IsActiveTarget | Readonly<Record<string, unknown>>,
    attributes?: Readonly<Record<string, unknown>>,
  ): boolean {
    let target: IsActiveTarget = nameOrAttributes as IsActiveTarget;
    let filter = attributes;

    if (isAttributes(nameOrAttributes)) {
      target = null;
      filter = nameOrAttributes;
    }

    const { state } = this;

    if (target === null) {
      return (
        activeMarks(state).some((mark) => attributesMatch(mark.attrs, filter)) ||
        candidateNodes(state).some((node) => attributesMatch(node.attrs, filter))
      );
    }

    const type = resolveType(state.schema, target);

    if (!type) {
      return false;
    }

    if (isMarkType(state.schema, type)) {
      return activeMarks(state).some(
        (mark) => mark.type === type && attributesMatch(mark.attrs, filter),
      );
    }

    return candidateNodes(state).some(
      (node) => node.type === type && attributesMatch(node.attrs, filter),
    );
  }

  /** Register a ProseMirror plugin on the running editor. */
  registerPlugin(
    plugin: Plugin,
    handlePlugins?: (newPlugin: Plugin, plugins: Plugin[]) => Plugin[],
  ): void {
    if (this.destroyed) {
      return;
    }

    const plugins = this.currentState().plugins;
    const next = handlePlugins ? handlePlugins(plugin, [...plugins]) : [...plugins, plugin];

    this.replacePlugins(next);
  }

  /** Unregister a plugin by its `PluginKey` or plugin key name. */
  unregisterPlugin(nameOrPluginKey: string | PluginKey): void {
    if (this.destroyed) {
      return;
    }

    const next = this.currentState().plugins.filter(
      (plugin) => !pluginMatchesKey(plugin, nameOrPluginKey),
    );

    this.replacePlugins(next);
  }

  /** Queue registered commands and run them as one operation. */
  chain(): CommandChain {
    const queued: Array<keyof Commands> = [];
    const registry = this.registry;
    let chain: CommandChain;

    const handler: CommandChain = {
      run: () => this.runChain(queued),
    } as CommandChain;

    chain = new Proxy(handler, {
      get(target, property, receiver) {
        if (property in target) {
          return Reflect.get(target, property, receiver);
        }

        if (typeof property !== "string" || !registry.has(property as keyof Commands)) {
          return undefined;
        }

        return () => {
          queued.push(property as keyof Commands);

          return chain;
        };
      },
    });

    return chain;
  }

  /**
   * Replace the document from outside the editor.
   *
   * Skips no-op updates and marks the transaction with
   * {@link CONTROLLED_UPDATE_META}, so controlled React content does not echo
   * back through `onChange`.
   */
  setContent = (content: EditorContent, contentType?: EditorContentType): void => {
    if (this.destroyed) {
      return;
    }

    const nextDoc = resolveContent(content, contentType, this.schema, this.codecs);

    if (nextDoc.eq(this.currentState().doc)) {
      return;
    }

    const transaction = this.currentState().tr.replaceWith(
      0,
      this.currentState().doc.content.size,
      nextDoc.content,
    );
    transaction.setMeta(CONTROLLED_UPDATE_META, true);
    this.applyTransaction(transaction);
  };

  /** Subscribe to an editor event. Returns an unsubscribe function. */
  on = <Event extends keyof EditorEvents>(
    event: Event,
    listener: (payload: EditorEvents[Event]) => void,
  ): Unsubscribe => this.emitter.on(event, listener);

  /** View props assembled from options and current editable state. */
  private viewProps(): EditorProps {
    return {
      ...this.options.editorProps,
      editable: () => this.editable,
      attributes: (state) => {
        const base = this.options.editorProps?.attributes;
        const attributes = {
          ...(base ? (typeof base === "function" ? base(state) : base) : {}),
        };
        const direction = this.options.textDirection;

        if (direction) {
          attributes.dir = direction;
        }

        const tabindex = this.tabindex();

        if (tabindex !== undefined) {
          attributes.tabindex = tabindex;
        }

        return attributes;
      },
    };
  }

  /** Apply the current view props without replacing state. */
  private applyViewProps(): void {
    this.editorView?.setProps({
      ...this.viewProps(),
      state: this.currentState(),
      dispatchTransaction: (transaction) => this.applyTransaction(transaction),
    });
  }

  /** Resolve the `tabindex` attribute from options and editable state. */
  private tabindex(): string | undefined {
    const configured = this.options.coreExtensionOptions?.tabindex?.value;

    if (configured !== undefined) {
      return configured;
    }

    return this.editable ? "0" : undefined;
  }

  /** Focus the view and apply the configured autofocus selection. */
  private applyAutofocus(): void {
    const autofocus = this.options.autofocus;
    const view = this.editorView;

    if (!view || autofocus === undefined || autofocus === false || autofocus === null) {
      return;
    }

    const doc = this.currentState().doc;
    const selection = resolveAutofocusSelection(doc, autofocus);

    if (selection) {
      view.dispatch(this.currentState().tr.setSelection(selection));
    }

    view.focus();
  }

  /** Replace the plugin list, preserving the document and selection. */
  private replacePlugins(plugins: readonly Plugin[]): void {
    const state = this.currentState().reconfigure({ plugins: [...plugins] });
    this.editorState = state;
    this.editorView?.updateState(state);
  }

  /** Run queued commands against a working state, committing on success. */
  private runChain(names: readonly (keyof Commands)[]): boolean {
    if (this.destroyed) {
      return false;
    }

    let state = this.currentState();
    const transactions: Transaction[] = [];

    for (const name of names) {
      const command = this.registry.get(name);

      /* v8 ignore next 3 */
      if (!command) {
        return false;
      }

      const applied = command(
        state,
        (transaction) => {
          state = state.apply(transaction);
          transactions.push(transaction);
        },
        this.editorView,
      );

      if (!applied) {
        return false;
      }
    }

    for (const transaction of transactions) {
      this.applyTransaction(transaction);
    }

    return true;
  }

  private applyTransaction(transaction: Transaction): void {
    if (this.destroyed) {
      return;
    }

    this.editorState = this.currentState().apply(transaction);
    this.editorView?.updateState(this.editorState);
    this.emitter.emit("transaction", transaction);
    this.emitter.emit("update", this.currentState());
  }

  private bindCommands(record: Readonly<Record<string, Command>>, dryRun: boolean): BoundCommands {
    const bound: Record<string, BoundCommand> = Object.create(null);

    for (const [name, command] of Object.entries(record)) {
      bound[name] = () => {
        if (this.destroyed) {
          return false;
        }

        return command(
          this.currentState(),
          dryRun ? undefined : (transaction) => this.applyTransaction(transaction),
          this.editorView,
        );
      };
    }

    return bound as BoundCommands;
  }

  private currentState(): EditorState {
    if (!this.editorState) {
      throw new Error("Editor state is not available during extension setup.");
    }

    return this.editorState;
  }
}

/** Resolve the codecs, filling in defaults for missing formats. */
function resolveCodecs(options: EditorOptions): Record<ContentType, ContentCodec> {
  return {
    json: options.codecs?.json ?? jsonCodec,
    markdown:
      options.codecs?.markdown ??
      options.markdown ??
      new MarkdownCodec({ extensions: options.extensions }),
    html: options.codecs?.html ?? new HtmlCodec({ extensions: options.extensions }),
  };
}

/** Resolve the initial document from the options. */
function resolveContent(
  content: EditorContent | undefined,
  contentType: EditorContentType | undefined,
  schema: Schema,
  codecs: Record<ContentType, ContentCodec>,
): PmNode {
  if (content === undefined) {
    const doc = schema.topNodeType.createAndFill();

    /* v8 ignore next 3 */
    if (!doc) {
      throw new Error("Could not create an empty document for the assembled schema.");
    }

    return doc;
  }

  if (content instanceof PmNode) {
    return content;
  }

  const type = contentType ?? "json";

  if (type === "json" && typeof content !== "string") {
    return schema.nodeFromJSON(content);
  }

  const codec = codecs[type];

  if (typeof content !== "string") {
    throw new Error(`contentType "${type}" requires string content.`);
  }

  return codec.parse(content, schema);
}

/** Resolve the selection requested by the autofocus option. */
function resolveAutofocusSelection(doc: PmNode, autofocus: Autofocus): Selection | undefined {
  if (autofocus === "start") {
    return Selection.atStart(doc);
  }

  if (autofocus === "end") {
    return Selection.atEnd(doc);
  }

  if (autofocus === "all") {
    return new AllSelection(doc);
  }

  if (typeof autofocus === "number") {
    const position = Math.max(0, Math.min(autofocus, doc.content.size));

    return Selection.near(doc.resolve(position));
  }

  return undefined;
}

/** Resolve a node or mark type from a name or type. */
function resolveType(
  schema: Schema,
  typeOrName: string | NodeOrMarkType,
): MarkType | NodeType | undefined {
  const name = typeof typeOrName === "string" ? typeOrName : typeOrName.name;

  return schema.marks[name] ?? schema.nodes[name];
}

/** Whether a node or mark type is a mark in this schema. */
function isMarkType(schema: Schema, type: NodeOrMarkType): type is MarkType {
  return schema.marks[type.name] === type;
}

/** Marks that apply to the current selection. */
function activeMarks(state: EditorState): readonly Mark[] {
  const { selection } = state;

  if (selection.empty) {
    return state.storedMarks ?? selection.$from.marks();
  }

  const marks: Mark[] = [];

  state.doc.nodesBetween(selection.from, selection.to, (node) => {
    for (const mark of node.marks) {
      if (!marks.some((candidate) => candidate.eq(mark))) {
        marks.push(mark);
      }
    }
  });

  return marks;
}

/** Nodes relevant to the current selection, nearest first. */
function candidateNodes(state: EditorState): readonly PmNode[] {
  const { $from, $to } = state.selection;
  const nodes: PmNode[] = [];

  for (let depth = $from.depth; depth >= 0; depth--) {
    nodes.push($from.node(depth));
  }

  const after = $from.nodeAfter;

  if (after) {
    nodes.push(after);
  }

  if (!$from.sameParent($to)) {
    for (let depth = $to.depth; depth >= 0; depth--) {
      nodes.push($to.node(depth));
    }
  }

  return nodes;
}

/** Whether a value is a node or mark type rather than an attribute filter. */
function isAttributes(
  value: IsActiveTarget | Readonly<Record<string, unknown>>,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !("name" in value && "schema" in value);
}

/** Match ProseMirror attributes against a partial filter. */
function attributesMatch(
  attrs: Readonly<Record<string, unknown>>,
  filter?: Readonly<Record<string, unknown>>,
): boolean {
  if (!filter) {
    return true;
  }

  return Object.entries(filter).every(([name, value]) => attrs[name] === value);
}

/** Read the internal key name from a plugin key. */
function pluginKeyName(key: PluginKey): string | undefined {
  return (key as PluginKey & { readonly key?: string }).key;
}

/** Whether a plugin matches a key object or key name. */
function pluginMatchesKey(plugin: Plugin, key: string | PluginKey): boolean {
  const pluginKey = plugin.spec.key;

  if (!pluginKey) {
    return false;
  }

  if (typeof key !== "string") {
    return pluginKey === key;
  }

  const name = pluginKeyName(pluginKey);

  return name === key || name?.startsWith(`${key}$`) === true;
}

/** Minimal typed emitter for editor events. */
class EditorEmitter {
  private readonly listeners = new Map<keyof EditorEvents, Set<(payload: unknown) => void>>();

  on<Event extends keyof EditorEvents>(
    event: Event,
    listener: (payload: EditorEvents[Event]) => void,
  ): Unsubscribe {
    const bucket = this.listeners.get(event) ?? new Set<(payload: unknown) => void>();
    this.listeners.set(event, bucket);
    bucket.add(listener as (payload: unknown) => void);

    return () => {
      bucket.delete(listener as (payload: unknown) => void);
    };
  }

  emit<Event extends keyof EditorEvents>(event: Event, payload: EditorEvents[Event]): void {
    const bucket = this.listeners.get(event);

    if (!bucket) {
      return;
    }

    for (const listener of bucket) {
      listener(payload);
    }
  }

  clear(): void {
    this.listeners.clear();
  }
}

/** Mutable command registry used while the editor is being assembled. */
class MutableCommandRegistry implements CommandRegistry {
  private readonly commands: Record<string, Command> = Object.create(null);

  get<Name extends keyof Commands>(name: Name): Command | undefined {
    return this.commands[name as string];
  }

  has(name: keyof Commands): boolean {
    return Object.hasOwn(this.commands, name as string);
  }

  keys(): Array<keyof Commands> {
    return Object.keys(this.commands) as Array<keyof Commands>;
  }

  register(commands: Readonly<Record<string, Command>>): void {
    Object.assign(this.commands, commands);
  }
}
