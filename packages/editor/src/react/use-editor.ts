"use client";

import { useContext } from "react";

import type { Editor } from "../editor";
import { EditorContext } from "./editor-provider";

/** Read the editor from the nearest {@link EditorProvider}. */
export function useEditor(): Editor {
  const editor = useContext(EditorContext);

  if (!editor) {
    throw new Error("useEditor must be used inside an <EditorProvider>.");
  }

  return editor;
}
