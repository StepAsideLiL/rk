import type { Schema } from "prosemirror-model";
import { Node as PmNode } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { ExtensionManager } from "./extension-manager";
import type {
  Command,
  CommandRegistry,
  Commands,
  ContentCodec,
  ContentType,
  Extension,
  ExtensionContext,
} from "./types";

/** Content accepted by {@link EditorCore}. */
export type EditorContent = PmNode | string | { readonly [key: string]: unknown };

/** How string content should be interpreted. */
export type EditorContentType = ContentType;

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

/** Options accepted by {@link EditorCore}. */
export interface EditorOptions {
  /** Extensions to assemble, in any order. */
  readonly extensions: readonly Extension<unknown>[];

  /** Initial document. Defaults to an empty document from the schema. */
  readonly content?: EditorContent;

  /** Interpretation of string content. Defaults to `"json"`. */
  readonly contentType?: EditorContentType;

  /** Mount the editable view into this element. Omit for headless use. */
  readonly element?: HTMLElement;

  /**
   * Codecs keyed by content type. Core never imports a codec implementation.
   *
   * JSON always has a built-in codec; markdown and HTML must be injected.
   */
  readonly codecs?: Partial<Record<ContentType, ContentCodec>>;

  /**
   * Markdown codec from the markdown module. Required for markdown content and
   * for {@link EditorCore.getMarkdown}; core never imports that module directly.
   *
   * Kept for backward compatibility; `codecs.markdown` takes precedence.
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

/** Removes a listener previously registered with {@link EditorCore.on}. */
export type Unsubscribe = () => void;

/** Transaction meta key for content set from outside the editor. */
export const CONTROLLED_UPDATE_META = "rk-editor:controlled-update";

/**
 * Codec-injected editor implementation.
 *
 * The ProseMirror view is only created when `element` is provided, so the same
 * class works in Node for tests and on the server.
 */
export class EditorCore {
  /** The schema assembled from the extensions. */
  readonly schema: Schema;

  /** Commands that dispatch against the current state. */
  readonly commands: BoundCommands;

  /** Dry-run versions of the commands: they never dispatch. */
  readonly can: BoundCommands;

  readonly #manager: ExtensionManager;
  readonly #emitter: EditorEmitter;
  readonly #registry: MutableCommandRegistry;
  readonly #codecs: Partial<Record<ContentType, ContentCodec>>;
  #state: EditorState | undefined;
  #view: EditorView | undefined;
  #destroyed = false;

  constructor(options: EditorOptions) {
    this.#manager = new ExtensionManager(options.extensions);
    this.#emitter = new EditorEmitter();
    this.#registry = new MutableCommandRegistry();
    this.#codecs = resolveCodecs(options);
    this.schema = this.#manager.schema;

    const context: ExtensionContext = {
      schema: this.schema,
      getState: () => this.#currentState(),
      getView: () => this.#view,
      commands: this.#registry,
    };

    const contributed = this.#manager.createCommands(context);
    this.#registry.register(contributed);

    const plugins = this.#manager.createPlugins(context);
    const doc = resolveContent(options.content, options.contentType, this.schema, this.#codecs);
    this.#state = EditorState.create({ schema: this.schema, doc, plugins });

    if (options.element) {
      this.createView(options.element);
    }

    this.commands = this.#bindCommands(contributed, false);
    this.can = this.#bindCommands(contributed, true);
  }

  /** The mounted ProseMirror view, or `undefined` in headless mode. */
  get view(): EditorView | undefined {
    return this.#view;
  }

  /** The current editor state. */
  get state(): EditorState {
    return this.#currentState();
  }

  /** Create and mount a view for this editor, replacing any existing view. */
  createView = (element: HTMLElement): EditorView => {
    if (this.#destroyed) {
      throw new Error("Cannot create a view for a destroyed editor.");
    }

    this.#view?.destroy();
    this.#view = new EditorView(element, {
      state: this.#currentState(),
      dispatchTransaction: (transaction) => this.#applyTransaction(transaction),
      nodeViews: this.#manager.nodeViews,
    });

    return this.#view;
  };

  /** Destroy the attached view without destroying the editor itself. */
  destroyView = (): void => {
    this.#view?.destroy();
    this.#view = undefined;
  };

  /** Destroy the view and release every listener and plugin resource. */
  destroy = (): void => {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.destroyView();
    this.#emitter.emit("destroy", undefined);
    this.#emitter.clear();
  };

  /** Apply a transaction to the editor, updating state and view. */
  dispatch = (transaction: Transaction): void => {
    this.#applyTransaction(transaction);
  };

