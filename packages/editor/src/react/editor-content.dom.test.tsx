import { render } from "@testing-library/react";
import { EditorView } from "prosemirror-view";
import { StrictMode, type ReactNode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { EditorContent } from "./editor-content";
import { EditorRoot } from "./editor-root";
import { extensions } from "./test/fixtures";
import { useEditor, type UseEditorOptions } from "./use-editor";

afterEach(() => {
  vi.restoreAllMocks();
});

function Harness({ children, ...options }: UseEditorOptions & { children: ReactNode }) {
  const editor = useEditor(options);

  return <EditorRoot editor={editor}>{children}</EditorRoot>;
}

it("mounts one live view in StrictMode and removes it on unmount", () => {
  const destroy = vi.spyOn(EditorView.prototype, "destroy");
  const { container, unmount } = render(
    <StrictMode>
      <Harness extensions={extensions}>
        <EditorContent />
      </Harness>
    </StrictMode>,
  );

  expect(container.querySelectorAll(".ProseMirror")).toHaveLength(1);

  unmount();

  expect(container.innerHTML).toBe("");
  expect(destroy).toHaveBeenCalled();
});
