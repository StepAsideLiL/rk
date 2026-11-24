"use client";

import { createContext, type ReactNode } from "react";

import type { Editor } from "../editor";

export interface EditorRootProps {
  readonly editor: Editor;

  readonly children?: ReactNode;
}

export const EditorContext = createContext<Editor | null>(null);

export function EditorRoot({ editor, children }: EditorRootProps) {
  return <EditorContext.Provider value={editor}>{children}</EditorContext.Provider>;
}
