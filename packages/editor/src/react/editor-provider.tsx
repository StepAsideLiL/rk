"use client";

import { createContext, useEffect, useRef, useState, type ReactNode } from "react";

import {
  CONTROLLED_UPDATE_META,
  type EditorContent as EditorContentValue,
  type EditorContentType,
} from "../editor";
import type { ContentCodec, ContentType, Extension } from "../core/types";
import { Editor } from "../editor";

export type EditorOutputFormat = ContentType;

export interface EditorProviderProps {
  readonly extensions: readonly Extension<unknown>[];

  readonly content?: EditorContentValue;

  readonly contentType?: EditorContentType;

  readonly markdown?: ContentCodec;

  readonly codecs?: Partial<Record<ContentType, ContentCodec>>;

  readonly outputFormat?: EditorOutputFormat;

  readonly onChange?: (editor: Editor, output?: string) => void;

  readonly children?: ReactNode;
}

export const EditorContext = createContext<Editor | null>(null);

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
    const instance = new Editor(initial.current);

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
