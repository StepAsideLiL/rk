import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { EditorContent } from "./editor-content";
import { EditorProvider } from "./editor-provider";
import { extensions } from "./test/fixtures";
import { shallowEqual } from "./shallow-equal";
import { useEditor } from "./use-editor";
import { useEditorState } from "./use-editor-state";

let renders = 0;
let snapshotRenders = 0;

function Toolbar() {
  const editor = useEditor();
  const strong = editor.schema.marks.strong;
  const active = useEditorState((state) =>
    strong ? state.doc.rangeHasMark(state.selection.from, state.selection.to, strong) : false,
  );

  renders += 1;

  return <button aria-pressed={active}>bold</button>;
}

function SnapshotToolbar() {
  const editor = useEditor();
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
  const editor = useEditor();

  return <button onClick={() => editor.dispatch(editor.state.tr.insertText("x"))}>type</button>;
}

it("does not re-render when the selected value is unchanged", () => {
  renders = 0;
  snapshotRenders = 0;

  render(
    <EditorProvider extensions={extensions}>
      <Toolbar />
      <SnapshotToolbar />
      <Typist />
      <EditorContent />
    </EditorProvider>,
  );

  expect(renders).toBe(1);
  expect(snapshotRenders).toBe(1);
  expect(screen.getByRole("button", { name: "bold" })).toHaveAttribute("aria-pressed", "false");

  fireEvent.click(screen.getByRole("button", { name: "type" }));

  expect(renders).toBe(1);
  expect(snapshotRenders).toBe(1);
});
