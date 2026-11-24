"use client";

import type { ComponentType } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Node as PmNode } from "prosemirror-model";
import type { Decoration, EditorView, NodeView, NodeViewConstructor } from "prosemirror-view";

export interface ReactNodeViewProps {
  readonly node: PmNode;

  readonly view: EditorView;

  readonly getPos: () => number | undefined;

  readonly decorations: readonly Decoration[];
}

export function createReactNodeView(
  Component: ComponentType<ReactNodeViewProps>,
): NodeViewConstructor {
  return (node, view, getPos, decorations) => {
    const dom = document.createElement("div");
    dom.dataset.rkReactNodeView = "";
    const host = document.createElement("div");
    const root = createRoot(host);

    let currentNode = node;
    let currentDecorations = decorations;

    const render = (): void => {
      root.render(
        createPortal(
          <Component
            node={currentNode}
            view={view}
            getPos={getPos}
            decorations={currentDecorations}
          />,
          dom,
        ),
      );
    };

    render();

    const nodeView: NodeView = {
      dom,
      update(updatedNode, updatedDecorations) {
        if (updatedNode.type !== currentNode.type) {
          return false;
        }

        currentNode = updatedNode;
        currentDecorations = updatedDecorations;
        render();

        return true;
      },
      destroy() {
        root.unmount();
      },
    };

    return nodeView;
  };
}
