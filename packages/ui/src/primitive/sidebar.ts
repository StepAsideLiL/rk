import {
  bindDrag,
  createChange,
  definePrimitive,
  dragThreshold,
  type ChangeDetails,
} from "@ui-sdk/core";

type SidebarWidthChangeReason = "drag" | "step-key" | "collapse" | "expand" | "imperative";
type SidebarCollapsedChangeReason = "collapse" | "expand" | "imperative";

type SidebarOptions = {
  width?: number;
  defaultWidth?: number;
  onWidthChange?: (width: number, details: ChangeDetails<SidebarWidthChangeReason>) => void;
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (
    collapsed: boolean,
    details: ChangeDetails<SidebarCollapsedChangeReason>,
  ) => void;
  minWidth?: number;
  maxWidth?: number;
  step?: number;
};

const defaultMinWidth = 160;
const defaultMaxWidth = 480;

function clamp(width: number, options: SidebarOptions) {
  return Math.min(
    options.maxWidth ?? defaultMaxWidth,
    Math.max(options.minWidth ?? defaultMinWidth, width),
  );
}

const sidebar = definePrimitive({
  name: "sidebar",
  options: {
    width: "number",
    defaultWidth: "number",
    onWidthChange: "callback",
    collapsed: "boolean",
    defaultCollapsed: "boolean",
    onCollapsedChange: "callback",
    minWidth: "number",
    maxWidth: "number",
    step: "number",
  },
  controlled: ["width", "collapsed"],
  state: (options: SidebarOptions) => ({
    width: clamp(options.width ?? options.defaultWidth ?? 280, options),
    collapsed: options.collapsed ?? options.defaultCollapsed ?? false,
    minWidth: options.minWidth ?? defaultMinWidth,
    maxWidth: options.maxWidth ?? defaultMaxWidth,
    resizing: false,
  }),
  sync: (options) => ({
    ...(options.width !== undefined && { width: clamp(options.width, options) }),
    ...(options.collapsed !== undefined && { collapsed: options.collapsed }),
    minWidth: options.minWidth ?? defaultMinWidth,
    maxWidth: options.maxWidth ?? defaultMaxWidth,
  }),
  api: (context) => {
    const change = createChange(context);
    const options = () => context.options();
    let stopDrag: (() => void) | undefined;

    context.onDestroy(() => stopDrag?.());

    return {
      setWidth(width: number) {
        return change("width", clamp(width, options()), { reason: "imperative" });
      },
      collapse(event?: MouseEvent | KeyboardEvent) {
        return change("collapsed", true, { reason: "collapse", event });
      },
      expand(event?: Event) {
        return change("collapsed", false, { reason: "expand", event });
      },
      toggle(event?: MouseEvent | KeyboardEvent) {
        const collapsed = context.store.get().collapsed;
        return change("collapsed", !collapsed, {
          reason: collapsed ? "expand" : "collapse",
          event,
        });
      },
      pointerdown(event: PointerEvent, el: HTMLElement) {
        if (event.button !== 0) {
          return;
        }

        if (context.store.get().collapsed) {
          change("collapsed", false, { reason: "expand", event });
        }

        const startWidth = context.store.get().width;
        const startX = event.clientX;
        stopDrag?.();
        context.store.set({ resizing: true });

        stopDrag = bindDrag(el, event, {
          threshold: dragThreshold,
          cancelOnEscape: true,
          onMove: ({ x, event: moveEvent }) => {
            change("width", clamp(startWidth + x - startX, options()), {
              reason: "drag",
              event: moveEvent,
            });
          },
          onEnd: (_event, canceled) => {
            stopDrag = undefined;
            context.store.set({ resizing: false });
            if (canceled) {
              change("width", startWidth, { reason: "imperative" });
            }
          },
        });
      },
      keydown(event: KeyboardEvent) {
        const state = context.store.get();
        const settings = options();

        if (state.collapsed) {
          if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") {
            return false;
          }
          event.preventDefault();
          return change("collapsed", false, { reason: "expand", event });
        }

        const step = (settings.step ?? 16) * (event.shiftKey ? 4 : 1);
        let width: number;

        switch (event.key) {
          case "ArrowLeft":
            width = state.width - step;
            break;
          case "ArrowRight":
            width = state.width + step;
            break;
          case "Home":
            width = settings.minWidth ?? defaultMinWidth;
            break;
          case "End":
            width = settings.maxWidth ?? defaultMaxWidth;
            break;
          default:
            return false;
        }

        event.preventDefault();
        return change("width", clamp(width, settings), { reason: "step-key", event });
      },
    };
  },
  slots: (slot) => ({
    root: slot({
      state: (state) => ({
        width: state.width,
        collapsed: state.collapsed,
        resizing: state.resizing,
      }),
      attrs: (state) => ({
        "data-collapsed": state.collapsed ? "" : undefined,
        "data-resizing": state.resizing ? "" : undefined,
        style: `--sidebar-width:${state.collapsed ? 0 : state.width}px`,
      }),
    }),
    toggle: slot({
      role: "button",
      focus: "native",
      state: (state) => ({ collapsed: state.collapsed }),
      attrs: (state, part) => ({
        type: "button",
        "aria-expanded": String(!state.collapsed),
        "aria-controls": `${part.id}-container`,
        "data-collapsed": state.collapsed ? "" : undefined,
      }),
      press: ({ api }, event) => api.toggle(event as MouseEvent | KeyboardEvent | undefined),
    }),
    container: slot({
      state: (state) => ({
        width: state.width,
        collapsed: state.collapsed,
        resizing: state.resizing,
      }),
      attrs: (state, part) => ({
        id: `${part.id}-container`,
        inert: state.collapsed ? "" : undefined,
        "data-collapsed": state.collapsed ? "" : undefined,
        "data-resizing": state.resizing ? "" : undefined,
        style: `--sidebar-width:${state.collapsed ? 0 : state.width}px;${
          state.resizing ? "transition:none" : ""
        }`,
      }),
    }),
    handle: slot({
      role: "separator",
      state: (state) => ({
        width: state.width,
        collapsed: state.collapsed,
        minWidth: state.minWidth,
        maxWidth: state.maxWidth,
      }),
      attrs: (state, part) => ({
        tabindex: "0",
        "aria-orientation": "vertical",
        "aria-valuemin": String(state.minWidth),
        "aria-valuemax": String(state.maxWidth),
        "aria-valuenow": String(state.width),
        "aria-controls": `${part.id}-container`,
        "data-collapsed": state.collapsed ? "" : undefined,
      }),
      on: {
        pointerdown: (event, { api, el }) => {
          if (el) {
            api.pointerdown(event as PointerEvent, el);
          }
        },
        keydown: (event, { api }) => {
          api.keydown(event);
        },
      },
    }),
  }),
  agent: { actions: ["setWidth", "toggle", "collapse", "expand"] },
});

export { sidebar };
export type { SidebarOptions };
