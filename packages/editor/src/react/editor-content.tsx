"use client";

import { useEffect, useRef } from "react";

import { useEditor } from "./use-editor";

export interface EditorContentProps {
  readonly className?: string;
}

export function EditorContent({ className }: EditorContentProps) {
  const editor = useEditor();
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = container.current;

    if (!element) {
      return;
    }

    editor.createView(element);

    return () => {
      editor.destroyView();
    };
  }, [editor]);

  return <div ref={container} className={className} />;
}
