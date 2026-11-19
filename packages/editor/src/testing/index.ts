import type { Node as PmNode } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import { createEditor, type Editor } from "../core/create-editor";
import type { Extension } from "../core/types";
import { createMarkdownCodec } from "../markdown/index";

/**
 * Create a headless editor for tests.
 *
 * The markdown codec is built from the same extensions and no element is
 * provided, so the returned editor never touches the DOM.
 */
export function createTestEditor(
  extensions: readonly Extension<unknown>[],
  content?: string,
): Editor {
  const markdown = createMarkdownCodec({ extensions });

  return createEditor({
    extensions,
    markdown,
    ...(content === undefined ? {} : { content, contentType: "markdown" as const }),
  });
}

/** Serialize markdown through the editor and back, checking the document. */
export function roundTrip(extensions: readonly Extension<unknown>[], markdown: string): string {
  const editor = createTestEditor(extensions, markdown);
  editor.state.doc.check();

  return editor.getMarkdown();
}

/** The current document. */
export function docOf(editor: Editor): PmNode {
  return editor.state.doc;
}

/** The current document's text content. */
export function textOf(editor: Editor): string {
  return editor.state.doc.textContent;
}

/**
 * Run the keymap plugins for a key, as the view would.
 *
 * A real view is used when the editor has one; otherwise a minimal view is
 * created with the editor's state and dispatch.
 */
export function press(editor: Editor, key: string): boolean {
  const view = editor.view ?? createMinimalView(editor);
  const event = keyboardEvent(key);

  for (const plugin of editor.state.plugins) {
    const handler = plugin.props.handleKeyDown;

    if (handler?.call(plugin, view, event)) {
      return true;
    }
  }

  return false;
}

/**
 * Feed text through the input rules as if it was typed at the cursor.
 *
 * Falls back to a normal insertion when no rule handles the input.
 */
export function typeText(editor: Editor, text: string): boolean {
  const view = editor.view ?? createMinimalView(editor);
  const from = editor.state.selection.from;
  const to = editor.state.selection.to;
  const plugin = editor.state.plugins.find(
    (candidate) => typeof candidate.props.handleTextInput === "function",
  );
  const handled =
    plugin?.props.handleTextInput?.call(plugin, view, from, to, text, () =>
      editor.state.tr.insertText(text, from, to),
    ) ?? false;

  if (!handled) {
    editor.dispatch(editor.state.tr.insertText(text, from, to));
  }

  return handled;
}

/** Minimal view-shaped object backed by an editor's state and dispatch. */
function createMinimalView(editor: Editor): EditorView {
  const view = {
    state: editor.state,
    dispatch(transaction: Transaction) {
      editor.dispatch(transaction);
      view.state = editor.state;
    },
    composing: false,
    focus() {},
  };

  return view as unknown as EditorView;
}

/** Build a keydown event for a ProseMirror key name such as `Mod-b`. */
function keyboardEvent(name: string): KeyboardEvent {
  const parts = name.split("-");
  const key = parts.pop() ?? name;
  const modifiers = new Set(parts.map((part) => part.toLowerCase()));
  const mac = typeof navigator !== "undefined" && /Mac|iP(hone|[oa]d)/.test(navigator.platform);

  return {
    key,
    ctrlKey: modifiers.has("ctrl") || (modifiers.has("mod") && !mac),
    metaKey: modifiers.has("meta") || (modifiers.has("mod") && mac),
    altKey: modifiers.has("alt"),
    shiftKey: modifiers.has("shift"),
    preventDefault() {},
  } as unknown as KeyboardEvent;
}
