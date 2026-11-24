"use client";

import { useContext } from "react";

import type { Editor } from "../editor";
import { EditorContext } from "./editor-root";

export function useCurrentEditor(): Editor {
  const editor = useContext(EditorContext);

  if (!editor) {
    throw new Error("useCurrentEditor must be used inside an <EditorRoot>.");
  }

  return editor;
}
