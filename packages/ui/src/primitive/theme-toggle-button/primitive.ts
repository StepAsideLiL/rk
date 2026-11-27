import { createChange, definePrimitive, type ChangeDetails } from "@ui-sdk/core";

type ThemeToggleButtonOptions = {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean, details: ChangeDetails<"press">) => void;
};

const themeToggleButton = definePrimitive({
  name: "theme-toggle-button",
  options: {
    pressed: "boolean",
    defaultPressed: "boolean",
    onPressedChange: "callback",
  },
  controlled: ["pressed"],
  state: (options: ThemeToggleButtonOptions) => ({
    pressed: options.defaultPressed ?? false,
  }),
  sync: (options) => (options.pressed === undefined ? {} : { pressed: options.pressed }),
  api: (context) => {
    const change = createChange(context);
    return {
      toggle: (event?: Event) =>
        change("pressed", !context.store.get().pressed, {
          reason: "press",
          event,
        }),
    };
  },
  slots: (slot) => ({
    root: slot({
      attrs: (state) => ({
        type: "button",
        "aria-pressed": String(state.pressed),
      }),
      press: ({ api }, event) => api.toggle(event),
    }),
  }),
  agent: { actions: ["toggle"] },
});

export { themeToggleButton };
export type { ThemeToggleButtonOptions };
