"use client";

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";

import {
  CONTROLLED_UPDATE_META,
  createEditor,
  type Editor,
  type EditorContent as EditorContentValue,
  type EditorContentType,
} from "../core/create-editor";
import type { Extension, MarkdownCodec } from "../core/types";

/** Props for {@link EditorProvider}. */
export interface EditorProviderProps {
  /** Extensions used to create the editor. Read once on mount. */
  readonly extensions: readonly Extension<unknown>[];

  /** Initial document, or a controlled value when it changes. */
  readonly content?: EditorContentValue;

  /** Interpretation of string content. Defaults to `"json"`. */
  readonly contentType?: EditorContentType;

  /** Markdown codec from `createMarkdownCodec`, required for markdown. */
  readonly markdown?: MarkdownCodec;

  /** Called once per document-changing transaction from the editor itself. */
  readonly onChange?: (editor: Editor) => void;

  readonly children?: ReactNode;
}

/** Internal editor context. Use {@link useEditor}. */
export const EditorContext = createContext<Editor | null>(null);

/**
 * Create the editor outside React's render cycle and provide it to children.
 *
 * The editor is created in an effect so StrictMode's double mount produces one
 * live instance. The ProseMirror view is created separately by
 * {@link EditorContent}.
 */
export function EditorProvider({
  extensions,
  content,
  contentType,
  markdown,
  onChange,
  children,
}: EditorProviderProps) {
  const initial = useRef({ extensions, content, contentType, markdown });
  const [editor, setEditor] = useState<Editor | null>(null);

  useEffect(() => {
    const instance = createEditor(initial.current);

    setEditor(instance);

    return () => {
      instance.destroy();
      setEditor((current) => (current === instance ? null : current));
    };
  }, []);

  useEffect(() => {
    if (!editor || content === undefined) {
      return;
    }

    editor.setContent(content, contentType);
  }, [editor, content, contentType]);

  useEffect(() => {
    if (!editor || !onChange) {
      return;
    }

    return editor.on("transaction", (transaction) => {
      if (transaction.getMeta(CONTROLLED_UPDATE_META)) {
        return;
      }

      if (!transaction.docChanged) {
        return;
      }

      onChange(editor);
    });
  }, [editor, onChange]);

  return <EditorContext.Provider value={editor}>{editor ? children : null}</EditorContext.Provider>;
}
