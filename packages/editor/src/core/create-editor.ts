import type { Schema } from "prosemirror-model";
import { Node as PmNode } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { createExtensionManager } from "./extension-manager";
import type {
  Command,
  CommandRegistry,
  Commands,
  ContentCodec,
  ContentType,
  Extension,
  ExtensionContext,
  MarkdownCodec,
} from "./types";

/** Content accepted by {@link createEditor}. */
export type EditorContent = PmNode | string | { readonly [key: string]: unknown };

/** How string content should be interpreted. */
export type EditorContentType = ContentType;

/** JSON codec used when no custom one is injected. */
export const jsonCodec: ContentCodec = {
  parse(content, schema) {
    return schema.nodeFromJSON(JSON.parse(content));
  },
  serialize(doc) {
    return JSON.stringify(doc.toJSON());
  },
};

/** Options accepted by {@link createEditor}. */
export interface CreateEditorOptions {
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
   * for {@link Editor.getMarkdown}; core never imports that module directly.
   *
   * Kept for backward compatibility; `codecs.markdown` takes precedence.
   */
  readonly markdown?: MarkdownCodec;
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

/** A live editor instance. */
export interface Editor {
  /** The mounted ProseMirror view, or `undefined` in headless mode. */
  readonly view: EditorView | undefined;

  /** The current editor state. */
  readonly state: EditorState;

  /** The schema assembled from the extensions. */
  readonly schema: Schema;

  /** Commands that dispatch against the current state. */
  readonly commands: BoundCommands;

  /** Dry-run versions of the commands: they never dispatch. */
  readonly can: BoundCommands;

  /** Create and mount a view for this editor, replacing any existing view. */
  createView(element: HTMLElement): EditorView;

  /** Destroy the attached view without destroying the editor itself. */
  destroyView(): void;

  /** Destroy the view and release every listener and plugin resource. */
  destroy(): void;

  /** Apply a transaction to the editor, updating state and view. */
  dispatch(transaction: Transaction): void;

  /** Serialize the current document to markdown using the injected codec. */
  getMarkdown(): string;

  /** Serialize the current document to HTML using the injected codec. */
  getHTML(): string;

  /** Serialize the current document to JSON. */
  getJSON(): string;

  /**
   * Replace the document from outside the editor.
   *
   * Skips no-op updates and marks the transaction with
   * {@link CONTROLLED_UPDATE_META}, so controlled React content does not echo
   * back through `onChange`.
   */
  setContent(content: EditorContent, contentType?: EditorContentType): void;

