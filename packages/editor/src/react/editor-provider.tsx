"use client";

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";

import {
  CONTROLLED_UPDATE_META,
  type Editor,
  type EditorContent as EditorContentValue,
  type EditorContentType,
} from "../core/create-editor";
import type { ContentCodec, ContentType, Extension, MarkdownCodec } from "../core/types";
import { createEditor } from "../editor";

/** Serialized format passed to `onChange` when `outputFormat` is set. */
export type EditorOutputFormat = ContentType;

/** Props for {@link EditorProvider}. */
export interface EditorProviderProps {
  /** Extensions used to create the editor. Read once on mount. */
  readonly extensions: readonly Extension<unknown>[];

  /** Initial document, or a controlled value when it changes. */
  readonly content?: EditorContentValue;

  /** Interpretation of string content. Defaults to `"json"`. */
  readonly contentType?: EditorContentType;

  /** Markdown codec from `createMarkdownCodec`, kept for compatibility. */
  readonly markdown?: MarkdownCodec;

  /** Optional codec overrides keyed by content type. */
  readonly codecs?: Partial<Record<ContentType, ContentCodec>>;

  /**
   * Serialized format passed as the second `onChange` argument.
   *
   * When omitted, `onChange` keeps its original `(editor) => void` behavior.
   */
  readonly outputFormat?: EditorOutputFormat;

  /**
   * Called once per document-changing transaction from the editor itself.
   *
   * The second argument is set only when `outputFormat` is provided.
   */
  readonly onChange?: (editor: Editor, output?: string) => void;

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
  codecs,
  outputFormat,
  onChange,
  children,
}: EditorProviderProps) {
  const initial = useRef({ extensions, content, contentType, markdown, codecs });
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

      if (outputFormat) {
        onChange(editor, serialize(editor, outputFormat));
      } else {
        onChange(editor);
      }
    });
  }, [editor, onChange, outputFormat]);

  return <EditorContext.Provider value={editor}>{editor ? children : null}</EditorContext.Provider>;
}

/** Serialize the editor in the requested output format. */
function serialize(editor: Editor, format: EditorOutputFormat): string {
  switch (format) {
    case "html":
      return editor.getHTML();
    case "json":
      return editor.getJSON();
    case "markdown":
      return editor.getMarkdown();
  }
}
