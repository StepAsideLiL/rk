import { act } from "@testing-library/react";
import { DecorationSet, type NodeView, type EditorView } from "prosemirror-view";
import { expect, it } from "vitest";

import { ExtensionManager } from "../core/extension-manager";
import { StarterKit } from "../extensions/index";
import { createReactNodeView, type ReactNodeViewProps } from "./react-node-view";

const manager = new ExtensionManager([StarterKit()]);

function Label({ node }: ReactNodeViewProps) {
  return <span>{node.textContent}</span>;
}

it("renders through a portal and clears it on destroy", () => {
  const paragraph = manager.schema.node("paragraph", null, manager.schema.text("x"));
  const view = {} as EditorView;
  const container = document.createElement("div");
  document.body.append(container);

  let nodeView: NodeView | undefined;

  act(() => {
    nodeView = createReactNodeView(Label)(paragraph, view, () => 0, [], DecorationSet.empty);
  });

  if (!nodeView) {
    throw new Error("Node view was not created.");
  }

  container.append(nodeView.dom);
  expect(container.textContent).toBe("x");

  act(() => {
    nodeView?.destroy?.();
  });

  expect((nodeView.dom as HTMLElement).innerHTML).toBe("");
  container.remove();
});
