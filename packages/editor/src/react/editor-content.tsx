"use client";

import { useEffect, useRef } from "react";

import { useEditor } from "./use-editor";

/** Props for {@link EditorContent}. */
export interface EditorContentProps {
  readonly className?: string;
}

/**
 * Mount the ProseMirror view into a React-managed element.
 *
 * The view is created in an effect and destroyed on cleanup, so React never
 * observes a half-mounted editor.
 */
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
