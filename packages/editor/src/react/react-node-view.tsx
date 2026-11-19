"use client";

import type { ComponentType } from "react";
import { createPortal } from "react-dom";
import { createRoot } from "react-dom/client";
import type { Node as PmNode } from "prosemirror-model";
import type { Decoration, EditorView, NodeView, NodeViewConstructor } from "prosemirror-view";

/** Props passed to components rendered by {@link createReactNodeView}. */
export interface ReactNodeViewProps {
  /** Latest ProseMirror node for this view. */
  readonly node: PmNode;

  /** The editor view the node belongs to. */
  readonly view: EditorView;

  /** Resolve the current document position of the node. */
  readonly getPos: () => number | undefined;

  /** Decorations that apply to this node. */
  readonly decorations: readonly Decoration[];
}

/**
 * Build a ProseMirror NodeView that renders a React component into the node's
 * DOM through a portal.
 *
 * A React root is created per node and unmounted in `destroy`, which is
 * relatively expensive. Prefer plain DOM NodeViews for simple nodes and reach
 * for this helper only when the node needs React state or existing components.
 */
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