  /** Subscribe to an editor event. Returns an unsubscribe function. */
  on<Event extends keyof EditorEvents>(
    event: Event,
    listener: (payload: EditorEvents[Event]) => void,
  ): Unsubscribe;
}

/**
 * Create an editor from a set of extensions.
 *
 * The ProseMirror view is only created when `element` is provided, so the same
 * factory works in Node for tests and on the server.
 */
export function createEditor(options: CreateEditorOptions): Editor {
  const manager = createExtensionManager(options.extensions);
  const emitter = createEmitter();
  const registry = createCommandRegistry();
  const codecs = resolveCodecs(options);

  let state: EditorState | undefined;
  let view: EditorView | undefined;
  let destroyed = false;

  const currentState = (): EditorState => {
    if (!state) {
      throw new Error("Editor state is not available during extension setup.");
    }

    return state;
  };

  const context: ExtensionContext = {
    schema: manager.schema,
    getState: currentState,
    getView: () => view,
    commands: registry,
  };

  const contributed = manager.createCommands(context);
  registry.register(contributed);

  const plugins = manager.createPlugins(context);
  const doc = resolveContent(options.content, options.contentType, manager.schema, codecs);
  state = EditorState.create({ schema: manager.schema, doc, plugins });

  if (options.element) {
    createView(options.element);
  }

  const commands = bindCommands(contributed, false);
  const can = bindCommands(contributed, true);

  function applyTransaction(transaction: Transaction): void {
    if (destroyed) {
      return;
    }

    state = currentState().apply(transaction);
    view?.updateState(state);
    emitter.emit("transaction", transaction);
    emitter.emit("update", currentState());
  }

  function bindCommands(record: Readonly<Record<string, Command>>, dryRun: boolean): BoundCommands {
    const bound: Record<string, BoundCommand> = Object.create(null);

    for (const [name, command] of Object.entries(record)) {
      bound[name] = () => {
        if (destroyed) {
          return false;
        }

        return command(currentState(), dryRun ? undefined : applyTransaction, view);
      };
    }

    return bound as BoundCommands;
  }

  function destroy(): void {
    if (destroyed) {
      return;
    }

    destroyed = true;
    destroyView();
    emitter.emit("destroy", undefined);
    emitter.clear();
  }

  function createView(element: HTMLElement): EditorView {
    if (destroyed) {
      throw new Error("Cannot create a view for a destroyed editor.");
    }

    view?.destroy();
    view = new EditorView(element, {
      state: currentState(),
      dispatchTransaction: (transaction) => applyTransaction(transaction),
      nodeViews: manager.nodeViews,
    });

    return view;
  }

  function destroyView(): void {
    view?.destroy();
    view = undefined;
  }

  function setContent(next: EditorContent, nextType?: EditorContentType): void {
    if (destroyed) {
      return;
    }

    const nextDoc = resolveContent(next, nextType, manager.schema, codecs);

    if (nextDoc.eq(currentState().doc)) {
      return;
    }

    const transaction = currentState().tr.replaceWith(
      0,
      currentState().doc.content.size,
      nextDoc.content,
    );
    transaction.setMeta(CONTROLLED_UPDATE_META, true);
    applyTransaction(transaction);
  }

  function getMarkdown(): string {
    return codecFor(codecs, "markdown").serialize(currentState().doc);
  }

  function getHTML(): string {
    return codecFor(codecs, "html").serialize(currentState().doc);
  }

  function getJSON(): string {
    return codecFor(codecs, "json").serialize(currentState().doc);
  }

  return {
    get view() {
      return view;
    },
    get state() {
      return currentState();
    },
    schema: manager.schema,
    commands,
    can,
    createView,
    destroy,
    destroyView,
    dispatch: applyTransaction,
    getMarkdown,
    getHTML,
    getJSON,
    setContent,
    on: emitter.on,
  };
}

/** Resolve the codecs, honoring the legacy `markdown` option. */
function resolveCodecs(options: CreateEditorOptions): Partial<Record<ContentType, ContentCodec>> {
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
    throw new Error(`No ${type} codec was provided to createEditor. Pass it in options.codecs.`);
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
function createEmitter() {
  const listeners = new Map<keyof EditorEvents, Set<(payload: unknown) => void>>();

  function on<Event extends keyof EditorEvents>(
    event: Event,
    listener: (payload: EditorEvents[Event]) => void,
  ): Unsubscribe {
    const bucket = listeners.get(event) ?? new Set<(payload: unknown) => void>();
    listeners.set(event, bucket);
    bucket.add(listener as (payload: unknown) => void);

    return () => {
      bucket.delete(listener as (payload: unknown) => void);
    };
  }

  function emit<Event extends keyof EditorEvents>(
    event: Event,
    payload: EditorEvents[Event],
  ): void {
    const bucket = listeners.get(event);

    if (!bucket) {
      return;
    }

    for (const listener of bucket) {
      listener(payload);
    }
  }

  function clear(): void {
    listeners.clear();
  }

  return { on, emit, clear };
}

/** Mutable registry used while the editor is being assembled. */
interface MutableCommandRegistry extends CommandRegistry {
  register(commands: Readonly<Record<string, Command>>): void;
}

/** Create the typed command registry backed by a plain object. */
function createCommandRegistry(): MutableCommandRegistry {
  const commands: Record<string, Command> = Object.create(null);

  return {
    get<Name extends keyof Commands>(name: Name): Command | undefined {
      return commands[name as string];
    },
    has(name: keyof Commands): boolean {
      return Object.hasOwn(commands, name as string);
    },
    keys(): Array<keyof Commands> {
      return Object.keys(commands) as Array<keyof Commands>;
    },
    register(next) {
      Object.assign(commands, next);
    },
  };
}
