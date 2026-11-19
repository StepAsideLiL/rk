import type { Schema } from "prosemirror-model";
import { Node as PmNode } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import { EditorState } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import { createExtensionManager } from "./extension-manager";
import type { Command, CommandRegistry, Commands, Extension, ExtensionContext } from "./types";

/** Content accepted by {@link createEditor}. */
export type EditorContent = PmNode | string | { readonly [key: string]: unknown };

/** How string content should be interpreted. */
export type EditorContentType = "json" | "markdown";

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

  /** Destroy the view and release every listener and plugin resource. */
  destroy(): void;

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
  const doc = resolveContent(options.content, options.contentType, manager.schema);
  state = EditorState.create({ schema: manager.schema, doc, plugins });

  if (options.element) {
    view = new EditorView(options.element, {
      state,
      dispatchTransaction: (transaction) => applyTransaction(transaction),
      nodeViews: manager.nodeViews,
    });
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
    view?.destroy();
    view = undefined;
    emitter.emit("destroy", undefined);
    emitter.clear();
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
    destroy,
    on: emitter.on,
  };
}

/** Resolve the initial document from the options. */
function resolveContent(
  content: EditorContent | undefined,
  contentType: EditorContentType | undefined,
  schema: Schema,
): PmNode {
  if (content === undefined) {
    const doc = schema.topNodeType.createAndFill();

    if (!doc) {
      throw new Error("Could not create an empty document for the assembled schema.");
    }

    return doc;
  }

  if (content instanceof PmNode) {
    return content;
  }

  if ((contentType ?? "json") === "markdown") {
    throw new Error("Markdown content is not parsed by core yet. Pass JSON or a ProseMirror node.");
  }

  return schema.nodeFromJSON(typeof content === "string" ? JSON.parse(content) : content);
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
