import { fireEvent, render, screen } from "@testing-library/react";
import { TextSelection } from "prosemirror-state";
import type { ReactNode } from "react";
import { expect, it, vi } from "vitest";

import { EditorContent } from "./editor-content";
import { EditorRoot } from "./editor-root";
import { extensions, jsonDoc } from "./test/fixtures";
import { useCurrentEditor } from "./use-current-editor";
import { useEditor, type UseEditorOptions } from "./use-editor";
import { useEditorState } from "./use-editor-state";

function Harness({ children, ...options }: UseEditorOptions & { children: ReactNode }) {
  const editor = useEditor(options);

  return <EditorRoot editor={editor}>{children}</EditorRoot>;
}

function Actions() {
  const editor = useCurrentEditor();

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
    <Harness extensions={extensions} onChange={onChange}>
      <Actions />
      <EditorContent />
    </Harness>,
  );

  fireEvent.click(screen.getByRole("button", { name: "change" }));

  expect(onChange).toHaveBeenCalledTimes(1);
});

it("updates controlled content without echoing onChange", () => {
  const onChange = vi.fn();
  const tree = (text: string) => (
    <Harness extensions={extensions} content={jsonDoc(text)} onChange={onChange}>
      <Reader />
      <EditorContent />
    </Harness>
  );

  const { rerender } = render(tree("one"));

  expect(screen.getByRole("status")).toHaveTextContent("one");

  rerender(tree("two"));

  expect(screen.getByRole("status")).toHaveTextContent("two");
  expect(onChange).not.toHaveBeenCalled();
});

it("renders sanitized initial HTML content", () => {
  render(
    <Harness
      extensions={extensions}
      content={"<p>html <strong>bold</strong></p><script>alert(1)</script>"}
      contentType="html"
    >
      <Reader />
      <EditorContent />
    </Harness>,
  );

  expect(screen.getByRole("status")).toHaveTextContent("html bold");
  expect(document.querySelector("script")).toBeNull();
});

it("passes sanitized HTML to onChange when outputFormat is set", () => {
  const onChange = vi.fn();

  render(
    <Harness extensions={extensions} outputFormat="html" onChange={onChange}>
      <Actions />
      <EditorContent />
    </Harness>,
  );

  fireEvent.click(screen.getByRole("button", { name: "change" }));

  expect(onChange).toHaveBeenCalledWith(expect.anything(), "<p>a</p>");
});

it("updates controlled HTML content without echoing onChange", () => {
  const onChange = vi.fn();
  const tree = (text: string) => (
    <Harness
      extensions={extensions}
      content={`<p>${text}</p>`}
      contentType="html"
      onChange={onChange}
    >
      <Reader />
      <EditorContent />
    </Harness>
  );

  const { rerender } = render(tree("one"));

  expect(screen.getByRole("status")).toHaveTextContent("one");

  rerender(tree("two"));

  expect(screen.getByRole("status")).toHaveTextContent("two");
  expect(onChange).not.toHaveBeenCalled();
});
