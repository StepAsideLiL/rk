"use client";

import { useContext } from "react";

import type { Editor } from "../editor";
import { EditorContext } from "./editor-provider";

export function useEditor(): Editor {
  const editor = useContext(EditorContext);

  if (!editor) {
    throw new Error("useEditor must be used inside an <EditorProvider>.");
  }

  return editor;
}
