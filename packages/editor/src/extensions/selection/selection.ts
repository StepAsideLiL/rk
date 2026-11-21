import type { EditorState } from "prosemirror-state";
import { NodeSelection, Plugin, PluginKey } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { Decoration, DecorationSet } from "prosemirror-view";

import { defineExtension } from "../../core/types";
import { EXTENSION_NAMES } from "../shared/schema";

/** Plugin state flag: whether the editor view currently owns DOM focus. */
export const selectionFocusKey = new PluginKey<boolean>("rk-editor-selection-focus");

/** Class applied to the selection decoration painted while the editor is blurred. */
const INACTIVE_SELECTION_CLASS = "rk-selection-inactive";

/**
 * Default background for the fading selection.
 *
 * Consumers can override it with the `--rk-selection-inactive-bg` custom
 * property without touching the decoration itself.
 */
const INACTIVE_SELECTION_STYLE =
  "background-color: var(--rk-selection-inactive-bg, rgb(127 127 127 / 30%));";

/**
 * Keep the last selection visible, dimmed, after the editor loses focus.
 *
 * Browsers drop the painted DOM selection on blur even though ProseMirror
 * keeps `state.selection`. The plugin mirrors that selection with decorations
 * only while the view is blurred, so native selection and dragging stay
 * untouched while the editor is focused.
 */
export const Selection = defineExtension(() => ({
  name: EXTENSION_NAMES.selection,
  priority: 60,
  plugins: () => [createSelectionPlugin()],
}));

/** Create the plugin for tests and custom editor assemblies. */
export function createSelectionPlugin(): Plugin<boolean> {
  return new Plugin<boolean>({
    key: selectionFocusKey,
    state: {
      init: () => true,
      apply(transaction, focused) {
        const next = transaction.getMeta(selectionFocusKey);

        return typeof next === "boolean" ? next : focused;
      },
    },
    props: {
      decorations(state) {
        return selectionFocusKey.getState(state) ? null : inactiveSelectionDecorations(state);
      },
      handleDOMEvents: {
        focus(view) {
          setFocused(view, true);
          return false;
        },
        blur(view) {
          setFocused(view, false);
          return false;
        },
      },
    },
    view(view) {
      const onWindowBlur = () => setFocused(view, false);
      const onWindowFocus = () => setFocused(view, view.hasFocus());

      window.addEventListener("blur", onWindowBlur);
      window.addEventListener("focus", onWindowFocus);

      return {
        destroy() {
          window.removeEventListener("blur", onWindowBlur);
          window.removeEventListener("focus", onWindowFocus);
        },
      };
    },
  });
}

/** Mirror the current selection as dim decorations. */
function inactiveSelectionDecorations(state: EditorState): DecorationSet | null {
  const { selection } = state;

  if (selection.empty) {
    return null;
  }

  if (selection instanceof NodeSelection) {
    return DecorationSet.create(state.doc, [
      Decoration.node(selection.from, selection.to, {
        class: INACTIVE_SELECTION_CLASS,
        style: INACTIVE_SELECTION_STYLE,
      }),
    ]);
  }

  const decorations = selection.ranges
    .filter((range) => range.$from.pos !== range.$to.pos)
    .map((range) =>
      Decoration.inline(range.$from.pos, range.$to.pos, {
        class: INACTIVE_SELECTION_CLASS,
        style: INACTIVE_SELECTION_STYLE,
      }),
    );

  return decorations.length > 0 ? DecorationSet.create(state.doc, decorations) : null;
}

/** Dispatch a focus-change transaction only when the flag actually changes. */
function setFocused(view: EditorView, focused: boolean): void {
  if (selectionFocusKey.getState(view.state) !== focused) {
    view.dispatch(view.state.tr.setMeta(selectionFocusKey, focused));
  }
}
