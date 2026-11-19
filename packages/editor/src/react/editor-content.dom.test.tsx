import { render } from "@testing-library/react";
import { EditorView } from "prosemirror-view";
import { StrictMode } from "react";
import { afterEach, expect, it, vi } from "vitest";

import { EditorContent } from "./editor-content";
import { EditorProvider } from "./editor-provider";
import { extensions } from "./fixtures.test-utils";

afterEach(() => {
  vi.restoreAllMocks();
});

it("mounts one live view in StrictMode and removes it on unmount", () => {
  const destroy = vi.spyOn(EditorView.prototype, "destroy");
  const { container, unmount } = render(
    <StrictMode>
      <EditorProvider extensions={extensions}>
        <EditorContent />
      </EditorProvider>
    </StrictMode>,
  );

  expect(container.querySelectorAll(".ProseMirror")).toHaveLength(1);

  unmount();

  expect(container.innerHTML).toBe("");
  expect(destroy).toHaveBeenCalled();
});
