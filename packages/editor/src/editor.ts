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

export type EditorContent = PmNode | string | { readonly [key: string]: unknown };

export type EditorContentType = ContentType;

export type TextDirection = "ltr" | "rtl" | "auto";

export type Autofocus = "start" | "end" | "all" | number | boolean | null;

export interface CoreExtensionOptions {
  readonly tabindex?: {
    readonly value?: string;
  };
}

export interface TextSerializerContext {
  readonly node: PmNode;
}

export type TextSerializer = (context: TextSerializerContext) => string | false;

export interface GetTextOptions {
  readonly blockSeparator?: string;

  readonly textSerializers?: Readonly<Record<string, TextSerializer>>;
}

export type NodeOrMarkType = NodeType | MarkType;

export type IsActiveTarget = string | NodeOrMarkType | null;

export type CommandChain = {
  readonly [Name in keyof Commands]: () => CommandChain;
} & {
  run(): boolean;
};

export class JsonCodec implements ContentCodec {
  parse(content: string, schema: Schema): PmNode {
    return schema.nodeFromJSON(JSON.parse(content));
  }

  serialize(doc: PmNode): string {
    return JSON.stringify(doc.toJSON());
  }
}

export const jsonCodec: ContentCodec = new JsonCodec();

export interface EditorOptions {
  readonly extensions: readonly Extension<unknown>[];

  readonly schemaSpec?: SchemaSpec;

  readonly content?: EditorContent;

  readonly contentType?: EditorContentType;

  readonly element?: HTMLElement | null;

  readonly editable?: boolean;

  readonly textDirection?: TextDirection;

  readonly autofocus?: Autofocus;

  readonly editorProps?: EditorProps;

  readonly coreExtensionOptions?: CoreExtensionOptions;

  readonly enableInputRules?: boolean | readonly (Extension<unknown> | string)[];

  readonly codecs?: Partial<Record<ContentType, ContentCodec>>;

  readonly markdown?: ContentCodec;
}

export type BoundCommand = () => boolean;

export type BoundCommands = { readonly [Name in keyof Commands]: BoundCommand };

export interface EditorEvents {
  transaction: Transaction;

  update: EditorState;

  destroy: undefined;
}

export type Unsubscribe = () => void;

export const CONTROLLED_UPDATE_META = "rk-editor:controlled-update";

export class Editor {
  readonly schema: Schema;

  readonly commands: BoundCommands;

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

  get view(): EditorView | undefined {
    return this.editorView;
  }

  get state(): EditorState {
    return this.currentState();
  }

  get isEditable(): boolean {
    return this.editable;
  }

  get isEmpty(): boolean {
    return this.currentState().doc.textContent.length === 0;
  }

  get isFocused(): boolean {
    return this.editorView?.hasFocus() ?? false;
  }

  get isDestroyed(): boolean {
    return this.destroyed;
  }

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

  mount = (element: HTMLElement): EditorView => this.createView(element);

  unmount = (): void => {
    this.destroyView();
  };

  destroyView = (): void => {
    this.editorView?.destroy();
    this.editorView = undefined;
  };

  destroy = (): void => {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.destroyView();
    this.emitter.emit("destroy", undefined);
    this.emitter.clear();
  };

  dispatch = (transaction: Transaction): void => {
    this.applyTransaction(transaction);
  };

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

  getMarkdown = (): string => this.codecs.markdown.serialize(this.currentState().doc);

  getHTML = (): string => this.codecs.html.serialize(this.currentState().doc);

  getJSON = (): string => this.codecs.json.serialize(this.currentState().doc);

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

  unregisterPlugin(nameOrPluginKey: string | PluginKey): void {
    if (this.destroyed) {
      return;
    }

    const next = this.currentState().plugins.filter(
      (plugin) => !pluginMatchesKey(plugin, nameOrPluginKey),
    );

    this.replacePlugins(next);
  }

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

  on = <Event extends keyof EditorEvents>(
    event: Event,
    listener: (payload: EditorEvents[Event]) => void,
  ): Unsubscribe => this.emitter.on(event, listener);

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

  private applyViewProps(): void {
    this.editorView?.setProps({
      ...this.viewProps(),
      state: this.currentState(),
      dispatchTransaction: (transaction) => this.applyTransaction(transaction),
    });
  }

  private tabindex(): string | undefined {
    const configured = this.options.coreExtensionOptions?.tabindex?.value;

    if (configured !== undefined) {
      return configured;
    }

    return this.editable ? "0" : undefined;
  }

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

  private replacePlugins(plugins: readonly Plugin[]): void {
    const state = this.currentState().reconfigure({ plugins: [...plugins] });
    this.editorState = state;
    this.editorView?.updateState(state);
  }

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

function resolveType(
  schema: Schema,
  typeOrName: string | NodeOrMarkType,
): MarkType | NodeType | undefined {
  const name = typeof typeOrName === "string" ? typeOrName : typeOrName.name;

  return schema.marks[name] ?? schema.nodes[name];
}

function isMarkType(schema: Schema, type: NodeOrMarkType): type is MarkType {
  return schema.marks[type.name] === type;
}

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

function isAttributes(
  value: IsActiveTarget | Readonly<Record<string, unknown>>,
): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !("name" in value && "schema" in value);
}

function attributesMatch(
  attrs: Readonly<Record<string, unknown>>,
  filter?: Readonly<Record<string, unknown>>,
): boolean {
  if (!filter) {
    return true;
  }

  return Object.entries(filter).every(([name, value]) => attrs[name] === value);
}

function pluginKeyName(key: PluginKey): string | undefined {
  return (key as PluginKey & { readonly key?: string }).key;
}

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
