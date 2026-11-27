import {
  createPopup,
  definePrimitive,
  popupBackdrop,
  popupClose,
  popupContent,
  popupState,
  popupTitle,
  popupTrigger,
  type ChangeDetails,
  type DismissAttemptDetails,
  type PopupContentProps,
} from "@ui-sdk/core";
import { dialogPreset } from "@ui-sdk/core/dialog";

type DialogOptions = {
  name?: string;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean, details: ChangeDetails<string>) => void;
  onOpenChangeComplete?: (open: boolean) => void;
  closeOnOutsidePress?: boolean;
  dismissible?: boolean;
  onDismissAttempt?: (details: DismissAttemptDetails) => void;
};

const dialog = definePrimitive({
  name: "dialog",
  options: {
    name: "string",
    open: "boolean",
    defaultOpen: "boolean",
    onOpenChange: "callback",
    onOpenChangeComplete: "callback",
    closeOnOutsidePress: "boolean",
    dismissible: "boolean",
    onDismissAttempt: "callback",
  },
  controlled: ["open"],
  state: (options: DialogOptions) => ({
    ...popupState(options),
    name: options.name ?? "",
  }),
  sync: (options) => ({
    ...(options.open === undefined ? {} : { open: options.open }),
    name: options.name ?? "",
  }),
  api: (context) =>
    createPopup(context, {
      preset: dialogPreset,
      rules: (core) => ({
        dismiss(reason, details) {
          if (reason === "outside-press" && context.options().closeOnOutsidePress === false) {
            context.options().onDismissAttempt?.({
              reason: "outside-press",
              event: details.event as MouseEvent | undefined,
            });
            return;
          }
          core.control.hide({ reason, event: details.event });
        },
      }),
    }),
  slots: (slot) => {
    const content = popupContent(slot);
    const contentAttrs = content.attrs;
    const contentState = content.state;
    const title = popupTitle(slot);

    return {
      trigger: popupTrigger(slot),
      backdrop: popupBackdrop(slot),
      close: popupClose(slot),
      header: slot({}),
      body: slot({}),
      footer: slot({}),
      title: {
        ...title,
        state: (state) => ({ name: state.name }),
      },
      content: slot<PopupContentProps & { ratio?: number }>({
        ...content,
        props: { ...content.props, ratio: "number" },
        attrs: (state, part) => {
          const attrs = contentAttrs?.(state, part) ?? {};
          return part.props.ratio === undefined
            ? attrs
            : { ...attrs, style: `--dialog-ratio:${part.props.ratio}` };
        },
        state: (state, part) => ({
          ...contentState?.(state, part),
          name: state.name,
        }),
      }),
    };
  },
  agent: { actions: ["setOpen"] },
});

export { dialog };
export type { DialogOptions };
