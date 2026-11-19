import { fireEvent, render, screen } from "@testing-library/react";
import { TextSelection } from "prosemirror-state";
import { expect, it, vi } from "vitest";

import { EditorContent } from "./editor-content";
import { EditorProvider } from "./editor-provider";
import { extensions, jsonDoc } from "./fixtures.test-utils";
import { useEditor } from "./use-editor";
import { useEditorState } from "./use-editor-state";

function Actions() {
  const editor = useEditor();

  return (
    <button
      onClick={() => {
        editor.dispatch(editor.state.tr.insertText("a"));
        editor.dispatch(editor.state.tr.setSelection(TextSelection.create(editor.state.doc, 1)));
      }}
    >
      change
    </button>
  );
}

function Reader() {
  const text = useEditorState((state) => state.doc.textContent);

  return <output>{text}</output>;
}

it("fires onChange once per document change and not for selections", () => {
  const onChange = vi.fn();

  render(
    <EditorProvider extensions={extensions} onChange={onChange}>
      <Actions />
      <EditorContent />
    </EditorProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "change" }));

  expect(onChange).toHaveBeenCalledTimes(1);
});

it("updates controlled content without echoing onChange", () => {
  const onChange = vi.fn();
  const tree = (text: string) => (
    <EditorProvider extensions={extensions} content={jsonDoc(text)} onChange={onChange}>
      <Reader />
      <EditorContent />
    </EditorProvider>
  );

  const { rerender } = render(tree("one"));

  expect(screen.getByRole("status")).toHaveTextContent("one");

  rerender(tree("two"));

  expect(screen.getByRole("status")).toHaveTextContent("two");
  expect(onChange).not.toHaveBeenCalled();
});
