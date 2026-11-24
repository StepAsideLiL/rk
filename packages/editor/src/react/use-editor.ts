"use client";

import { useEffect, useRef, useState } from "react";

import type { ContentType } from "../core/types";
import { CONTROLLED_UPDATE_META, Editor, type EditorOptions } from "../editor";

export type EditorOutputFormat = ContentType;

export interface UseEditorOptions extends Omit<EditorOptions, "element"> {
  readonly outputFormat?: EditorOutputFormat;

  readonly onChange?: (editor: Editor, output?: string) => void;
}

export function useEditor(options: UseEditorOptions): Editor {
  const initial = useRef(options);
  const [editor] = useState(() => new Editor(initial.current));
  const mounts = useRef(0);

  useEffect(() => {
    mounts.current += 1;

    return () => {
      mounts.current -= 1;
      const instance = editor;

      queueMicrotask(() => {
        if (mounts.current === 0) {
          instance.destroy();
        }
      });
    };
  }, [editor]);

  useEffect(() => {
    if (options.content === undefined) {
      return;
    }

    editor.setContent(options.content, options.contentType);
  }, [editor, options.content, options.contentType]);

  useEffect(() => {
    if (options.editable === undefined) {
      return;
    }

    editor.setEditable(options.editable, false);
  }, [editor, options.editable]);

  useEffect(() => {
    const onChange = options.onChange;

    if (!onChange) {
      return;
    }

    return editor.on("transaction", (transaction) => {
      if (transaction.getMeta(CONTROLLED_UPDATE_META) || !transaction.docChanged) {
        return;
      }

      if (options.outputFormat) {
        onChange(editor, serialize(editor, options.outputFormat));
      } else {
        onChange(editor);
      }
    });
  }, [editor, options.onChange, options.outputFormat]);

  return editor;
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
