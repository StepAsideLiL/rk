"use client";

import { useEffect, useRef } from "react";

import { useCurrentEditor } from "./use-current-editor";

export interface EditorContentProps {
  readonly className?: string;
}

export function EditorContent({ className }: EditorContentProps) {
  const editor = useCurrentEditor();
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
