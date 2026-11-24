"use client";

import { useCallback, useRef, useSyncExternalStore } from "react";
import type { EditorState } from "prosemirror-state";

import { useCurrentEditor } from "./use-current-editor";

export function useEditorState<T>(
  selector: (state: EditorState) => T,
  isEqual: (left: T, right: T) => boolean = Object.is,
): T {
  const editor = useCurrentEditor();
  const selectorRef = useRef(selector);
  const equalRef = useRef(isEqual);
  selectorRef.current = selector;
  equalRef.current = isEqual;

  const valueRef = useRef<{ value: T } | null>(null);

  const read = useCallback(() => {
    const next = selectorRef.current(editor.state);

    if (!valueRef.current || !equalRef.current(valueRef.current.value, next)) {
      valueRef.current = { value: next };
    }

    return valueRef.current.value;
  }, [editor]);

  const subscribe = useCallback(
    (notify: () => void) =>
      editor.on("update", () => {
        const next = selectorRef.current(editor.state);

        if (!valueRef.current || !equalRef.current(valueRef.current.value, next)) {
          valueRef.current = { value: next };
          notify();
        }
      }),
    [editor],
  );

  return useSyncExternalStore(subscribe, read, read);
}