  /** Serialize the current document to markdown using the injected codec. */
  getMarkdown = (): string =>
    codecFor(this.#codecs, "markdown").serialize(this.#currentState().doc);

  /** Serialize the current document to HTML using the injected codec. */
  getHTML = (): string => codecFor(this.#codecs, "html").serialize(this.#currentState().doc);

  /** Serialize the current document to JSON. */
  getJSON = (): string => codecFor(this.#codecs, "json").serialize(this.#currentState().doc);

  /**
   * Replace the document from outside the editor.
   *
   * Skips no-op updates and marks the transaction with
   * {@link CONTROLLED_UPDATE_META}, so controlled React content does not echo
   * back through `onChange`.
   */
  setContent = (content: EditorContent, contentType?: EditorContentType): void => {
    if (this.#destroyed) {
      return;
    }

    const nextDoc = resolveContent(content, contentType, this.schema, this.#codecs);

    if (nextDoc.eq(this.#currentState().doc)) {
      return;
    }

    const transaction = this.#currentState().tr.replaceWith(
      0,
      this.#currentState().doc.content.size,
      nextDoc.content,
    );
    transaction.setMeta(CONTROLLED_UPDATE_META, true);
    this.#applyTransaction(transaction);
  };

  /** Subscribe to an editor event. Returns an unsubscribe function. */
  on = <Event extends keyof EditorEvents>(
    event: Event,
    listener: (payload: EditorEvents[Event]) => void,
  ): Unsubscribe => this.#emitter.on(event, listener);

  #applyTransaction(transaction: Transaction): void {
    if (this.#destroyed) {
      return;
    }

    this.#state = this.#currentState().apply(transaction);
    this.#view?.updateState(this.#state);
    this.#emitter.emit("transaction", transaction);
    this.#emitter.emit("update", this.#currentState());
  }

  #bindCommands(record: Readonly<Record<string, Command>>, dryRun: boolean): BoundCommands {
    const bound: Record<string, BoundCommand> = Object.create(null);

    for (const [name, command] of Object.entries(record)) {
      bound[name] = () => {
        if (this.#destroyed) {
          return false;
        }

        return command(
          this.#currentState(),
          dryRun ? undefined : (transaction) => this.#applyTransaction(transaction),
          this.#view,
        );
      };
    }

    return bound as BoundCommands;
  }

  #currentState(): EditorState {
    if (!this.#state) {
      throw new Error("Editor state is not available during extension setup.");
    }

    return this.#state;
  }
}

/** Resolve the codecs, honoring the legacy `markdown` option. */
function resolveCodecs(options: EditorOptions): Partial<Record<ContentType, ContentCodec>> {
  return {
    json: options.codecs?.json ?? jsonCodec,
    markdown: options.codecs?.markdown ?? options.markdown,
    html: options.codecs?.html,
  };
}

/** Return the codec for a format or throw a clear error. */
function codecFor(
  codecs: Partial<Record<ContentType, ContentCodec>>,
  type: ContentType,
): ContentCodec {
  const codec = codecs[type];

  if (!codec) {
    throw new Error(`No ${type} codec was provided to the editor. Pass it in options.codecs.`);
  }

  return codec;
}

/** Resolve the initial document from the options. */
function resolveContent(
  content: EditorContent | undefined,
  contentType: EditorContentType | undefined,
  schema: Schema,
  codecs: Partial<Record<ContentType, ContentCodec>>,
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

  if (!codec) {
    throw new Error(`contentType "${type}" requires a ${type} codec.`);
  }

  if (typeof content !== "string") {
    throw new Error(`contentType "${type}" requires string content.`);
  }

  return codec.parse(content, schema);
}

/** Minimal typed emitter for editor events. */
class EditorEmitter {
  readonly #listeners = new Map<keyof EditorEvents, Set<(payload: unknown) => void>>();

  on<Event extends keyof EditorEvents>(
    event: Event,
    listener: (payload: EditorEvents[Event]) => void,
  ): Unsubscribe {
    const bucket = this.#listeners.get(event) ?? new Set<(payload: unknown) => void>();
    this.#listeners.set(event, bucket);
    bucket.add(listener as (payload: unknown) => void);

    return () => {
      bucket.delete(listener as (payload: unknown) => void);
    };
  }

  emit<Event extends keyof EditorEvents>(event: Event, payload: EditorEvents[Event]): void {
    const bucket = this.#listeners.get(event);

    if (!bucket) {
      return;
    }

    for (const listener of bucket) {
      listener(payload);
    }
  }

  clear(): void {
    this.#listeners.clear();
  }
}

/** Mutable command registry used while the editor is being assembled. */
class MutableCommandRegistry implements CommandRegistry {
  readonly #commands: Record<string, Command> = Object.create(null);

  get<Name extends keyof Commands>(name: Name): Command | undefined {
    return this.#commands[name as string];
  }

  has(name: keyof Commands): boolean {
    return Object.hasOwn(this.#commands, name as string);
  }

  keys(): Array<keyof Commands> {
    return Object.keys(this.#commands) as Array<keyof Commands>;
  }

  register(commands: Readonly<Record<string, Command>>): void {
    Object.assign(this.#commands, commands);
  }
}
