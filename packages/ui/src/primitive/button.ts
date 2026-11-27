import {
  createPopup,
  definePrimitive,
  popupContent,
  popupState,
  popupTrigger,
  type ChangeDetails,
  type Side,
} from "@ui-sdk/core";
import { tooltipPreset } from "@ui-sdk/core/tooltip";

type ButtonOptions = {
  tooltip?: string;
  tooltipSide?: Side;
  type?: "button" | "submit" | "reset";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: ChangeDetails<string>) => void;
  onOpenChangeComplete?: (open: boolean) => void;
};

const button = definePrimitive({
  name: "button",
  options: {
    tooltip: "string",
    tooltipSide: "string",
    type: "string",
    open: "boolean",
    defaultOpen: "boolean",
    onOpenChange: "callback",
    onOpenChangeComplete: "callback",
  },
  controlled: ["open"],
  state: (options: ButtonOptions) => ({
    ...popupState(options),
    tooltip: options.tooltip ?? "",
    tooltipSide: options.tooltipSide ?? "top",
    type: options.type ?? "button",
  }),
  sync: (options) => ({
    ...(options.open === undefined ? {} : { open: options.open }),
    tooltip: options.tooltip ?? "",
    tooltipSide: options.tooltipSide ?? "top",
    type: options.type ?? "button",
  }),
  api: (context) =>
    createPopup(context, {
      preset: tooltipPreset,
      slot: "content",
      trigger: "root",
    }),
  slots: (slot) => {
    const trigger = popupTrigger(slot);
    const content = popupContent(slot);
    const triggerState = trigger.state;
    const triggerAttrs = trigger.attrs;
    const contentState = content.state;
    const contentPresent = content.present;

    return {
      root: {
        ...trigger,
        state: (state, part) => ({
          ...triggerState?.(state, part),
          type: state.type,
          tooltip: state.tooltip,
        }),
        attrs: (state, part) => {
          const attrs = triggerAttrs?.(state, part) ?? {};
          if (!state.tooltip) {
            delete attrs["aria-describedby"];
            delete attrs["aria-labelledby"];
          }
          return { ...attrs, type: state.type };
        },
      },
      content: {
        ...content,
        present: (state, part) =>
          !!state.tooltip && (contentPresent ? contentPresent(state, part) : true),
        state: (state, part) => ({
          ...contentState?.(state, part),
          side: state.tooltipSide,
          tooltip: state.tooltip,
        }),
      },
    };
  },
  agent: { actions: ["setOpen"] },
});

export { button };
export type { ButtonOptions };
