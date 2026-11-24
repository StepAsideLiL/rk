import type { Node as PmNode } from "prosemirror-model";
import type { Transaction } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";

import type { Extension } from "../core/types";
import { Editor } from "../editor";
import { MarkdownCodec } from "../markdown/codec";

export function createTestEditor(
  extensions: readonly Extension<unknown>[],
  content?: string,
): Editor {
  const markdown = new MarkdownCodec({ extensions });

  return new Editor({
    extensions,
    markdown,
    ...(content === undefined ? {} : { content, contentType: "markdown" as const }),
  });
}

export function roundTrip(extensions: readonly Extension<unknown>[], markdown: string): string {
  const editor = createTestEditor(extensions, markdown);
  editor.state.doc.check();

  return editor.getMarkdown();
}

export function docOf(editor: Editor): PmNode {
  return editor.state.doc;
}

export function textOf(editor: Editor): string {
  return editor.state.doc.textContent;
}

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
