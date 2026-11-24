import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { expect, it } from "vitest";

import { EditorContent } from "./editor-content";
import { EditorRoot } from "./editor-root";
import { extensions } from "./test/fixtures";
import { shallowEqual } from "./shallow-equal";
import { useCurrentEditor } from "./use-current-editor";
import { useEditor, type UseEditorOptions } from "./use-editor";
import { useEditorState } from "./use-editor-state";

let renders = 0;
let snapshotRenders = 0;

function Harness({ children, ...options }: UseEditorOptions & { children: ReactNode }) {
  const editor = useEditor(options);

  return <EditorRoot editor={editor}>{children}</EditorRoot>;
}

function Toolbar() {
  const editor = useCurrentEditor();
  const strong = editor.schema.marks.strong;
  const active = useEditorState((state) =>
    strong ? state.doc.rangeHasMark(state.selection.from, state.selection.to, strong) : false,
  );

  renders += 1;

  return <button aria-pressed={active}>bold</button>;
}

function SnapshotToolbar() {
  const editor = useCurrentEditor();
  const strong = editor.schema.marks.strong;
  const value = useEditorState(
    (state) => ({
      active: strong
        ? state.doc.rangeHasMark(state.selection.from, state.selection.to, strong)
        : false,
    }),
    shallowEqual,
  );

  snapshotRenders += 1;

  return <span>{String(value.active)}</span>;
}

function Typist() {
  const editor = useCurrentEditor();

  return <button onClick={() => editor.dispatch(editor.state.tr.insertText("x"))}>type</button>;
}

it("does not re-render when the selected value is unchanged", () => {
  renders = 0;
  snapshotRenders = 0;

  render(
    <Harness extensions={extensions}>
      <Toolbar />
      <SnapshotToolbar />
      <Typist />
      <EditorContent />
    </Harness>,
  );

  expect(renders).toBe(1);
  expect(snapshotRenders).toBe(1);
  expect(screen.getByRole("button", { name: "bold" })).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(screen.getByRole("button", { name: "type" }));

  expect(renders).toBe(1);
  expect(snapshotRenders).toBe(1);
});
